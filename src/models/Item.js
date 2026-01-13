
const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const Item = sequelize.define('Item', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    // Menentukan jenis barang: apakah itu Subscription paket, Avatar, atau item biasa
    type: {
        type: DataTypes.ENUM('subscription', 'avatar', 'consumable'),
        allowNull: false,
        defaultValue: 'consumable'
    },
    // Jika tipe = subscription, isi dengan id_subs. Jika avatar, isi dengan avatar_id.
    // Ini opsional, berguna jika ingin menggabungkan semua jualan dalam satu tabel katalog "Item"
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    image_url: {
        type: DataTypes.TEXT,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    }
}, {
    tableName: "item",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
});

module.exports = Item;