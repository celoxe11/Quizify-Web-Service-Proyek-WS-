const Joi = require("joi");
const { Quiz } = require("../../models");

const ensureArrayFormat = (value, helpers) => {
  if (Array.isArray(value)) {
    return value;
  }

  // If it's a string, try to parse it as JSON
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      // If it's a comma-separated string, split it
      return value.split(",").map((item) => item.trim());
    } catch (e) {
      // If JSON parsing fails, try splitting by comma
      return value.split(",").map((item) => item.trim());
    }
  }

  return helpers.error("array.base");
};

// Fix the quiz existence validation function
const quizExistAndByUser = async (value, helpers) => {
  try {
    // We can't access req.user here directly, so we'll just check if quiz exists
    const quizFound = await Quiz.findOne({
      where: {
        id: value,
      },
    });

    if (!quizFound) {
      throw new Error("Quiz tidak ditemukan");
    }

    return value;
  } catch (error) {
    throw new Error(error.message);
  }
};

const questionSchema = Joi.object({
  quiz_id: Joi.string().required().external(quizExistAndByUser).messages({
    "any.required": "Quiz ID harus diisi",
    "string.empty": "Quiz ID tidak boleh kosong",
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
  incorrect_answers: Joi.any().custom(ensureArrayFormat).messages({
    "any.required": "Incorrect answers harus diisi",
    "array.base": "Incorrect answers harus berupa array jawaban salah",
    "array.min": "Incorrect answers harus memiliki minimal 1 jawaban salah",
    "array.empty": "Incorrect answers tidak boleh kosong",
  }),
});

module.exports = questionSchema;
