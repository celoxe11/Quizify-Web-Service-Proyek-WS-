const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const createQuiz = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createQuestion = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateQuestion = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const generateQuestion = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteQuestion = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getQuiz = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const startQuiz = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateQuizSession = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getAccuration = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createQuiz,
    createQuestion,
    updateQuestion,
    generateQuestion,
    deleteQuestion,
    getQuiz,
    startQuiz,
    updateQuizSession,
    getAccuration,
};