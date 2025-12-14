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

module.exports = {
  quizCreateSchema,
  quizUpdateSchema,
  idSchema,
  generateQuestionSchema,
};
