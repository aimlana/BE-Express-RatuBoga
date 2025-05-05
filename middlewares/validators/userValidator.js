const { body, validationResult } = require('express-validator');

// User Validation API
const validateUserRegistration = [
  body('name').notEmpty().withMessage('Wajib mengisi nama'),
  body('email')
    .isEmail()
    .withMessage(
      'Email tidak valid, harus berformat email (contoh@example.com)'
    ),
  body('phone_number').notEmpty().withMessage('Wajib mengisi nomor telepon'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('password minimal 8 karakter'),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage(
      'Email tidak valid, harus berformat email (contoh@example.com)'
    ),
  body('password').notEmpty().withMessage('Wajib mengisi password'),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage(
      'Email tidak valid, harus berformat email (contoh@example.com)'
    ),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const validateResetPassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('password minimal 8 karakter'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Konfirmasi password tidak sama'),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const validateUpdateUser = [
  body('name').notEmpty().withMessage('Wajib mengisi nama'),
  body('email')
    .isEmail()
    .withMessage(
      'Email tidak valid, harus berformat email (contoh@example.com)'
    ),
  body('phone_number').notEmpty().withMessage('Wajib mengisi nomor telepon'),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const validateUserIdParams = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID harus berupa angka dan minimal 1'),
  (req, res, next) => handleValidationErrors(req, res, next),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateUser,
  validateUserIdParams,
}