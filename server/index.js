require('./config/env');
const { env } = require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { getPool, ensureSchema } = require('./config/db');
const { initializeDatabase } = require('./utils/seedDatabase');

const app = express();

// Hostinger/nginx sit in front of Node; required for express-rate-limit client IP detection
app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 10,
  message: 'Too many auth attempts, please try again after 1 hour'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/send-otp', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/register/send-otp', authLimiter);
app.use('/api/auth/register/resend-otp', authLimiter);

function getAllowedOrigins() {
  return [
    env('CLIENT_URL'),
    ...(env('CORS_ORIGINS') || '').split(',').map((s) => s.trim()).filter(Boolean),
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173'
  ].filter(Boolean);
}

function isOriginAllowed(origin) {
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  try {
    const { hostname } = new URL(origin);

    for (const allowed of allowedOrigins) {
      try {
        if (new URL(allowed).hostname === hostname) return true;
      } catch {
        // ignore invalid CLIENT_URL values
      }
    }

    // Hostinger temporary preview URLs (e.g. *.hostingersite.com)
    if (hostname.endsWith('.hostingersite.com')) return true;
  } catch {
    // ignore invalid origin URLs
  }

  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy denied access from origin: ${origin}`));
    }
  },
  credentials: true
}));

// Razorpay webhook needs raw body for HMAC verification (must run before express.json)
const { webhookHandler } = require('./routes/payments');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), webhookHandler);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

function getDeployVersion() {
  try {
    const stamp = path.join(__dirname, 'DEPLOY_VERSION');
    if (fs.existsSync(stamp)) return fs.readFileSync(stamp, 'utf8').trim();
  } catch {
    // ignore
  }
  return process.env.NODE_ENV === 'production' ? 'unknown' : 'dev';
}

async function healthHandler(req, res) {
  try {
    await getPool().query('SELECT 1');
    res.json({
      status: 'ok',
      db: 'mysql',
      time: new Date(),
      deploy: getDeployVersion()
    });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'mysql', message: err.message });
  }
}

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

const publicDir = path.join(__dirname, 'public');
const indexHtml = path.join(publicDir, 'index.html');
const hasFrontend = fs.existsSync(indexHtml);

if (hasFrontend) {
  app.use(express.static(publicDir));
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(indexHtml);
  });
} else {
  console.warn(`Frontend build missing at ${indexHtml} — run "npm run build" from project root`);
  app.get(/^\/(?!api).*/, (req, res) => {
    res.status(503).json({
      success: false,
      message: 'Frontend not deployed. Run "npm run build" and upload server/public to the server.'
    });
  });
}

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function connectDatabase(retries = 5, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await getPool().query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.warn(`MySQL not ready (attempt ${attempt}/${retries}): ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function start() {
  try {
    const embedded = process.env.EMBEDDED_MYSQL === '1';
    const dbHost = env('DB_HOST') || 'localhost';
    const socket = env('DB_SOCKET') || '/var/lib/mysql/mysql.sock';
    const isLocalHost = dbHost === 'localhost' || dbHost === '127.0.0.1';
    const useSocket = !embedded && !!env('DB_SOCKET') && (isLocalHost && process.platform !== 'win32' && fs.existsSync(socket));

    console.log('DB config:', {
      mode: embedded ? 'embedded' : useSocket ? 'socket' : 'tcp',
      host: embedded ? `${dbHost}:${env('DB_PORT') || 3306}` : useSocket ? (env('DB_SOCKET') || socket) : dbHost,
      user: env('DB_USER') ? `${env('DB_USER').slice(0, 8)}...` : '(NOT SET)',
      database: env('DB_NAME') || '(NOT SET)',
      password: env('DB_PASSWORD') ? '(set)' : '(NOT SET)'
    });

    await connectDatabase();
    console.log('MySQL connected');
    await ensureSchema();

    const init = await initializeDatabase();
    if (init.products.seeded) console.log(`Initial seed: ${init.products.count} products`);
    if (init.admin.created) console.log(`Initial seed: admin ${init.admin.email}`);

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (deploy: ${getDeployVersion()})`);
    });
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

start();
