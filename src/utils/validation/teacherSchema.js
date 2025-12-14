const Joi = require("joi");

// Quiz schemas
const quizCreateSchema = Joi.object({
  title: Joi.string().required().messages({
    "any.required": "Judul kuis tidak boleh kosong",
    "string.empty": "Judul kuis tidak boleh kosong",
  }),
  description: Joi.string().allow("").optional(),
  quiz_code: Joi.string().max(20).optional().messages({
    "string.max": "Kode kuis tidak boleh lebih dari 20 karakter",
  }),
});

const quizUpdateSchema = Joi.object({
  quiz_id: Joi.string().required().messages({
    "any.required": "Quiz ID tidak boleh kosong",
    "string.empty": "Quiz ID tidak boleh kosong",
  }),
  title: Joi.string().required().messages({
    "any.required": "Judul kuis tidak boleh kosong",
    "string.empty": "Judul kuis tidak boleh kosong",
  }),
  description: Joi.string().allow("").optional(),
  quiz_code: Joi.string().max(20).optional().messages({
    "string.max": "Kode kuis tidak boleh lebih dari 20 karakter",
  }),
});

// ID validation
const idSchema = Joi.object({
  id: Joi.string().required().messages({
    "any.required": "ID tidak boleh kosong",
    "string.empty": "ID tidak boleh kosong",
  }),
});

// Generate question schema
const generateQuestionSchema = Joi.object({
  quiz_id: Joi.string().required().messages({
    "any.required": "Quiz ID tidak boleh kosong",
    "string.empty": "Quiz ID tidak boleh kosong",
  }),
  type: Joi.string().optional(),
  difficulty: Joi.string().optional(),
  category: Joi.number().optional(),
  amount: Joi.number().integer().min(1).max(50).default(10).optional(),
});

// Question schema for batch save
const questionItemSchema = Joi.object({
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
  incorrect_answers: Joi.array().items(Joi.string()).min(1).required().messages({
    "any.required": "Incorrect answers harus diisi",
    "array.base": "Incorrect answers harus berupa array jawaban salah",
    "array.min": "Incorrect answers harus memiliki minimal 1 jawaban salah",
  }),
});

// Save quiz with questions schema (handles both create and update)
const saveQuizWithQuestionsSchema = Joi.object({
  quiz_id: Joi.string().optional().messages({
    "string.empty": "Quiz ID tidak boleh kosong jika disertakan",
  }),
  title: Joi.string().required().messages({
    "any.required": "Judul kuis tidak boleh kosong",
    "string.empty": "Judul kuis tidak boleh kosong",
  }),
  description: Joi.string().allow("").optional(),
  quiz_code: Joi.string().max(20).allow("", null).optional().messages({
    "string.max": "Kode kuis tidak boleh lebih dari 20 karakter",
  }),
  questions: Joi.array().items(questionItemSchema).min(1).required().messages({
    "any.required": "Questions harus diisi",
    "array.base": "Questions harus berupa array",
    "array.min": "Questions harus memiliki minimal 1 pertanyaan",
  }),
});

module.exports = {
  quizCreateSchema,
  quizUpdateSchema,
  idSchema,
  generateQuestionSchema,
  saveQuizWithQuestionsSchema,
};
