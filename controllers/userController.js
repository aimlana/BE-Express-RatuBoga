const { User, Role } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['createdAt'] },
      include: { model: Role, attributes: ['id', 'name'] },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data users', error: err.message });
  }
}

const getUserByUuid = async (req, res) => {
  try {
    const { uuid } = req.params;
    const user = await User.findOne({
      where: { uuid },
      attributes: { exclude: ['createdAt'] },
      include: { model: Role, attributes: ['id', 'name'] },
    });

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil data user', error: err.message });
  }
}

const updateUserByUuid = async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { uuid: req.params.uuid } 
    });
    
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    const { name, email, phone_number, address, role_id } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone_number = phone_number || user.phone_number;
    user.address = address || user.address;
    user.role_id = role_id || user.role_id;

    await user.save();
    res.json({ message: 'User berhasil diupdate', userId: user.id});
  } catch (err) {
    res.status(500).json({ message: 'Gagal update user', error: err.message });
  }
};

const deleteUserByUuid = async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { uuid: req.params.uuid } 
    });
    if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

    await user.destroy();  
    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ message: 'Gagal hapus user', error: err.message });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, phone_number, address, role_id } = req.body;

  if (!name || !email || !password || !phone_number || !address || !role_id) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
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

    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(404).json({ message: 'Role tidak ditemukan' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone_number,
      address,
      role_id,
      password: hashedPassword,
    });

    res.status(201).json({ 
      message: 'User berhasil ditambahkan', 
      user: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        role_id: user.role_id,
      }
    });
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ message: 'Gagal membuat user', error: err.message });
  }
}


module.exports = {
  getAllUsers,
  getUserByUuid,
  updateUserByUuid,
  deleteUserByUuid,
  createUser,
}