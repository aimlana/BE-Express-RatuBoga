const { User, Auth, OTP } = require('../models');
const { Op } = require('sequelize')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

const { maskEmail, maskPhoneNumber } = require('../utils/maskers');

const SECRET_KEY = process.env.JWT_SECRET;
const BASE_URL_FRONTEND = process.env.FRONTEND_LINK;
const TOKEN_EXPIRES_IN = '20m';
const OTP_EXPIRES_IN = 15 * 60 * 1000; 
const OTP_RESEND_COOLDOWN = 60 * 1000; 

// Helper: Generate 6 digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper: Send OTP Email
const sendOTPEmail = async (email, name, otpCode) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Ratu Boga Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Kode Verifikasi Email - RM. Ratu Boga',
      html: `
            <div style="
              max-width: 600px; 
              margin: 0 auto; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: #f8f9fa; 
              padding: 20px;
            ">
              <!-- Header -->
              <div style="
                background: linear-gradient(135deg, #EE7214, #527853);
                padding: 25px;
                text-align: center;
                border-radius: 10px 10px 0 0;
                color: white;
              ">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">RM. Ratu Boga</h1>
                <p style="color: white; margin: 5px 0 0 0; opacity: 0.9; font-size: 16px;">Verifikasi Email Anda</p>
              </div>
              
              <!-- Content -->
              <div style="
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              ">
                <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Halo <strong style="color: #EE7214;">${name}</strong>,
                </p>
                
                <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
                  Terima kasih telah mendaftar di <strong style="color: #527853;">RM. Ratu Boga</strong>. 
                  Untuk melengkapi proses registrasi, gunakan kode OTP berikut:
                </p>
                
                <!-- OTP Box -->
                <div style="text-align: center; margin: 30px 0;">
                  <div style="
                    background: linear-gradient(135deg, #fef6f0, #e8f5e8);
                    border: 2px dashed #EE7214;
                    padding: 20px;
                    border-radius: 10px;
                    margin: 0 auto;
                    max-width: 300px;
                  ">
                    <p style="color: #666; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
                      Kode Verifikasi Anda:
                    </p>
                    <h2 style="
                      font-size: 36px; 
                      letter-spacing: 8px; 
                      text-align: center; 
                      background: white; 
                      padding: 20px;
                      border-radius: 8px; 
                      margin: 0;
                      color: #527853;
                      font-weight: bold;
                      border: 2px solid #e9ecef;
                      font-family: 'Courier New', monospace;
                    ">
                      ${otpCode}
                    </h2>
                  </div>
                </div>
                
                <!-- Important Notes -->
                <div style="margin: 30px 0;">
                  <h3 style="color: #527853; font-size: 16px; margin-bottom: 15px;">
                    📝 Catatan Penting:
                  </h3>
                  <ul style="color: #555; font-size: 14px; line-height: 1.6; padding-left: 20px; margin: 0;">
                    <li style="margin-bottom: 10px;">
                      <strong style="color: #EE7214;">Kode OTP berlaku 15 menit</strong> saja
                    </li>
                    <li style="margin-bottom: 10px;">
                      <strong>Jangan bagikan kode ini</strong> kepada siapapun, termasuk pihak RM. Ratu Boga
                    </li>
                    <li style="margin-bottom: 10px;">
                      Jika <strong>tidak melakukan registrasi</strong>, abaikan email ini
                    </li>
                  </ul>
                </div>
                
                <!-- Security Warning -->
                <div style="
                  background: #fef6f0;
                  border-left: 4px solid #EE7214;
                  padding: 15px;
                  margin: 25px 0;
                  border-radius: 4px;
                ">
                  <p style="color: #8c4c1a; margin: 0; font-size: 14px; line-height: 1.5;">
                    🔒 <strong>Perhatian:</strong> Untuk keamanan akun Anda, jangan memberikan kode OTP 
                    kepada siapapun. Tim Ratu Boga tidak akan pernah meminta kode OTP Anda.
                  </p>
                </div>
                
                <p style="color: #555; font-size: 15px; line-height: 1.6; margin-top: 30px;">
                  Terima kasih atas kepercayaan Anda,<br>
                  <strong style="color: #527853; font-size: 16px;">Tim Ratu Boga</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-size: 12px;
                border-top: 1px solid #dee2e6;
                margin-top: 20px;
              ">
                <p style="margin: 5px 0;">
                  Email ini dikirim secara otomatis. Mohon tidak membalas email ini.
                </p>
                <p style="margin: 5px 0;">
                  &copy; ${new Date().getFullYear()} RM. Ratu Boga. All rights reserved.
                </p>
              </div>
            </div>
          `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return false;
  }
};

