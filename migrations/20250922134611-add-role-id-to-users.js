'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'role_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2, 
      references: {
        model: 'roles',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    // Add index untuk role_id
    await queryInterface.addIndex('users', ['role_id']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'role_id');
  },
};
