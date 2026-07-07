import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Disable server technology signature header (Express fingerprinting)
app.disable('x-powered-by');

// Lightweight self-contained in-memory rate limiter to mitigate brute-force and DoS
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 300; // Allow 300 requests per IP per window
const ipRequestRegistry = new Map();

// Periodically purge ipRequestRegistry to prevent memory bloating
setInterval(() => {
  ipRequestRegistry.clear();
}, RATE_LIMIT_WINDOW_MS);

const rateLimiter = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const currentRequests = ipRequestRegistry.get(clientIp) || 0;
  
  if (currentRequests >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>429 — Request Limit Exceeded</title>
        <style>
          body { background: #0a0a0a; color: #FF2D6B; font-family: monospace; padding: 40px; text-align: center; }
          div { border: 4px solid #FF2D6B; display: inline-block; padding: 24px; background: #111; }
        </style>
      </head>
      <body>
        <div>
          <h2>⚠️ CORE NETWORK THROTTLED</h2>
          <p>Too many requests from this node. Core security policy cooling period active.</p>
        </div>
      </body>
      </html>
    `);
  }
  
  ipRequestRegistry.set(clientIp, currentRequests + 1);
  res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - (currentRequests + 1)));
  next();
};

app.use(rateLimiter);

// Set up security headers that are robust and aligned with production configs
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  
  // Custom Content Security Policy permitting local testing and framing via AI Studio
  res.setHeader("Content-Security-Policy", "default-src 'self'; media-src 'self' data: blob: https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://api.github.com; frame-ancestors *; upgrade-insecure-requests;");
  
  next();
});

// Serve static files from root directory
app.use(express.static(__dirname));

// Specifically serve index.html for root path or index.html
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// For routing fallback
app.get('*', (req, res) => {
  res.status(404).send('404 Not Found');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
