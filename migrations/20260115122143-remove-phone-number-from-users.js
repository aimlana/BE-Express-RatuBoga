'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Jika ingin menghapus kolom secara permanen
    await queryInterface.removeColumn('users', 'phone_number');
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: tambahkan kembali kolom
    await queryInterface.addColumn('users', 'phone_number', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
