const { Menu, Category } = require('../models');
const { Op } = require('sequelize');
const { deleteOldFile } = require('../middlewares/uploads')

const getAllMenus = async (req, res) => {
  const {
    page = 1,
    limit = 12,
    sortBy = 'name',
    sortOrder = 'ASC',
    minPrice,
    maxPrice,
    categoryId,
  } = req.query;

  const offset = (page - 1) * limit;

  try {
    // Build where condition
    const whereCondition = {};

    if (req.query.search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${req.query.search}%` } },
        { description: { [Op.like]: `%${req.query.search}%` } },
      ];
    }

    // Filter by price range
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereCondition.price = {};
      if (minPrice !== undefined) {
        whereCondition.price[Op.gte] = parseFloat(minPrice);
      }
      if (maxPrice !== undefined) {
        whereCondition.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    // Filter by category
    if (categoryId && categoryId !== 'null') {
      whereCondition.categoryId = parseInt(categoryId);
    }

    // Build order condition
    let order = [];
    if (sortBy && sortOrder) {
      order = [[sortBy, sortOrder.toUpperCase()]];
    } else {
      order = [['name', 'ASC']]; 
    }

    const { count, rows: menus } = await Menu.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: order,
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: menus,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: totalPages, 
      },
    });
  } catch (err) {
    console.error('Error getting menus:', err);
    res.status(500).json({
      success: false,
      message: 'Gagal mendapatkan data menu',
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

const searchMenus = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search = '',
      categoryId = null,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;

    let whereCondition = {};

    // kondisi pencarian
    if (search) {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    // filter kategori 
    if (categoryId) {
      whereCondition = {
        ...whereCondition,
        categoryId: categoryId,
      };
    }

    const { count, rows: menus } = await Menu.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Category,
          as: 'Category',
          attributes: ['id', 'name'],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset,
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: menus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: totalPages, 
      },
    });
  } catch (error) {
    console.error('Search menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan pencarian menu',
      error: error.message,
    });
  }
};

module.exports = {
  getAllMenus,
  getMenusById,
  createMenu,
  updateMenu,
  deleteMenu,
  searchMenus,
};
