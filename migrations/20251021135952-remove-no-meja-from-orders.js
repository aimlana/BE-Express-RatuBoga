'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const [tables] = await queryInterface.sequelize.query(
        `SELECT id FROM Tables WHERE id = 1 LIMIT 1`,
        { transaction }
      );

      let defaultTableId = 1;

      if (tables.length === 0) {
        const [availableTables] = await queryInterface.sequelize.query(
          `SELECT id FROM Tables WHERE is_active = true ORDER BY id LIMIT 1`,
          { transaction }
        );

        if (availableTables.length > 0) {
          defaultTableId = availableTables[0].id;
        } else {
          await queryInterface.sequelize.query(
            `INSERT INTO Tables (table_number, qr_code_url, is_active, createdAt, updatedAt) 
              VALUES (1, '/qr-table/default.png', true, NOW(), NOW())`,
            { transaction }
          );
          defaultTableId = 1;
        }
      }
      const [updateResult] = await queryInterface.sequelize.query(
        `UPDATE Orders SET table_id = ${defaultTableId} WHERE table_id IS NULL`,
        { transaction }
      );

      await queryInterface.removeColumn('Orders', 'no_meja', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Mengembalikan kolom no_meja...');
      await queryInterface.addColumn(
        'Orders',
        'no_meja',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        UPDATE Orders o
        INNER JOIN Tables t ON o.table_id = t.id
        SET o.no_meja = t.table_number
      `,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `
        UPDATE Orders 
        SET no_meja = NULL 
        WHERE table_id IS NULL
      `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
