# VPN SaaS - Automated 3x-ui VPN Service

A production-ready VPN SaaS application with automated 3x-ui VPN configuration, Firebase authentication, and automated slip verification.

## 🎯 Features

- **Automated VPN Setup**: Connects to 3x-ui panels to create VLESS/Trojan/Shadowsocks configs.
- **Firebase Auth**: Secure user authentication and management.
- **Slip Verification**: Automated payment verification via EasySlip API.
- **Admin Dashboard**: Manage servers, users, and transactions.
- **Production Ready**: Optimized for VPS deployment with PM2 and Nginx.

---

## 🔧 VPS Installation (Ubuntu)

### 1. Prerequisites

Ensure you have Node.js (v18+), npm, and Nginx installed.

```bash
# Install Node.js (v20)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd boostifyshop
npm install
```

### 3. Environment Configuration

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
nano .env
```

| Variable | Description |
| --- | --- |
| `PORT` | The port the app will run on (default: 3000) |
| `NODE_ENV` | Set to `production` for VPS deployment |
| `FIREBASE_*` | Your Firebase project credentials |
| `EASY_SLIP_API_KEY` | API key from EasySlip for slip verification |
| `THREE_X_UI_*` | (Optional) Default 3x-ui server credentials |

### 4. Build for Production

```bash
npm run build
```

---

## 🚀 Running the App

### Using PM2 (Recommended)

PM2 will keep your app running in the background and restart it if it crashes.

```bash
# Start the app
npm run start:pm2

# Save the process list to restart on boot
pm2 save
sudo pm2 startup
```

---

## 🌐 Nginx Configuration

To serve your app on port 80/443, use Nginx as a reverse proxy.

1. Create a new Nginx config:
   `sudo nano /etc/nginx/sites-available/boostifyshop`

2. Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com; # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

3. Enable the config and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/boostifyshop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🎁 Bonus: Docker Support

If you prefer using Docker, a `docker-compose.yml` is provided.

```bash
docker-compose up -d
```

---

## 🛠️ Development

```bash
npm run dev
```

---

## 🛡️ Security

- **Rate Limiting**: API endpoints are protected against brute-force.
- **Helmet**: Secure HTTP headers.
- **CORS**: Configured for production.
