const express = require('express');

const { 
    doQuiz,
    getGenerateQuestion,
 } = require('../controllers/studentController');

 const { authenticate, isStudent } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/quiz',authenticate, isStudent, doQuiz);
router.get('/question/generate',authenticate, isStudent, getGenerateQuestion);   


module.exports = router;