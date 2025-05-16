const express = require('express');

const { 
    createQuiz,
    createQuestion,
    updateQuestion,
    generateQuestion,
    deleteQuestion,
    getQuiz,
    startQuiz,
    updateQuizSession,
    getAccuration,
 } = require('../controllers/teacherController');

const { authenticate, isTeacher } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/quiz',authenticate, isTeacher, createQuiz);
router.post('/question',authenticate, isTeacher, createQuestion);
router.put('/question',authenticate, isTeacher, updateQuestion);
router.post('/generatequestion',authenticate, isTeacher, generateQuestion);
router.delete('/question/:quiz_id',authenticate, isTeacher, deleteQuestion);
router.get('/myquiz',authenticate, isTeacher, getQuiz);
router.post('/startquiz/:quiz_id',authenticate, isTeacher, startQuiz);
router.put('/quiz',authenticate, isTeacher, updateQuizSession);
router.get('/question/accuracy/:question_id',authenticate, isTeacher, getAccuration);

module.exports = router;