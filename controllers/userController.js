const { User, Role } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await User.findAndCountAll({
      attributes: { exclude: ['password'] },
      include: {
        model: Role,
        attributes: ['id', 'name'],
      },
      limit,
      offset
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users data',
      error: err.message,
    });
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
      return res.status(404).json({
        success: false, 
        message: 'User tidak ditemukan' 
      });
    }
    
    res.json({
      success: true,
      message: 'User berhasil didapatkan',
      user,
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Gagal mengambil data user', 
      error: err.message 
    });
  }
}

const updateUserByUuid = async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { uuid: req.params.uuid } 
    });
    
    if (!user) return res.status(404).json({ 
      success: false,
      message: 'User tidak ditemukan' 
    });

    const { name, email, phone_number, address, role_id } = req.body;

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone_number = phone_number || user.phone_number;
    user.address = address || user.address;
    user.role_id = role_id || user.role_id;

    await user.save();
    res.json({ 
      success: true,
      message: 'User berhasil diupdate', 
      userId: user.id});
  } catch (err) {
    res.status(500).json({ 
      success: true,
      message: 'Gagal update user', 
      error: err.message 
    });
  }
};

const deleteUserByUuid = async (req, res) => {
  try {
    const user = await User.findOne({ 
      where: { uuid: req.params.uuid } 
    });
    if (!user) return res.status(404).json({ 
      success: false,
      message: 'User tidak ditemukan' 
    });

    await user.destroy();  
    res.json({ 
      success: true,
      message: 'User berhasil dihapus' 
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Gagal hapus user', 
      error: err.message 
    });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, phone_number, address, role_id } = req.body;

  if (!name || !email || !password || !phone_number || !address || !role_id) {
    return res.status(400).json({ 
      success: false,
      message: 'Semua field wajib diisi' 
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
        .json({ 
          success: false,
          message: 'Email atau nomor telepon sudah terdaftar' 
        });
    }

    const role = await Role.findByPk(role_id);
    if (!role) {
      return res.status(404).json({ 
        success: false,
        message: 'Role tidak ditemukan' 
      });
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
      success: true,
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
    res.status(500).json({ 
      success: false,
      message: 'Gagal membuat user', 
      error: err.message 
    });
  }
}


module.exports = {
  getAllUsers,
  getUserByUuid,
  updateUserByUuid,
  deleteUserByUuid,
  createUser,
}