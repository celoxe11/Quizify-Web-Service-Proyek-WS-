const Joi = require("joi");
const { Quiz } = require("../../models");

// custom function to check if quiz_id exists in the database
const quizIdExist = async (value) => {
  const quizFound = await Quiz.findOne({ id: value.quiz_id });
  if (!quizFound) {
    throw new Error("Quiz ID tidak ditemukan");
  }
  return value;
};

const questionSchema = Joi.object({
  quiz_id: Joi.string().required().external(quizIdExist).messages({
    "any.required": "Quiz ID harus diisi",
    "string.empty": "Quiz ID tidak boleh kosong",
  }),
  category: Joi.string().required().messages({
    "any.required": "Category harus diisi",
    "string.empty": "Category tidak boleh kosong",
  }),
  type: Joi.string().valid("multiple", "boolean").required().messages({
    "any.required": "Type harus diisi",
    "string.empty": "Type tidak boleh kosong",
    "any.only": "Type harus berupa multiple atau boolean",
  }),
  difficulty: Joi.string().valid("easy", "medium", "hard").required().messages({
    "any.required": "Difficulty harus diisi",
    "string.empty": "Difficulty tidak boleh kosong",
    "any.only": "Difficulty harus berupa easy, medium, atau hard",
  }),
  question_text: Joi.string().required().messages({
    "any.required": "Question text harus diisi",
    "string.empty": "Question text tidak boleh kosong",
  }),
  correct_answer: Joi.string().required().messages({
    "any.required": "Correct answer harus diisi",
    "string.empty": "Correct answer tidak boleh kosong",
  }),
  incorrect_answers: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
      "any.required": "Incorrect answers harus diisi",
      "array.base": "Incorrect answers harus berupa array jawaban salah",
      "array.min": "Incorrect answers harus memiliki minimal 1 jawaban salah",
      "array.empty": "Incorrect answers tidak boleh kosong",
    }),
});

module.exports = questionSchema;
