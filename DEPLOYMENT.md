# Label Nine — Hostinger Deployment Guide

## Prerequisites
- Hostinger VPS (Ubuntu 22.04+) or Business Hosting with Node.js support
- Domain pointed to your server
- SSH access to your server

---

## 1. Prepare the Build

On your local machine:

```bash
# Build the React frontend
cd client
npm run build
# This creates client/dist/ — the static files to serve
```

---

## 2. Upload Files to Server

Using FTP (Hostinger File Manager) or SSH:

```bash
# Upload via SCP (replace with your server IP)
scp -r . user@YOUR_SERVER_IP:/home/labelnine/
```

Or use Hostinger's Git deployment via hPanel.

---

## 3. Install Dependencies on Server

```bash
ssh user@YOUR_SERVER_IP
cd /home/labelnine/server
npm install --production
```

---

## 4. Configure Environment Variables

```bash
# Copy and edit the .env file
cp server/.env.example server/.env
nano server/.env
```

Fill in all values — especially:
- `MONGO_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — Strong random string (use: `openssl rand -base64 64`)
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` — From Razorpay Dashboard
- `SMTP_USER` + `SMTP_PASS` — Gmail App Password
- `CLIENT_URL` — Your live domain e.g. `https://labelnine.in`
- `NODE_ENV=production`

---

## 5. Install PM2 and Start Server

```bash
npm install -g pm2
cd /home/labelnine
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow printed command to auto-start on reboot
```

---

## 6. Configure Nginx (Reverse Proxy + Static Files)

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/labelnine
```

Paste the following (replace `labelnine.in` with your domain):

```nginx
server {
    listen 80;
    server_name labelnine.in www.labelnine.in;

    # Serve React static files
    root /home/labelnine/client/dist;
    index index.html;

    # API proxy to Node.js
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # SPA fallback — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/labelnine /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 7. Enable HTTPS (Free SSL via Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d labelnine.in -d www.labelnine.in
```

---

## 8. Seed the Database

After server is running, run once to create admin user and 5 products:

```bash
cd /home/labelnine/server
node seed.js
```

Admin credentials are taken from `.env`: `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

---

## 9. Update Razorpay Callback URL

In Razorpay Dashboard → Settings → Webhooks:
- URL: `https://labelnine.in/api/payments/webhook`
- Events: `payment.captured`

---

## 10. Vite Build Config for Production

In `client/vite.config.js`, the proxy only applies in dev. In production, Nginx handles `/api` routing — no changes needed.

Make sure `client/.env.production` has the Razorpay public key:

```env
VITE_RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXXXX
```

And update `client/src/pages/Checkout.jsx` line that loads Razorpay key to use:
```js
key: import.meta.env.VITE_RAZORPAY_KEY_ID,
```

---

## Quick Reference

| Command | Purpose |
|---|---|
| `pm2 status` | Check server status |
| `pm2 logs labelnine-server` | View server logs |
| `pm2 restart labelnine-server` | Restart after update |
| `node seed.js` | Seed DB (run once) |
| `npm run build` (in client/) | Rebuild frontend |
