const fs = require('fs');
const path = require('path');
const os = require('os');
const { google } = require('googleapis');
const QRCode = require('qrcode');

/**
 * Alamat LAN kiosk untuk QR fallback (foto lokal). localhost hanya benar
 * kalau browser berjalan DI kiosk itu sendiri; QR dipindai dari HP, jadi
 * harus memakai IP LAN. Urutan: env PB_PUBLIC_URL, lalu IP LAN pertama.
 */
function localBaseUrl() {
  if (process.env.PB_PUBLIC_URL) {
    return process.env.PB_PUBLIC_URL.replace(/\/+$/, '');
  }
  const port = process.env.PORT || 3000;
  const ifaces = os.networkInterfaces();
  for (const devName of Object.keys(ifaces)) {
    for (const alias of ifaces[devName] || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return `http://${alias.address}:${port}`;
      }
    }
  }
  return `http://localhost:${port}`;
}

/**
 * Initializes Google Drive API client using Service Account credentials
 */
function getDriveClient() {
  const envPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, '../google-credentials.json');
  // Jalur relatif di .env diselesaikan terhadap folder proyek, bukan CWD
  // (mengetik ./dapa-drive.json di .env tetap benar walau server dijalankan
  // dari luar folder).
  const keyPath = path.isAbsolute(envPath) ? envPath : path.join(__dirname, '..', envPath);

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

      // Diagnosa: kalau respons bukan JSON (halaman login Google / HTML),
      // tampilkan petunjuk penyebab paling umum di laptop lain.
      const rawBody = await response.text();
      let resData;
      try {
        resData = JSON.parse(rawBody);
      } catch (parseErr) {
        console.error('❌ WebApp merespons non-JSON (HTTP ' + response.status +
          '). Kemungkinan deployment "Execute as" bukan Anyone atau akses butuh login Google.');
        throw parseErr;
      }
      if (!resData.url && !resData.fileUrl) {
        // WebApp merespons JSON tapi isinya error/tautan folder saja:
        // file TIDAK terbukti terupload -> jangan klaim sukses.
        console.warn('⚠️ WebApp tanpa url file (berarti gagal atau hanya tautan folder):', rawBody.slice(0, 200));
        throw new Error('WebApp tidak mengembalikan tautan file (' +
          (resData.error || 'field url/fileUrl kosong') + ')');
      }
      console.log('✅ Foto berhasil diupload via Google Drive WebApp!');

      // QR points directly at the uploaded photo file; folder only as fallback
      const targetScanUrl = resData.url
        || resData.fileUrl
        || folderUrl
        || `${localBaseUrl()}/storage/rendered/${fileName}`;
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
      console.error('   Coba cek cepat di laptop ini:');
      console.error('   1) URL WebApp benar & deployment "Execute as: Anyone","Who has access: Anyone".');
      console.error('   2) Akun Google yang deploy aktif + kuota Apps Script belum habis.');
      console.error('   3) Laptop punya akses internet ke script.google.com (buka manual /exec di browser).');
    }
  }

  // 2. Direct Service Account Drive API v3
  const drive = getDriveClient();

  if (!drive || !folderId || folderId === 'your_folder_id_here') {
    console.warn('⚠️ Google Drive credentials/Folder ID not configured in .env. Photo saved locally in storage/rendered.');
    
    const fallbackUrl = folderUrl || `${localBaseUrl()}/storage/rendered/${fileName}`;
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
      || `${localBaseUrl()}/storage/rendered/${fileName}`;
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
    
    const fallbackUrl = folderUrl || `${localBaseUrl()}/storage/rendered/${fileName}`;
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
