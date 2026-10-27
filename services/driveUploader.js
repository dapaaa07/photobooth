const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const QRCode = require('qrcode');

/**
 * Initializes Google Drive API client using Service Account credentials
 */
function getDriveClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, '../google-credentials.json');
  
  if (fs.existsSync(keyPath)) {
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    });
    return google.drive({ version: 'v3', auth });
  }

  // Fallback to inline environment variables if provided
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_CLIENT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    );
    return google.drive({ version: 'v3', auth });
  }

  return null;
}

/**
 * Uploads local photo file to Google Drive folder
 * @param {string} localFilePath Absolute path of rendered photo PNG
 * @param {string} fileName Target filename on Google Drive
 */
async function uploadToGoogleDrive(localFilePath, fileName) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const folderUrl = process.env.GOOGLE_DRIVE_FOLDER_URL || (folderId ? `https://drive.google.com/drive/folders/${folderId}` : null);
  const webAppUrl = process.env.GOOGLE_DRIVE_WEBAPP_URL;

  // 1. If Apps Script WebApp URL is configured, upload via WebApp (Bypasses all personal Gmail Service Account quota errors!)
  if (webAppUrl && webAppUrl.startsWith('http')) {
    try {
      console.log('☁️ Uploading photo to Google Drive via Apps Script WebApp...');
      const fileBuffer = fs.readFileSync(localFilePath);
      const base64Content = fileBuffer.toString('base64');

      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          fileName,
          mimeType: 'image/png',
          base64: base64Content,
          folderId
        }),
        redirect: 'follow'
      });

      const resData = await response.json();
      console.log('✅ Foto berhasil diupload via Google Drive WebApp!');

      // QR points directly at the uploaded photo file; folder only as fallback
      const targetScanUrl = resData.url
        || resData.fileUrl
        || folderUrl
        || `http://localhost:3000/storage/rendered/${fileName}`;
      const qrCodeDataUrl = await QRCode.toDataURL(targetScanUrl, { margin: 1, width: 260 });

      return {
        uploaded: true,
        driveWebViewLink: resData.url || resData.fileUrl,
        folderUrl: folderUrl || targetScanUrl,
        qrCodeDataUrl,
        message: 'Foto berhasil terupload otomatis ke Google Drive!'
      };
    } catch (webAppErr) {
      console.error('❌ Gagal upload via Apps Script WebApp:', webAppErr.message);
    }
  }

  // 2. Direct Service Account Drive API v3
  const drive = getDriveClient();

  if (!drive || !folderId || folderId === 'your_folder_id_here') {
    console.warn('⚠️ Google Drive credentials/Folder ID not configured in .env. Photo saved locally in storage/rendered.');
    
    const fallbackUrl = folderUrl || `http://localhost:3000/storage/rendered/${fileName}`;
    const qrCodeDataUrl = await QRCode.toDataURL(fallbackUrl, { margin: 1, width: 260 });

    return {
      uploaded: false,
      driveFileId: null,
      driveWebViewLink: null,
      folderUrl: fallbackUrl,
      qrCodeDataUrl,
      message: 'Foto tersimpan secara lokal (Belum terhubung Google Drive API)'
    };
  }

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    const media = {
      mimeType: 'image/png',
      body: fs.createReadStream(localFilePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      supportsAllDrives: true,
      supportsTeamDrives: true,
      fields: 'id, webViewLink, webContentLink'
    });

    console.log(`✅ Foto berhasil diupload ke Google Drive! File ID: ${response.data.id}`);

    // QR points directly at the uploaded photo's Drive viewer link
    const targetScanUrl = response.data.webViewLink
      || folderUrl
      || `http://localhost:3000/storage/rendered/${fileName}`;
    const qrCodeDataUrl = await QRCode.toDataURL(targetScanUrl, { margin: 1, width: 260 });

    return {
      uploaded: true,
      driveFileId: response.data.id,
      driveWebViewLink: response.data.webViewLink,
      folderUrl: folderUrl || targetScanUrl,
      qrCodeDataUrl,
      message: 'Foto berhasil terupload otomatis ke Google Drive!'
    };

  } catch (err) {
    console.error('❌ Gagal upload ke Google Drive API:', err.message);
    
    const fallbackUrl = folderUrl || `http://localhost:3000/storage/rendered/${fileName}`;
    const qrCodeDataUrl = await QRCode.toDataURL(fallbackUrl, { margin: 1, width: 260 });

    return {
      uploaded: false,
      error: err.message,
      folderUrl: fallbackUrl,
      qrCodeDataUrl,
      message: 'Gagal upload ke Drive, foto tersimpan di penyimpanan lokal.'
    };
  }
}

module.exports = {
  uploadToGoogleDrive
};
