const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const QuestionImage = sequelize.define("QuestionImage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  question_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "QuestionImage",
  timestamps: false,
});

module.exports = QuestionImage;
