require('./config/env');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { getPool, ensureSchema } = require('./config/db');

const app = express();

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

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy denied access from origin: ${origin}`));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));

app.get('/health', async (req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ status: 'ok', db: 'mysql', time: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'mysql', message: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function start() {
  try {
    const { env } = require('./config/env');
    const fs = require('fs');
    const socket = env('DB_SOCKET') || '/var/lib/mysql/mysql.sock';
    const useSocket = env('DB_HOST') === 'localhost' && fs.existsSync(socket);

    console.log('DB config:', {
      mode: useSocket || env('DB_SOCKET') ? 'socket' : 'tcp',
      host: useSocket ? socket : (env('DB_HOST') || '127.0.0.1'),
      user: env('DB_USER') ? `${env('DB_USER').slice(0, 8)}...` : '(NOT SET)',
      database: env('DB_NAME') || '(NOT SET)',
      password: env('DB_PASSWORD') ? '(set)' : '(NOT SET)'
    });

    await getPool().query('SELECT 1');
    console.log('MySQL connected');
    await ensureSchema();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    process.exit(1);
  }
}

start();
