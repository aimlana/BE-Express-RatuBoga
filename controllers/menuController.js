const { Menu } = require('../models');
const { Op } = require('sequelize');

const getAllMenus = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const { count, rows } = await Menu.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      data: rows,
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal mendapatkan data menu' });
  }
};

const getMenusById = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);
    if (!menu) {
      return res.status(404).json({ message: 'Menu tidak ditemukan' });
    }
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mendapatkan data menu' });
  }
};

const createMenu = async (req, res) => {
  const { name, description, price, quantity, imageUrl, categoryId } = req.body;

  try {
    const newMenu = await Menu.create({
      name,
      description,
      price,
      quantity,
      imageUrl,
      categoryId,
    });
    res.status(200).json({ 
      message: 'Menu berhasil dibuat', 
      data: newMenu 
    });
  } catch (err) {
    res.status(500).json({ message: 'Gagal membuat menu', error: err.message });
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);

    if (!menu) {
      return res.status(404).json({ message: 'Menu tidak ditemukan' });
    }

    const { name, description, price, quantity, imageUrl, categoryId } =
      req.body;

    menu.name = name || menu.name;
    menu.description = description || menu.description;
    menu.price = price || menu.price;
    menu.quantity = quantity || menu.quantity;
    menu.imageUrl = imageUrl || menu.imageUrl;
    menu.categoryId = categoryId || menu.categoryId;

    await menu.save();
    res.json({ message: 'Menu berhasil diupdate', menu });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Gagal mengupdate menu', error: err.message });
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const menu = await Menu.findByPk(id);

    if (!menu) {
      return res.status(404).json({ message: 'Menu tidak ditemukan' });
    }

    await menu.destroy();
    res.json({ message: 'Menu berhasil dihapus' });
  } catch (err) {
    res
      .status(500)
      .json({ message: 'Gagal menghapus menu', error: err.message });
  }
};

module.exports = {
  getAllMenus,
  getMenusById,
  createMenu,
  updateMenu,
  deleteMenu,
};
