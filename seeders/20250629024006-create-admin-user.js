'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Deleting old data
    await queryInterface.bulkDelete('Auths', null, {});
    await queryInterface.bulkDelete('Users', null, {});

    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    await queryInterface.bulkInsert('Users', [
      {
        uuid: require('uuid').v4(),
        name: 'Admin Ratu Boga',
        email: 'admin@ratuboga.com',
        phone_number: '081234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const users = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE email='admin@ratuboga.com';`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    const adminId = users[0].id;

    await queryInterface.bulkInsert('Auths', [
      {
        user_id: adminId,
        password: password,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Auths', null, {});
    await queryInterface.bulkDelete(
      'Users',
      { email: 'admin@ratuboga.com' },
      {}
    );
  }
};
