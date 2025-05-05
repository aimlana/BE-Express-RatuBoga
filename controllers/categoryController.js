const { Category } = require('../models');

const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      attributes: ['id', 'name'], 
      order: [['name', 'ASC']], 
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: 'Gagal mendapatkan data kategori' });
  }
};

module.exports = { getAllCategories };
