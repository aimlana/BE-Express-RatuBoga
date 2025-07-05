const { User, Auth } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { maskEmail, maskPhoneNumber } = require('../utils/maskers');

const SECRET_KEY = process.env.JWT_SECRET;

// Login
const login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res
      .status(400)
      .json({ message: 'Email / no. hp dan password harus diisi' });
  }

  try {
    const isMail = login.includes('@');
    const user = await User.findOne({
      where: isMail ? { email: login } : { phone_number: login },
    });

    if (!user)
      return res.status(404).json({
        message: isMail ? 'Email belum terdaftar' : 'No. HP belum terdaftar',
      });

    const authData = await Auth.findOne({ where: { user_id: user.id } });
    if (!authData)
      return res
        .status(404)
        .json({ message: 'Data autentikasi tidak ditemukan' });

    const passwordMatch = await bcrypt.compare(password, authData.password);
    if (!passwordMatch)
      return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign({ id: user.id, uuid: user.uuid }, SECRET_KEY, {
      expiresIn: '1h',
    });

    return res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: maskEmail(user.email),
        phone_number: maskPhoneNumber(user.phone_number),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Terjadi kesalahan saat login' });
  }
};

// Change data
const updateProfile = async (req, res) => {
  const userId = req.userId;
  const { name, email, phone_number, oldPassword, newPassword } = req.body;

  if (!name || !email || !phone_number) {
    return res
      .status(400)
      .json({ message: 'Nama, email, dan no. HP wajib diisi' });
  }

  try {
    await User.update({ name, email, phone_number }, { where: { id: userId } });

    if (oldPassword && newPassword) {
      const authData = await Auth.findOne({ where: { user_id: userId } });
      const passwordMatch = await bcrypt.compare(
        oldPassword,
        authData.password
      );
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Password lama salah' });
      }

      const hashedNew = await bcrypt.hash(newPassword, 10);
      await Auth.update(
        { password: hashedNew },
        { where: { user_id: userId } }
      );
    }

    return res.status(200).json({ message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat update profil' });
  }
};



// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(404).json({ message: 'Email tidak ditemukan' });

    const token = jwt.sign({ id: user.id }, SECRET_KEY, {
      expiresIn: '2h',
    });

    const resetLink = `http://localhost:5173/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ratu Boga Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset Password',
      html: `<p>Halo <b>${user.name}</b>,</p>
              <p>Kami menerima permintaan untuk mereset password akun Anda di web <b>RM. Ratu Boga</b>.</p>
              <p>Klik link berikut untuk reset password:</p>
              <a href="${resetLink}">${resetLink}</a>
              <p>Jika Anda tidak merasa meminta reset password, abaikan email ini.</p>
              <p>Terima kasih,</p>
              <p><b>Tim Ratu Boga</b></p> <br/>
              <p><i>Catatan: link ini hanya berlaku 2 jam, setelahnya akan expire</i></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Link reset password telah dikirim ke email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan' });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const userId = decoded.id;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await Auth.update(
      { password: hashedPassword },
      { where: { user_id: userId } }
    );

    res.status(200).json({ message: 'Password berhasil direset' });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Token tidak valid atau expired', error: err.message });
  }
};

module.exports = {
  login,
  forgotPassword,
  resetPassword,
};
