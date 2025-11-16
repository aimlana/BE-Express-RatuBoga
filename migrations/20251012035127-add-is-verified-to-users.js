'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.sequelize.query(
      'UPDATE users SET is_verified = true WHERE is_verified IS NULL OR is_verified = false'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'is_verified');
  },
};
