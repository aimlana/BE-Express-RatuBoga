'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Tambah field user_id (foreign key ke Users)
    await queryInterface.addColumn('Orders', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Tambah field original_price (harga sebelum discount)
    await queryInterface.addColumn('Orders', 'original_price', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Tambah field discount_amount (jumlah diskon)
    await queryInterface.addColumn('Orders', 'discount_amount', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Tambah field coupon_used (JSON info kupon)
    await queryInterface.addColumn('Orders', 'coupon_used', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Tambah field points_awarded (flag poin sudah diberikan)
    await queryInterface.addColumn('Orders', 'points_awarded', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    // Tambah field points_earned (jumlah poin yang didapat)
    await queryInterface.addColumn('Orders', 'points_earned', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Buat index untuk performa query
    await queryInterface.addIndex('Orders', ['user_id']);
    await queryInterface.addIndex('Orders', ['points_awarded']);
  },

  async down(queryInterface, Sequelize) {
    // Hapus semua field yang ditambah
    await queryInterface.removeColumn('Orders', 'user_id');
    await queryInterface.removeColumn('Orders', 'original_price');
    await queryInterface.removeColumn('Orders', 'discount_amount');
    await queryInterface.removeColumn('Orders', 'coupon_used');
    await queryInterface.removeColumn('Orders', 'points_awarded');
    await queryInterface.removeColumn('Orders', 'points_earned');
  },
};
