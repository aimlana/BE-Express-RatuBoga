'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'role_id');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'role_id', {
      type: Sequelize.INTEGER,
      defaultValue: 2,
      references: {
        model: 'Roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
};
