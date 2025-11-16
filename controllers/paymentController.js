const { Payment, Order } = require('../models');
const { Op } = require('sequelize');

const confirmCashPayment = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.payment_type !== 'cash') {
      return res.status(400).json({
        success: false,
        message: 'Only cash payments can be confirmed',
      });
    }

    const transaction = await sequelize.transaction();

    try {
      // Update order
      order.is_paid = true;
      await order.save({ transaction });

      // Update payment
      const payment = await Payment.findOne({
        where: { order_id: orderId },
        transaction,
      });

      if (payment) {
        payment.status = 'completed';
        payment.paid_at = new Date();
        await payment.save({ transaction });
      }

      await transaction.commit();

      res.json({
        success: true,
        message: 'Cash payment confirmed successfully',
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Cash payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm cash payment',
    });
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, from, to } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (from && to) {
      where.paid_at = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    const { count, rows: payments } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'table_id', 'type', 'total_price', 'createdAt'],
        },
      ],
      order: [['paid_at', 'DESC']], 
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: payments,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payments',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

const getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await Payment.findOne({
      where: { order_id: orderId },
      include: [
        {
          model: Order,
          as: 'order',
          include: ['items'], 
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment by order ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment details',
      error: process.env.NODE_ENV === 'development' ? error.message : null,
    });
  }
};

module.exports = {
  confirmCashPayment,
  getAllPayments,
  getPaymentByOrderId,
};
