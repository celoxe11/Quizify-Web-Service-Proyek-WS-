const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const doQuiz = async (req, res) => {
   try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGenerateQuestion = async (req, res) => {
    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    doQuiz,
    getGenerateQuestion,
};