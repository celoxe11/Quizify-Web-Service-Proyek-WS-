const Joi = require("joi");
const { Quiz } = require("../../models");

const quizIdExist = async (value) => {
  const quizFound = await Quiz.findOne({ id: value.quiz_id });
  if (!quizFound) {
    throw new Error("Quiz ID tidak ditemukan");
  }
  return value;
};

const generateQuestionSchema = Joi.object({
    quiz_id: Joi.string().required().external(quizIdExist).messages({
        "any.required": "Quiz ID harus diisi",
        "string.empty": "Quiz ID tidak boleh kosong",
    }),
    amount: Joi.number().integer().min(1).required().messages({
        "any.required": "Jumlah soal harus diisi",
        "number.base": "Jumlah soal harus berupa angka",
        "number.integer": "Jumlah soal harus berupa angka bulat",
        "number.min": "Jumlah soal minimal 1",
    }),
})

module.exports = questionSchema;