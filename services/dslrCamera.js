const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const execPromise = util.promisify(exec);

// Path to storage directory for downloaded raw DSLR photos
const UPLOADS_DIR = path.join(__dirname, '../storage/uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Helper to unmount Linux GVFS volume lock on DSLR USB interface
 */
async function releaseUsbLock() {
  try {
    await execPromise('gio mount -u gphoto2://* 2>/dev/null || true');
  } catch (err) {
    // Ignore unmount errors if volume wasn't mounted
  }
}

/**
 * Check if gphoto2 binary is installed on system
 */
async function isGphoto2Installed() {
  try {
    await execPromise('which gphoto2');
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Canon DSLR Camera USB Connection Status
 */
async function checkDslrStatus() {
  const installed = await isGphoto2Installed();
  if (!installed) {
    return {
      connected: false,
      model: null,
      gphoto2Installed: false,
      message: 'gphoto2 CLI belum terinstall di server Linux host'
    };
  }

  try {
    await releaseUsbLock();
    const { stdout } = await execPromise('gphoto2 --auto-detect');

    // Parse gphoto2 detection output
    // Example stdout:
    // Model                          Port
    // ----------------------------------------------------------
    // Canon EOS 1300D                usb:001,004
    const lines = stdout.split('\n').filter(l => l.trim() && !l.startsWith('Model') && !l.startsWith('-'));

    if (lines.length > 0) {
      const matchLine = lines[0].trim();
      const parts = matchLine.split(/\s{2,}/);
      const model = parts[0] || 'Canon DSLR Camera';
      const port = parts[1] || 'usb';

      return {
        connected: true,
        model,
        port,
        gphoto2Installed: true,
        message: `Terhubung: ${model} (${port})`
      };
    } else {
      return {
        connected: false,
        model: null,
        gphoto2Installed: true,
        message: 'Tidak ada kamera DSLR terdeteksi via USB'
      };
    }
  } catch (err) {
    return {
      connected: false,
      model: null,
      gphoto2Installed: true,
      error: err.message,
      message: 'Gagal mendeteksi kamera DSLR'
    };
  }
}

/**
 * Capture High-Res Photo from Canon DSLR via gphoto2
 */
async function captureDslrPhoto() {
  const timestamp = Date.now();
  const filename = `dslr_${timestamp}.jpg`;
  const targetPath = path.join(UPLOADS_DIR, filename);

  try {
    await releaseUsbLock();

    // Trigger Canon shutter & download directly to storage/uploads/
    const command = `gphoto2 --capture-image-and-download --filename "${targetPath}" --force-overwrite`;
    console.log(`📸 [DSLR Shutter Trigger] Executing: ${command}`);

    const { stdout, stderr } = await execPromise(command, { timeout: 15000 });
    console.log('📸 [DSLR Shutter Result]:', stdout || stderr);

    if (!fs.existsSync(targetPath)) {
      throw new Error('File foto DSLR tidak ditemukan setelah capture');
    }

    // Read photo as base64 Data URL for frontend response
    const imageBuffer = fs.readFileSync(targetPath);
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

    return {
      success: true,
      fileName: filename,
      filePath: targetPath,
      dataUrl: base64Image
    };
  } catch (err) {
    console.error('❌ [DSLR Capture Error]:', err.message);
    throw new Error(`Gagal mengambil foto dari kamera DSLR: ${err.message}`);
  }
}

module.exports = {
  checkDslrStatus,
  captureDslrPhoto,
  releaseUsbLock
};