const register = async (req, res) => {
  const { name, email, phone_number, password, confirmPassword } = req.body;

  if (!name || !email || !phone_number || !password) {
    return res.status(400).json({
      message: 'Semua field harus diisi: nama, email, no. HP, dan password',
    });
  }

  if (confirmPassword && password !== confirmPassword) {
    return res.status(400).json({
      message: 'Password dan konfirmasi password tidak sama',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password minimal 6 karakter',
    });
  }

  try {
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    const existingPhone = await User.findOne({ where: { phone_number } });
    if (existingPhone) {
      return res.status(400).json({ message: 'Nomor HP sudah terdaftar' });
    }

    // Buat user dengan status unverified
    const user = await User.create({
      name,
      email,
      phone_number,
      role_id: 2,
      is_verified: false, // TAMBAH FIELD INI
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    await Auth.create({
      user_id: user.id,
      password: hashedPassword,
    });

    // Generate dan kirim OTP
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN);

    await OTP.create({
      user_id: user.id,
      otp_code: otpCode,
      expires_at: expiresAt,
      type: 'email_verification',
    });

    // Kirim email OTP
    const emailSent = await sendOTPEmail(email, name, otpCode);

    if (!emailSent) {
      return res.status(500).json({
        message:
          'Registrasi berhasil tetapi gagal mengirim OTP. Silakan request OTP kembali.',
      });
    }

    return res.status(201).json({
      message: 'Registrasi berhasil! Silakan cek email untuk kode verifikasi.',
      user: {
        id: user.id,
        name: user.name,
        email: maskEmail(user.email),
        phone_number: maskPhoneNumber(user.phone_number),
        is_verified: false,
      },
      requires_verification: true,
    });
  } catch (err) {
    console.error(err);

    if (err.name === 'SequelizeValidationError') {
      const errors = err.errors.map((error) => error.message);
      return res.status(400).json({
        message: 'Validasi gagal',
        errors,
      });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: 'Email atau nomor HP sudah terdaftar',
      });
    }

    return res.status(500).json({
      message: 'Terjadi kesalahan saat registrasi',
    });
  }
};

// Resend OTP
const resendOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email harus diisi' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email tidak ditemukan' });
    }

    if (user.is_verified) {
      return res.status(400).json({ message: 'Email sudah terverifikasi' });
    }

    // Cek cooldown (1 menit) - ✅ PERBAIKAN: ganti 'created_at' menjadi 'createdAt'
    const lastOTP = await OTP.findOne({
      where: {
        user_id: user.id,
        type: 'email_verification',
      },
      order: [['createdAt', 'DESC']], // ✅ DIPERBAIKI
    });

    if (lastOTP) {
      const timeSinceLastOTP =
        Date.now() - new Date(lastOTP.createdAt).getTime(); // ✅ Juga perbaiki di sini
      if (timeSinceLastOTP < OTP_RESEND_COOLDOWN) {
        const remainingTime = Math.ceil(
          (OTP_RESEND_COOLDOWN - timeSinceLastOTP) / 1000
        );
        return res.status(429).json({
          message: `Tunggu ${remainingTime} detik sebelum mengirim ulang OTP`,
          retry_after: remainingTime,
        });
      }
    }

    // Non-aktifkan OTP sebelumnya
    await OTP.update(
      { is_used: true },
      { where: { user_id: user.id, type: 'email_verification' } }
    );

    // Generate OTP baru
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN);

    await OTP.create({
      user_id: user.id,
      otp_code: otpCode,
      expires_at: expiresAt,
      type: 'email_verification',
    });

    // Kirim email
    const emailSent = await sendOTPEmail(user.email, user.name, otpCode);

    if (!emailSent) {
      return res.status(500).json({
        message: 'Gagal mengirim OTP. Silakan coba lagi.',
      });
    }

    return res.json({
      message: 'Kode OTP baru telah dikirim ke email Anda',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan' });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  const { email, otp_code } = req.body;

  if (!email || !otp_code) {
    return res.status(400).json({
      message: 'Email dan kode OTP harus diisi',
    });
  }

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email tidak ditemukan' });
    }

    // Cek apakah sudah verified
    if (user.is_verified) {
      return res.status(400).json({ message: 'Email sudah terverifikasi' });
    }

    // Cari OTP yang valid
    const otpRecord = await OTP.findOne({
      where: {
        user_id: user.id,
        otp_code: otp_code,
        type: 'email_verification',
        is_used: false,
        expires_at: {
          [Op.gt]: new Date(), 
        },
      },
    });

    if (!otpRecord) {
      return res.status(400).json({
        message: 'Kode OTP tidak valid atau sudah kadaluarsa',
      });
    }

    // Update user menjadi verified
    await User.update({ is_verified: true }, { where: { id: user.id } });

    // Tandai OTP sebagai digunakan
    await OTP.update({ is_used: true }, { where: { id: otpRecord.id } });

    return res.json({
      message: 'Email berhasil diverifikasi! Sekarang Anda bisa login.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: true,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan' });
  }
};

