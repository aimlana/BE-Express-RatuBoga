const { Cart, CartItem, Menu } = require('../models');

class CartController {
  static async getOrCreateUserCart(userId) {
    let cart = await Cart.findOne({ where: { userId } });

    if (!cart) {
      cart = await Cart.create({ userId });
    }

    return cart;
  }

  static async addItem(req, res) {
    try {
      const { userId } = req;
      const { menuId, quantity, notes } = req.body;

      const cart = await this.getOrCreateUserCart(userId);

      const [item, created] = await CartItem.findOrCreate({
        where: { cartId: cart.id, menuId },
        defaults: { quantity, notes },
      });

      if (!created) {
        item.quantity += quantity;
        if (notes) item.notes = notes;
        await item.save();
      }

      const result = await CartItem.findByPk(item.id, {
        include: [Menu],
      });

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Gagal menambahkan ke keranjang',
      });
    }
  }

  static async updateItem(req, res) {
    try {
      const { id } = req.params;
      const { quantity, notes } = req.body;

      const item = await CartItem.findByPk(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item tidak ditemukan',
        });
      }

      if (quantity) item.quantity = quantity;
      if (notes) item.notes = notes;

      await item.save();

      res.json({ success: true, data: item });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Gagal mengupdate keranjang',
      });
    }
  }

  static async removeItem(req, res) {
    try {
      const { id } = req.params;

      const item = await CartItem.findByPk(id);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item tidak ditemukan',
        });
      }

      await item.destroy();

      res.json({ success: true, message: 'Item dihapus dari keranjang' });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Gagal menghapus dari keranjang',
      });
    }
  }

  static async getUserCart(req, res) {
    try {
      const { userId } = req;

      const cart = await Cart.findOne({
        where: { userId },
        include: {
          model: CartItem,
          include: [Menu],
        },
      });

      res.json({ success: true, data: cart });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Gagal mengambil keranjang',
      });
    }
  }
}

module.exports = CartController;
