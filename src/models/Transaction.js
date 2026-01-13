
const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const Transaction = sequelize.define("Transaction", {
  id: {
    type: DataTypes.STRING(10), // Bisa pakai UUID atau string acak
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  // KITA UBAH JADI OPTIONAL (allowNull: true)
  subscription_id: {
    type: DataTypes.INTEGER,
    allowNull: true, 
  },
  // KITA TAMBAH KOLOM ITEM
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // UNTUK MEMBEDAKAN JENIS TRANSAKSI
  category: {
    type: DataTypes.ENUM('subscription', 'item'),
    allowNull: false,
    defaultValue: 'subscription'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed'),
    defaultValue: 'pending',
  },
  payment_method: {
    type: DataTypes.STRING(50),
  }
}, {
  tableName: "transaction",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Transaction;