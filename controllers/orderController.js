const { Order, OrderItem, Menu } = require('../models');
const { Op } = require('sequelize');

const createOrder = async (req, res) => {
  const { no_meja, payment_type, items, notes } = req.body;

  try {
    // Validasi
    if (!payment_type || !items?.length) {
      return res
        .status(400)
        .json({ success: false, message: 'Data tidak lengkap' });
    }

    // Hitung total harga
    const menus = await Menu.findAll({
      where: { id: items.map((i) => i.menu_id) },
    });
    const total_price = menus.reduce((sum, menu) => {
      const item = items.find((i) => i.menu_id === menu.id);
      return sum + menu.price * item.quantity;
    }, 0);

    // Buat order
    const order = await Order.create({
      no_meja,
      type: no_meja ? 'dine-in' : 'take-away',
      status: 'pending',
      payment_type,
      is_paid: payment_type === 'midtrans',
      total_price,
      notes: notes || null,
    });

    // Buat order items
    await OrderItem.bulkCreate(
      items.map((item) => ({
        order_id: order.id,
        menu_id: item.menu_id,
        quantity: item.quantity,
        subtotal:
          menus.find((m) => m.id === item.menu_id).price * item.quantity,
        notes: item.notes || null,
      }))
    );

    // Jika midtrans, generate payment URL
    if (payment_type === 'midtrans') {
      const paymentUrl = await generateMidtransPayment(order);
      return res.json({
        success: true,
        paymentUrl,
        orderId: order.id,
      });
    }

    res.json({
      success: true,
      orderId: order.id,
      needPaymentConfirmation: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['name', 'price'],
          },
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      message: 'Berhasil mengambil data pesanan',
      data: orders,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil data pesanan' });
  }
};

const getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findOne({
      where: { id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details',
    });
  }
};

const getPublicOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findOne({
      where: { id },
      attributes: [
        'id',
        'status',
        'type',
        'no_meja',
        'payment_type',
        'is_paid',
        'total_price',
        'notes',
        'createdAt',
      ],
      include: [
        {
          model: OrderItem,
          as: 'items',
          attributes: ['id', 'quantity', 'subtotal'], // Hapus notes dari sini
          include: {
            model: Menu,
            attributes: ['id', 'name', 'price', 'imageUrl'],
          },
        },
      ],
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error('Error in getPublicOrderById:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: err.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const order = await Order.findByPk(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Validasi transisi status
    const validTransitions = {
      pending: ['processing'],
      processing: ['done'],
      done: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${order.status} to ${status}`,
      });
    }

    order.status = status;
    await order.save();

    res.json({
      success: true,
      data: order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
    });
  }
};

const confirmCashPayment = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.findByPk(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: 'Order tidak ditemukan' });
    }

    if (order.payment_type !== 'cash') {
      return res.status(400).json({
        success: false,
        message: 'Hanya pesanan cash yang bisa dikonfirmasi',
      });
    }

    order.is_paid = true;
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getReport = async (req, res) => {
  try {
    const { from, to, payment_type } = req.query;

    const where = {
      status: 'done',
      is_paid: true,
    };

    if (from && to) {
      where.createdAt = {
        [Op.between]: [new Date(from), new Date(to)],
      };
    }

    if (payment_type) {
      where.payment_type = payment_type;
    }

    const orders = await Order.findAll({ where });

    const total_income = orders.reduce((acc, o) => acc + o.total_price, 0);

    res.json({
      total_order: orders.length,
      total_income,
      orders,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Gagal mengambil laporan' });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getPublicOrderById,
  updateOrderStatus,
  confirmCashPayment,
  getReport,
};