// Login 
const login = async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({
      message: 'Email / no. hp dan password harus diisi',
    });
  }

  try {
    const isMail = login.includes('@');
    const user = await User.findOne({
      where: isMail ? { email: login } : { phone_number: login },
      include: [
        {
          association: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        message: isMail ? 'Email belum terdaftar' : 'No. HP belum terdaftar',
      });
    }

    // Cek verifikasi email (lagi)
    if (!user.is_verified) {
      return res.status(403).json({
        message: 'Email belum diverifikasi. Silakan cek email untuk kode OTP.',
        requires_verification: true,
        email: user.email,
      });
    }

    const authData = await Auth.findOne({ where: { user_id: user.id } });
    if (!authData) {
      return res
        .status(404)
        .json({ message: 'Data autentikasi tidak ditemukan' });
    }

    const passwordMatch = await bcrypt.compare(password, authData.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Password salah' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        uuid: user.uuid,
        role: user.role.name,
        email: user.email,
      },
      SECRET_KEY,
      {
        expiresIn: TOKEN_EXPIRES_IN,
      }
    );

    return res.status(200).json({
      message: 'Login berhasil',
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: maskEmail(user.email),
        phone_number: maskPhoneNumber(user.phone_number),
        role: user.role.name,
        is_verified: user.is_verified,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan saat login' });
  }
};

// Logout 
const logout = async (req, res) => {
  try {
    return res.status(200).json({ message: 'Logout berhasil' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan saat logout' });
  }
};

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; 

    if (!token) {
      return res.status(401).json({ message: 'Token tidak ditemukan' });
    }

    const decoded = jwt.verify(token, SECRET_KEY);

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          association: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'User tidak ditemukan' });
    }

    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalid' });
    }

    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Token tidak valid' });
  }
};

