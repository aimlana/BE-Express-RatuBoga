const { Table } = require('../models');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

const generateQRCode = async (tableNumber, tableId) => {
  try {
    const BASE_URL_FRONTEND =
      process.env.FRONTEND_LINK || 'http://localhost:3000';
    const url = `${BASE_URL_FRONTEND}/order/${tableNumber}`;

    const outputFolder = path.join(__dirname, '..', 'public', 'qr-table');

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `QRMeja-No.${tableNumber}-${timestamp}.png`;
    const filePath = path.join(outputFolder, filename);

    await QRCode.toFile(filePath, url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });

    return `/qr-table/${filename}`;
  } catch (error) {
    console.error('QR Generation Error:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
};

const deleteQRFile = (filePath) => {
  if (!filePath) return;

  const fullPath = path.join(__dirname, '..', 'public', filePath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log(`QR file deleted: ${filePath}`);
  }
};

const getAllTables = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10, 
      sortBy = 'table_number',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: tables } = await Table.findAndCountAll({
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Hitung totalPages
    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: tables,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: totalPages,
      },
    });
  } catch (error) {
    console.error('Get Tables Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables',
      details: error.message,
    });
  }
};

const createTable = async (req, res) => {
  try {
    const { table_number } = req.body;

    if (!table_number || isNaN(table_number)) {
      return res.status(400).json({
        success: false,
        error: 'Table number is required and must be a number',
      });
    }

    const tableNumber = parseInt(table_number);

    const existingTable = await Table.findOne({
      where: { table_number: tableNumber },
    });
    if (existingTable) {
      return res.status(400).json({
        success: false,
        error: 'Table number already exists',
      });
    }

    const table = await Table.create({
      table_number: tableNumber,
      qr_code_url: '',
    });

    const qr_code_url = await generateQRCode(tableNumber, table.id);

    await table.update({ qr_code_url });

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: table,
    });
  } catch (error) {
    console.error('Create Table Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create table',
      details: error.message,
    });
  }
};

const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { table_number } = req.body;

    if (!table_number || isNaN(table_number)) {
      return res.status(400).json({
        success: false,
        error: 'Table number is required and must be a number',
      });
    }

    const tableNumber = parseInt(table_number);

    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (tableNumber !== table.table_number) {
      const existingTable = await Table.findOne({
        where: {
          table_number: tableNumber,
          id: { [Op.ne]: id },
        },
      });
      if (existingTable) {
        return res.status(400).json({
          success: false,
          error: 'Table number already exists',
        });
      }
    }

    let qr_code_url = table.qr_code_url;
    if (tableNumber !== table.table_number) {
      if (table.qr_code_url) {
        deleteQRFile(table.qr_code_url);
      }

      qr_code_url = await generateQRCode(tableNumber, id);
    }

    await table.update({
      table_number: tableNumber,
      qr_code_url,
    });

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: table,
    });
  } catch (error) {
    console.error('Update Table Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update table',
      details: error.message,
    });
  }
};

const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await Table.findByPk(id);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    if (table.qr_code_url) {
      deleteQRFile(table.qr_code_url);
    }

    await table.destroy();
    res.json({
      success: true,
      message: 'Table deleted successfully',
    });
  } catch (error) {
    console.error('Delete Table Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete table',
      details: error.message,
    });
  }
};

const downloadQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const table = await Table.findByPk(id);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found',
      });
    }

    const filePath = path.join(__dirname, '..', 'public', table.qr_code_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'QR code file not found',
      });
    }

    const filename = path.basename(table.qr_code_url);

    // Gunakan res.download dengan parameter filename
    res.download(filePath, filename);
  } catch (error) {
    console.error('Download QR Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download QR code',
      details: error.message,
    });
  }
};

const getActiveTables = async (req, res) => {
  try {
    const tables = await Table.findAll({
      where: {
        is_active: true,
      },
      order: [['table_number', 'ASC']],
    });

    res.json({
      success: true,
      data: tables,
    });
  } catch (error) {
    console.error('Get Active Tables Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active tables',
      details: error.message,
    });
  }
};

module.exports = {
  getAllTables,
  createTable,
  updateTable,
  deleteTable,
  downloadQRCode,
  getActiveTables
};
