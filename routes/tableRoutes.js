const express = require('express');
const router = express.Router();
const {
  getAllTables,
  createTable,
  updateTable,
  deleteTable,
  downloadQRCode,
  getActiveTables
} = require('../controllers/tableController');

router.get('/', getAllTables);
router.post('/', createTable);
router.put('/:id', updateTable);
router.delete('/:id', deleteTable);
router.get('/:id/download', downloadQRCode);
router.get('/active', getActiveTables);

module.exports = router;
