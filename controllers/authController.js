const { User, Auth, Role } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { maskEmail, maskPhoneNumber } = require('../utils/maskers')

const SECRET_KEY = process.env.JWT_SECRET;

// Registrasi
const register = async (req, res) => {
  const { name, email, phone_number, address, password } = req.body;

  if (!name || !email || !phone_number || !password) {
    return res.status(400).json({ message: 'Semua field harus diisi' });
  }

  const passwordRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        'Password harus minimal 8 karakter dan mengandung setidaknya satu huruf, satu angka, dan satu simbol',
    });
  }

  try {
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ email }, { phone_number }],
      },
    });

    if (userExists) {
      return res
        .status(400)
        .json({ message: 'Email atau nomor telepon sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      phone_number,
      address,
    });

    await Auth.create({
      user_id: newUser.id,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: 'Registrasi berhasil',
      userId: newUser.id,
      createdAt: newUser.createdAt,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Terjadi kesalahan saat registrasi' });
  }
};

// Login
const login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ message: 'Email / no. hp dan password harus diisi' });
  }

  try {
    const isMail = login.includes('@');
    const user = await User.findOne({
      where: isMail ? { email: login } : { phone_number: login },
      include: Role 
    });
    
    if (!user)
      return res.status(404).json({ message: isMail ? 'Email belum terdaftar' : 'No. HP belum terdaftar' });

    const authData = await Auth.findOne({ where: { user_id: user.id } });
    if (!authData)
      return res
        .status(404)
        .json({ message: 'Data autentikasi tidak ditemukan' });

    const passwordMatch = await bcrypt.compare(password, authData.password);
    if (!passwordMatch)
      return res.status(401).json({ message: 'Password salah' });

    // Token jwt
    const token = jwt.sign(
      { id: user.id, uuid: user.uuid, role: user.Role.name },
      SECRET_KEY,
      { expiresIn: '1d' }
    );

    console.log(token);

    return res.status(200).json({
      message: 'Login berhasil', 
      token,
      user: {
        id: user.id,
        name: user.name,
        email: maskEmail(user.email),
        phone_number: maskPhoneNumber(user.phone_number),
        role: user.Role.name
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Terjadi kesalahan saat login' });
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
              <p><i>Catatan: link ini hanya berlaku 2 jam, setelahnya akan expire</i></p>
            `,
      replyTo: `<${process.env.EMAIL_USER}>`,
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

    const result = await Auth.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );

    res.status(200).json({ message: 'Password berhasil direset' });
  } catch (err) {
    res
      .status(400)
      .json({ message: 'Token tidak valid atau expired', error: err.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
