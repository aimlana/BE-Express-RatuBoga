const { Table } = require('../models');

const validateTableForOrder = async (req, res, next) => {
  try {
    const { tableId } = req.params;

    if (!tableId) {
      return res.status(400).json({
        success: false,
        message: 'Table ID is required',
      });
    }

    // Cari table berdasarkan table_number
    const table = await Table.findOne({
      where: { 
        table_number: tableId,
        is_active: true 
      }
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Meja tidak ditemukan atau tidak aktif',
      });
    }

    // Simpan table info di request untuk digunakan di controller
    req.validatedTable = table;
    next();
  } catch (error) {
    console.error('Table validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = { validateTableForOrder };