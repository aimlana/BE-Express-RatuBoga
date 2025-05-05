const { body, validationResult } = require('express-validator');

const validateMenu = [
  // Validasi dasar
  body('name')
    .notEmpty()
    .withMessage('Nama menu wajib diisi')
    .isLength({ max: 100 })
    .withMessage('Nama maksimal 100 karakter'),

  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Deskripsi maksimal 500 karakter'),

  body('price')
    .notEmpty()
    .withMessage('Harga wajib diisi')
    .isFloat({ min: 0 })
    .withMessage('Harga harus angka positif'),

  body('quantity')
    .notEmpty()
    .withMessage('Jumlah wajib diisi')
    .isInt({ min: 0 })
    .withMessage('Jumlah harus bilangan bulat positif'),

  body('imageUrl').optional().isURL().withMessage('URL gambar tidak valid'),

  body('categoryId')
    .notEmpty()
    .withMessage('Kategori wajib dipilih')
    .isInt({ min: 1 })
    .withMessage('ID kategori tidak valid'),

  // Handler validasi
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validasi gagal',
        errors: errors.array().map((err) => ({
          field: err.path,
          message: err.msg,
        })),
      });
    }
    next();
  },
];

module.exports = { validateMenu };
