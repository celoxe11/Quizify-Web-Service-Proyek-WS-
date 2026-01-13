
const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const UserAvatar = sequelize.define("UserAvatar", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  avatar_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Tanggal beli
  purchased_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  tableName: "useravatar",
  timestamps: false,
});

module.exports = UserAvatar;