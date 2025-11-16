const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const BASE_URL_FRONTEND = process.env.FRONTEND_LINK
const baseURL = `${BASE_URL_FRONTEND}/order`;
const outputFolder = path.join(__dirname, '..', 'public', 'qrMeja');

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder);
}

for (let i = 1; i <= 5; i++) {
  const url = `${baseURL}${i}`;
  const filename = path.join(outputFolder, `meja-${i}.png`);

  QRCode.toFile(
    filename,
    url,
    {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    },
    (err) => {
      if (err) {
        console.error(`Gagal buat QR untuk meja ${i}:`, err);
      } else {
        console.log(
          `QR code untuk meja ${i} berhasil dibuat di: ${filename}`
        );
      }
    }
  );
}
