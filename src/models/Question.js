const { DataTypes } = require("sequelize");
const sequelize = require("../database/connection");

const Question = sequelize.define(
  "Question",
  {
    id: {
      type: DataTypes.STRING(10),
      primaryKey: true,
    },
    quiz_id: {
      type: DataTypes.STRING(10),
    },
    type: {
      type: DataTypes.ENUM("multiple", "boolean"),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      allowNull: false,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    correct_answer: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    options: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    is_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "question",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = Question;
