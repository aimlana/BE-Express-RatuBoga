'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Orders', 'table_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Tables',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('Orders', ['table_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Orders', ['table_id']);
    await queryInterface.removeColumn('Orders', 'table_id');
  },
};
