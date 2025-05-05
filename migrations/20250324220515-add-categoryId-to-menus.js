'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Menus', 'categoryId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Categories',
        key: 'id',
      },
      allowNull: false,
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Menus', 'categoryId');
  }
};
