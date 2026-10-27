require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const { createPhotoCollage } = require('./services/imageProcessor');
const { sendPhotoEmail } = require('./services/mailer');
const { uploadToGoogleDrive } = require('./services/driveUploader');
const { checkDslrStatus, captureDslrPhoto } = require('./services/dslrCamera');

const app = express();
const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Enable CORS & parse large JSON payloads (for base64 camera photos)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve public kiosk app & storage files with cache control to prevent stale tablet browser caching
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
}));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

/**
 * Helper to get Server Local Network IP addresses
 */
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

/**
 * API: Render Photo Collage & Automatically Upload to Google Drive
 */
app.post('/api/session/render', async (req, res) => {
  try {
    const { photos, layout, frameColor, frameTheme, filter, brandingText } = req.body;

    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ error: 'No photos provided' });
    }

    console.log(`📸 [Render Request] Layout: ${layout}, Filter: ${filter}, FrameColor: ${frameColor}, FrameTheme: ${frameTheme}`);

    const result = await createPhotoCollage(photos, {
      layout,
      frameColor,
      frameTheme,
      filter,
      brandingText
    });

    console.log(`☁️ [Drive Uploading...] File: ${result.fileName}`);
    const driveResult = await uploadToGoogleDrive(result.filePath, result.fileName);

    res.json({
      success: true,
      imageUrl: result.relativeUrl,
      fileName: result.fileName,
      filePath: result.filePath,
      drive: driveResult
    });
  } catch (err) {
    console.error('❌ [Render Error]:', err);
    res.status(500).json({ error: 'Failed to process photos', details: err.message });
  }
});

/**
 * API: Submit & Send Email
 */
app.post('/api/session/submit', async (req, res) => {
  try {
    const { email, fileName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    if (!fileName) {
      return res.status(400).json({ error: 'Photo file name is required' });
    }

    const photoPath = path.join(__dirname, 'storage/rendered', path.basename(fileName));

    console.log(`📧 [Submit Request] Sending ${fileName} to ${email}`);

    const mailResult = await sendPhotoEmail(email, photoPath);

    if (mailResult.success) {
      res.json({ success: true, message: 'Email sent successfully!' });
    } else {
      res.json({
        success: false,
        warning: 'Render saved, but email delivery failed (check SMTP settings in .env)',
        error: mailResult.error
      });
    }
  } catch (err) {
    console.error('❌ [Submit Error]:', err);
    res.status(500).json({ error: 'Failed to process submission', details: err.message });
  }
});

/**
 * API: Health & Server Info
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    localIPs: getLocalIPs(),
    httpPort: HTTP_PORT,
    httpsPort: HTTPS_PORT
  });
});

/**
 * API: Check Canon DSLR Hardware Connection Status
 */
app.get('/api/camera/status', async (req, res) => {
  try {
    const status = await checkDslrStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

/**
 * API: Trigger Hardware Shutter on Canon DSLR Camera via USB
 */
app.post('/api/camera/capture-dslr', async (req, res) => {
  try {
    const photoResult = await captureDslrPhoto();
    res.json(photoResult);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Start HTTP Server
http.createServer(app).listen(HTTP_PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  console.log('====================================================');
  console.log(`🚀 FREMIO PHOTOBOOTH (HTTP): http://localhost:${HTTP_PORT}`);
  localIPs.forEach(ip => {
    console.log(`📱 Tablet HTTP:  http://${ip}:${HTTP_PORT}`);
  });
  console.log('====================================================');
});

// 2. Start HTTPS Server (Secure Context for Camera on Tablet)
const keyPath = path.join(__dirname, 'ssl/server.key');
const certPath = path.join(__dirname, 'ssl/server.crt');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  https.createServer(sslOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
    const localIPs = getLocalIPs();
    console.log(`🔒 FREMIO PHOTOBOOTH (HTTPS Secure): https://localhost:${HTTPS_PORT}`);
    localIPs.forEach(ip => {
      console.log(`🔒 Tablet HTTPS: https://${ip}:${HTTPS_PORT}`);
    });
    console.log('====================================================');
  });
}
