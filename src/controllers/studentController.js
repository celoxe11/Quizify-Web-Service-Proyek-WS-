const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const doQuiz = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGenerateQuestion = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    doQuiz,
    getGenerateQuestion,
};