const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

/**
 * Creates Nodemailer Transporter using environment SMTP settings
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('⚠️ [SMTP Warning] SMTP_USER or SMTP_PASS not set in .env file.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: user || '',
      pass: pass || ''
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Send photobooth result to recipient email
 * @param {string} recipientEmail Email address of user
 * @param {string} photoFilePath Absolute path to composite PNG image
 * @param {Object} metadata Session details (layout, timestamp)
 */
async function sendPhotoEmail(recipientEmail, photoFilePath, metadata = {}) {
  const transporter = createTransporter();
  const fromEmail = process.env.EMAIL_FROM || 'Fremio Photobooth <noreply@photobooth.local>';

  const fileName = path.basename(photoFilePath);
  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); border: 1px solid #334155; }
      .header { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 32px 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
      .header p { margin: 8px 0 0 0; color: #e0e7ff; font-size: 14px; }
      .content { padding: 32px 24px; text-align: center; }
      .photo-card { background: #0f172a; padding: 16px; border-radius: 12px; display: inline-block; margin: 16px 0; border: 1px solid #334155; }
      .photo-card img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4); }
      .footer { background: #0f172a; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
      .badge { display: inline-block; background: #3b82f6; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 12px; margin-top: 12px; text-transform: uppercase; letter-spacing: 1px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>FREMIO PHOTOBOOTH</h1>
        <p>Kenangan foto Anda sudah siap!</p>
      </div>
      <div class="content">
        <h2>Hai! Terima kasih sudah berfoto! 📸</h2>
        <p style="color: #94a3b8; line-height: 1.6;">Foto hasil sesi photobooth Anda pada <strong>${dateStr}</strong> terlampir dalam email ini dalam kualitas tinggi (High-Res).</p>
        
        <div class="photo-card">
          <img src="cid:photoboothResult" alt="Hasil Foto Fremio Photobooth" />
        </div>

        <div>
          <span class="badge">Format Digital High-Res</span>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Fremio Photobooth System. Powered by Laptop Server Kiosk.</p>
      </div>
    </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: fromEmail,
    to: recipientEmail,
    subject: `📸 Foto Fremio Photobooth Anda (${dateStr})`,
    html: htmlContent,
    attachments: [
      {
        filename: fileName,
        path: photoFilePath,
        cid: 'photoboothResult' // Inline CID image preview
      },
      {
        filename: `Fremio_Photobooth_${fileName}`,
        path: photoFilePath // Downloadable attachment
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email Sent] Successfully delivered to ${recipientEmail}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [Email Error] Failed to send email to ${recipientEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendPhotoEmail
};
