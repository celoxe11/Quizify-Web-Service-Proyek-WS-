const axios = require("axios");
const schema = require("../utils/validation/");
const { Quiz, Question } = require("../models");

// todo: cek kalau free user sudah membuat 1 kuis, kalau sudah maka tidak bisa membuat kuis lagi
const createQuiz = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || title === "") {
      return res.status(400).json({
        message: "Judul kuis tidak boleh kosong",
      });
    }

    let desc = "";
    if (description && description !== "") {
      desc = description;
    }

    const allQuiz = await Quiz.findAll();
    let id = "QU" + (allQuiz.length + 1).toString().padStart(3, "0");
    
    const created_by = req.user.id;
    const quiz = await Quiz.create({
      id,
      title,
      description: desc,
      created_by,
    });
    res.status(201).json({
      message: "Berhasil membuat kuis berjudul " + quiz.title,
      quiz_id: quiz.id,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateQuiz = async (req, res) => {
  
}

// todo: tambahkan multer buat upload image
// cek juga kalau free user sudah upload 3 image per hari
const createQuestion = async (req, res) => {
  try {
    const {
      quiz_id,
      type,
      category,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;
    console.log(schema);

    await schema.questionSchema.validateAsync(req.body, { abortEarly: false });

    const allQuestion = await Question.findAll();
    let id = "Q" + (allQuestion.length + 1).toString().padStart(3, "0");

    const question = await Question.create({
      id,
      quiz_id,
      category,
      type,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers, // Changed from incorrect_answer to incorrect_answers
      is_generated: 0,
    });

    res.status(201).json({
      message: "Berhasil membuat pertanyaan",
      question
    });
  } catch (error) {
    if (error.isJoi) {
      return res
        .status(400)
        .json({ errors: error.details.map((err) => err.message) });
    }
    res.status(500).json({ message: error.message });
  }
};

// todo: tambahkan multer buat upload image
// cek juga kalau free user sudah upload 3 image per hari
const updateQuestion = async (req, res) => {
  try {
    const {
      question_id,
      quiz_id,
      type,
      category,
      difficulty,
      question_text,
      correct_answer,
      incorrect_answers,
    } = req.body;

    await schema.updateQuestionSchema.validateAsync(req.body, {
      abortEarly: false,
    });

    const question = await Question.update(
      {
        quiz_id,
        category,
        type,
        difficulty,
        question_text,
        correct_answer,
        incorrect_answers,
        is_generated: 0,
      },
      {
        where: {
          id: question_id,
        },
      }
    );

    return res.status(200).json({
      message: "Berhasil memperbarui pertanyaan",
      question
    });
  } catch (error) {
    if (error.isJoi) {
      return res
        .status(400)
        .json({ errors: error.details.map((err) => err.message) });
    }
    res.status(500).json({ message: error.message });
  }
};

const generateQuestion = async (req, res) => {
  try {
    const {quiz_id, amount} = req.body;

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteQuestion = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsersQuiz = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getQuizDetail = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startQuiz = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endQuiz = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizResult = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

const getStudentsAnswers = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuizAccuracy = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const subscribe = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const unsubscribe = async (req, res) => {
  try {
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuiz,
  updateQuiz,
  createQuestion,
  updateQuestion,
  generateQuestion,
  deleteQuestion,
  getUsersQuiz,
  getQuizDetail,
  startQuiz,
  endQuiz,
  getQuizResult,
  getStudentsAnswers,
  getQuizAccuracy,
  subscribe,
  unsubscribe,
};
