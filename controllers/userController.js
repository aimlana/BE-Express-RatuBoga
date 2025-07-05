const { User } = require('../models');
const bcrypt = require('bcryptjs');

// Ambil profil admin
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'uuid', 'name', 'email', 'phone_number', 'createdAt'],
    });

    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengambil profil' });
  }
};

// Update profil admin (nama, email, phone_number, password)
const updateProfile = async (req, res) => {
  const { name, email, phone_number, password } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone_number = phone_number || user.phone_number;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await user.getAuth().then((auth) => {
        if (auth) {
          auth.password = hashedPassword;
          return auth.save();
        }
      });
    }

    await user.save();

    res.json({ message: 'Profil berhasil diperbarui' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui profil' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
