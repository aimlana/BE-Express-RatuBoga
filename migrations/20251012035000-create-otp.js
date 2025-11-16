'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('otps', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      otp_code: {
        type: Sequelize.STRING(6),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('email_verification', 'password_reset'),
        allowNull: false,
        defaultValue: 'email_verification',
      },
      is_used: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('otps', ['user_id', 'type']);
    await queryInterface.addIndex('otps', ['expires_at']);
    await queryInterface.addIndex('otps', ['otp_code']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('otps');
  },
};
