'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE `Orders` SET `payment_type` = 'cash' WHERE `payment_type` = 'midtrans'"
    );

    // Untuk MySQL, kita perlu menghapus dan menambahkan kolom kembali
    await queryInterface.removeColumn('Orders', 'payment_type');

    await queryInterface.addColumn('Orders', 'payment_type', {
      type: Sequelize.ENUM('cash'),
      allowNull: false,
      defaultValue: 'cash',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Orders', 'payment_type');

    await queryInterface.addColumn('Orders', 'payment_type', {
      type: Sequelize.ENUM('cash', 'midtrans'),
      allowNull: false,
      defaultValue: 'cash',
    });
  },
};
