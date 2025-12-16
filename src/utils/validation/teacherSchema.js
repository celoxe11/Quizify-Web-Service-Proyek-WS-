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

// Generate question schema for Gemini API
const generateQuestionSchema = Joi.object({
  type: Joi.string()
    .optional()
    .valid("multiple", "boolean")
    .default("multiple")
    .messages({
      "any.only": "Type harus berupa 'multiple' atau 'boolean'",
    }),
  difficulty: Joi.string()
    .optional()
    .valid("easy", "medium", "hard")
    .default("medium")
    .messages({
      "any.only": "Difficulty harus berupa 'easy', 'medium', atau 'hard'",
    }),
  category: Joi.string().optional().default("General Knowledge").messages({
    "string.base": "Kategori harus berupa string",
  }),
  topic: Joi.string().optional().allow("").default("").messages({
    "string.base": "Topik harus berupa string",
  }),
  language: Joi.string().optional().valid("id", "en").default("id").messages({
    "any.only": "Bahasa harus berupa 'id' (Indonesia) atau 'en' (English)",
  }),
  context: Joi.string().optional().allow("").default("").max(5000).messages({
    "string.base": "Konteks harus berupa string",
    "string.max": "Konteks maksimal 5000 karakter",
  }),
  age_group: Joi.string()
    .optional()
    .valid("SD", "SMP", "SMA", "Perguruan Tinggi")
    .default("SMA")
    .messages({
      "any.only":
        "Age group harus berupa 'SD', 'SMP', 'SMA', atau 'Perguruan Tinggi'",
    }),
  avoid_topics: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      "array.base": "Avoid topics harus berupa array string",
    }),
  include_explanation: Joi.boolean().optional().default(false).messages({
    "boolean.base": "Include explanation harus berupa boolean (true/false)",
  }),
  question_style: Joi.string()
    .optional()
    .valid("formal", "casual", "scenario-based")
    .default("formal")
    .messages({
      "any.only":
        "Question style harus berupa 'formal', 'casual', atau 'scenario-based'",
    }),
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
  incorrect_answers: Joi.array()
    .items(Joi.string())
    .min(1)
    .required()
    .messages({
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
