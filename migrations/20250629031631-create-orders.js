'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Orders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      no_meja: {
        type: Sequelize.INTEGER,
        allowNull: true, 
      },
      type: {
        type: Sequelize.ENUM('dine-in', 'take-away'),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'done', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      payment_type: {
        type: Sequelize.ENUM('cash', 'midtrans'),
        allowNull: false,
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      total_price: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Orders');
  }
};
