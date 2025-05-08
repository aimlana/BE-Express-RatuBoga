const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { log } = require('console');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../public/uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const menuName = req.body.name || 'menu';
    const formattedName = menuName
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
    const randomNumber = Math.round(Math.random() * 1e9);
    const uniqueName = (`${Date.now()}-${randomNumber}-${formattedName}${path.extname(
      file.originalname
    )}`).toLowerCase();

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar yang diizinkan!', false));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // maks: 5MB
});

const deleteOldFile = (filePath) => {
  if (!filePath) return;

  const fullPath = path.join(__dirname, '../public', filePath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`File lama terhapus: ${ filePath }`);
    
  }
}

module.exports = { 
  multerUpload: upload, 
  deleteOldFile 
};