const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const Quiz = sequelize.define(
  "Quiz",
  {
    id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    quiz_code: {
      type: DataTypes.STRING(20),
      unique: true,
    },
    category: {
      type: DataTypes.STRING(100),
    },
    status: {
      type: DataTypes.ENUM("public", "private"),
      defaultValue: "private",
    },
    created_by: {
      type: DataTypes.STRING(10),
    },
  },
  {
    tableName: "quiz",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Quiz;