// Verify Endpoint
const verifyAuth = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email', 'phone_number'],
      include: [
        {
          association: 'role',
          attributes: ['name'],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role: user.role.name,
      },
    });
  } catch (error) {
    console.error('Verify auth error:', error);
    res.status(401).json({ message: 'Token tidak valid' });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  const userId = req.userId;
  const { name, email, phone_number, oldPassword, newPassword } = req.body;

  if (!name || !email || !phone_number) {
    return res.status(400).json({
      message: 'Nama, email, dan no. HP wajib diisi',
    });
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

    return res.status(200).json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: userId,
        name,
        email,
        phone_number,
      },
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat update profil',
    });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Email tidak ditemukan' });
    }

    const resetToken = jwt.sign({ id: user.id }, SECRET_KEY, {
      expiresIn: '2h',
    });

    const resetLink = `${BASE_URL_FRONTEND}/reset-password/${resetToken}`;

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
      subject: 'Reset Password - RM. Ratu Boga',
      html: `
            <div style="
              max-width: 600px; 
              margin: 0 auto; 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: #f8f9fa; 
              padding: 20px;
            ">
              <!-- Header -->
              <div style="
                background: linear-gradient(135deg, #EE7214, #527853);
                padding: 25px;
                text-align: center;
                border-radius: 10px 10px 0 0;
                color: white;
              ">
                <h1 style="color: white; margin: 0; font-size: 24px;">RM. Ratu Boga</h1>
                <p style="color: white; margin: 5px 0 0 0; opacity: 0.9;">Reset Password Akun Anda</p>
              </div>
              
              <!-- Content -->
              <div style="
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              ">
                <p style="color: #333; font-size: 16px; line-height: 1.6;">
                  Halo <strong style="color: #EE7214;">${user.name}</strong>,
                </p>
                
                <p style="color: #555; font-size: 15px; line-height: 1.6;">
                  Kami menerima permintaan untuk mereset password akun Anda di <strong style="color: #527853;">RM. Ratu Boga</strong>.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                    style="
                      background: linear-gradient(135deg, #EE7214, #527853);
                      color: white;
                      padding: 14px 30px;
                      text-decoration: none;
                      border-radius: 5px;
                      font-weight: bold;
                      display: inline-block;
                      font-size: 16px;
                      transition: all 0.3s ease;
                    "
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'">
                      Reset Password Sekarang
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  Atau salin link berikut di browser Anda:<br>
                  <code style="
                    background: #f8f9fa; 
                    padding: 8px 12px; 
                    border-radius: 4px; 
                    font-size: 13px; 
                    word-break: break-all;
                    display: inline-block;
                    margin-top: 5px;
                    color: #333;
                    border: 1px solid #e9ecef;
                  ">${resetLink}</code>
                </p>
                
                <div style="
                  background: #e8f5e8;
                  border-left: 4px solid #527853;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                ">
                  <p style="color: #2d5a2d; margin: 0; font-size: 14px;">
                    ⏰ <strong>Penting:</strong> Link ini hanya berlaku selama <strong>2 jam</strong>. 
                    Setelah itu link akan kadaluarsa secara otomatis.
                  </p>
                </div>

                <div style="
                  background: #fef6f0;
                  border-left: 4px solid #EE7214;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                ">
                  <p style="color: #8c4c1a; margin: 0; font-size: 14px;">
                    🔒 <strong>Keamanan:</strong> Jika Anda tidak merasa meminta reset password, 
                    abaikan email ini dan periksa keamanan akun Anda.
                  </p>
                </div>
                
                <p style="color: #555; font-size: 15px; line-height: 1.6;">
                  Terima kasih,<br>
                  <strong style="color: #527853;">Tim Ratu Boga</strong>
                </p>
              </div>
              
              <!-- Footer -->
              <div style="
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-size: 12px;
                border-top: 1px solid #dee2e6;
                margin-top: 20px;
              ">
                <p style="margin: 5px 0;">
                  Email ini dikirim secara otomatis. Mohon tidak membalas email ini.
                </p>
                <p style="margin: 5px 0;">
                  &copy; ${new Date().getFullYear()} RM. Ratu Boga. All rights reserved.
                </p>
              </div>
            </div>
          `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Link reset password telah dikirim ke email' });
  } catch (err) {
    console.error('Forgot password error:', err);
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
    res.status(400).json({
      message: 'Token tidak valid atau expired',
      error: err.message,
    });
  }
};

const updateEmail = async (req, res) => {
  const { oldEmail, newEmail } = req.body;

  if (!oldEmail || !newEmail) {
    return res.status(400).json({
      message: 'Email lama dan email baru harus diisi',
    });
  }

  if (oldEmail === newEmail) {
    return res.status(400).json({
      message: 'Email baru harus berbeda dengan email lama',
    });
  }

  try {
    // Cek apakah user dengan oldEmail exists dan belum terverifikasi
    const user = await User.findOne({
      where: {
        email: oldEmail,
        is_verified: false,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'Email tidak ditemukan atau sudah terverifikasi',
      });
    }

    // Cek apakah newEmail sudah digunakan
    const existingEmail = await User.findOne({ where: { email: newEmail } });
    if (existingEmail) {
      return res.status(400).json({
        message: 'Email baru sudah digunakan',
      });
    }

    // Update email user
    await User.update({ email: newEmail }, { where: { id: user.id } });

    // Generate OTP baru untuk email baru
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_EXPIRES_IN);

    // Non-aktifkan OTP sebelumnya
    await OTP.update(
      { is_used: true },
      { where: { user_id: user.id, type: 'email_verification' } }
    );

    // Buat OTP baru
    await OTP.create({
      user_id: user.id,
      otp_code: otpCode,
      expires_at: expiresAt,
      type: 'email_verification',
    });

    // Kirim OTP ke email baru
    const emailSent = await sendOTPEmail(newEmail, user.name, otpCode);

    if (!emailSent) {
      return res.status(500).json({
        message: 'Gagal mengirim OTP ke email baru',
      });
    }

    return res.json({
      message:
        'Email berhasil diubah. Kode OTP baru telah dikirim ke email Anda.',
      email: newEmail,
    });
  } catch (error) {
    console.error('Update email error:', error);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat mengubah email',
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyToken,
  verifyAuth,
  updateProfile,
  forgotPassword,
  resetPassword,
  resendOTP, 
  verifyOTP, 
  updateEmail
};
