const Joi = require("joi");

// Quiz schemas
const quizCreateSchema = Joi.object({
  title: Joi.string().required().messages({
    "any.required": "Quiz title cannot be empty",
    "string.empty": "Quiz title cannot be empty",
  }),
  description: Joi.string().allow("").optional(),
  quiz_code: Joi.string().max(20).optional().messages({
    "string.max": "Quiz code cannot exceed 20 characters",
  }),
});

const quizUpdateSchema = Joi.object({
  quiz_id: Joi.string().required().messages({
    "any.required": "Quiz ID cannot be empty",
    "string.empty": "Quiz ID cannot be empty",
  }),
  title: Joi.string().required().messages({
    "any.required": "Quiz title cannot be empty",
    "string.empty": "Quiz title cannot be empty",
  }),
  description: Joi.string().allow("").optional(),
  quiz_code: Joi.string().max(20).optional().messages({
    "string.max": "Quiz code cannot exceed 20 characters",
  }),
});

// ID validation
const idSchema = Joi.object({
  id: Joi.string().required().messages({
    "any.required": "ID cannot be empty",
    "string.empty": "ID cannot be empty",
  }),
});

// Generate question schema for Gemini API
const generateQuestionSchema = Joi.object({
  type: Joi.string()
    .optional()
    .valid("multiple", "boolean")
    .default("multiple")
    .messages({
      "any.only": "Type must be 'multiple' or 'boolean'",
    }),
  difficulty: Joi.string()
    .optional()
    .valid("easy", "medium", "hard")
    .default("medium")
    .messages({
      "any.only": "Difficulty must be 'easy', 'medium', or 'hard'",
    }),
  category: Joi.string().optional().default("General Knowledge").messages({
    "string.base": "Category must be a string",
  }),
  topic: Joi.string().optional().allow("").default("").messages({
    "string.base": "Topic must be a string",
  }),
  language: Joi.string().optional().valid("id", "en").default("id").messages({
    "any.only": "Language must be 'id' (Indonesian) or 'en' (English)",
  }),
  context: Joi.string().optional().allow("").default("").max(5000).messages({
    "string.base": "Context must be a string",
    "string.max": "Context cannot exceed 5000 characters",
  }),
  age_group: Joi.string()
    .optional()
    .valid("SD", "SMP", "SMA", "Perguruan Tinggi")
    .default("SMA")
    .messages({
      "any.only": "Age group must be 'SD', 'SMP', 'SMA', or 'Perguruan Tinggi'",
    }),
  avoid_topics: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      "array.base": "Avoid topics must be an array of strings",
    }),
  include_explanation: Joi.boolean().optional().default(false).messages({
    "boolean.base": "Include explanation must be a boolean (true/false)",
  }),
  question_style: Joi.string()
    .optional()
    .valid("formal", "casual", "scenario-based")
    .default("formal")
    .messages({
      "any.only":
        "Question style must be 'formal', 'casual', or 'scenario-based'",
    }),
});

// Question schema for batch save
const questionItemSchema = Joi.object({
  type: Joi.string().valid("multiple", "boolean").required().messages({
    "any.required": "Type is required",
    "string.empty": "Type cannot be empty",
    "any.only": "Type must be 'multiple' or 'boolean'",
  }),
  difficulty: Joi.string().valid("easy", "medium", "hard").required().messages({
    "any.required": "Difficulty is required",
    "string.empty": "Difficulty cannot be empty",
    "any.only": "Difficulty must be 'easy', 'medium', or 'hard'",
  }),
  question_text: Joi.string().required().messages({
    "any.required": "Question text is required",
    "string.empty": "Question text cannot be empty",
  }),
  correct_answer: Joi.string().required().messages({
    "any.required": "Correct answer is required",
    "string.empty": "Correct answer cannot be empty",
  }),
  incorrect_answers: Joi.array().items(Joi.string()).required().messages({
    "any.required": "Incorrect answers are required",
    "array.base": "Incorrect answers must be an array of strings",
  }),
  question_image: Joi.string().optional().allow("", null).messages({
    "string.base": "Image base64 must be a string",
  }),
});

// Save quiz with questions schema (handles both create and update)
const saveQuizWithQuestionsSchema = Joi.object({
  quiz_id: Joi.string().optional().messages({
    "string.empty": "Quiz ID cannot be empty if provided",
  }),
  title: Joi.string().required().messages({
    "any.required": "Quiz title cannot be empty",
    "string.empty": "Quiz title cannot be empty",
  }),
  description: Joi.string().allow("").optional(),
  category: Joi.string().optional().allow("", null),
  status: Joi.string().optional().valid("public", "private").messages({
    "any.only": "Status must be 'public' or 'private'",
  }),
  quiz_code: Joi.string().max(20).allow("", null).optional().messages({
    "string.max": "Quiz code cannot exceed 20 characters",
  }),
  questions: Joi.array().items(questionItemSchema).min(1).required().messages({
    "any.required": "Questions is required",
    "array.base": "Questions must be an array",
    "array.min": "Questions must have at least 1 question",
  }),
});

module.exports = {
  quizCreateSchema,
  quizUpdateSchema,
  idSchema,
  generateQuestionSchema,
  saveQuizWithQuestionsSchema,
};
