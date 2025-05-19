const express = require('express');

const { 
    getLog,
    getSubsList,
    createTierList,
    getTierList,
    addToken
 } = require('../controllers/adminController');

 const { authenticate, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/logaccess', getLog); 
router.get('/token',authenticate, isAdmin, addToken);
router.get('/users',authenticate, isAdmin, getSubsList);
router.post('/tierlist',authenticate, isAdmin, createTierList);
router.get('/tierlist',authenticate, isAdmin, getTierList);

module.exports = router;