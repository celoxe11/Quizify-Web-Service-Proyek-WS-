
const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    current_avatar_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Boleh null jika user pakai foto default/kosong
    },
    firebase_uid: {
      type: DataTypes.STRING(128),
      allowNull: true,
      unique: true,
    },
    role: {
      type: DataTypes.ENUM("teacher", "student", "admin"),
      allowNull: false,
    },
    subscription_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    }
  },
  {
    tableName: "user",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);
module.exports = User;