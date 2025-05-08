const { Menu } = require('../models');
const { Op } = require('sequelize');
const { deleteOldFile } = require('../middlewares/uploads')

const getAllMenus = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const { count, rows: menus } = await Menu.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: menus,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Gagal mendapatkan data menu' 
    });
  }
};

const getMenusById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);
    if (!menu) {
      return res.status(404).json({ 
        success: false,
        message: 'Menu tidak ditemukan' 
      });
    }
    res.json(menu);
  } catch (err) {
    res.status(500).json({ 
      success: false,
      message: 'Gagal mendapatkan data menu' 
    });
  }
};

const createMenu = async (req, res) => {
  try {
    let imageUrl = null;

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`; 
    }

    const newMenu = await Menu.create({
      ...req.body,
      imageUrl, 
    });

    res.status(201).json({
      success: true,
      message: 'Menu berhasil dibuat',
      data: newMenu,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Gagal membuat menu',
      error: err.message,
    });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);

    if (!menu) {
      return res.status(404).json({
        success: false,
        message: 'Menu tidak ditemukan',
      });
    }

    const oldImagePath = menu.imageUrl;

    let imageUrl = menu.imageUrl;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const updatedData = {
      name: req.body.name || menu.name,
      description: req.body.description || menu.description,
      price: req.body.price ? Number(req.body.price) : menu.price, 
      quantity: req.body.quantity ? Number(req.body.quantity) : menu.quantity,
      categoryId: req.body.categoryId || menu.categoryId,
      imageUrl,
    };

    await menu.update(updatedData);

    if (req.file && oldImagePath) {
      deleteOldFile(oldImagePath);
    }

    res.json({
      success: true,
      message: 'Menu berhasil diupdate',
      data: menu,
    });
  } catch (err) {
    console.error('Error update menu:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mengupdate menu',
      error: err.message,
    });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);

    if (!menu) {
      return res.status(404).json({ 
        success: false,
        message: 'Menu tidak ditemukan' 
      });
    }

    await menu.destroy();
    res.json({ 
      success: true,
      message: 'Menu berhasil dihapus' 
    });
  } catch (err) {
    res
      .status(500)
      .json({ 
        success: false,
        message: 'Gagal menghapus menu', 
      });
    console.error(err);
  }
};

module.exports = {
  getAllMenus,
  getMenusById,
  createMenu,
  updateMenu,
  deleteMenu,
};
