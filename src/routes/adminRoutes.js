const express = require('express');

const { 
    newMenu,
    getSubsList,
    createTierList,
    getTierList,
 } = require('../controllers/adminController');

 const { authenticate, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/logaccess',authenticate, isAdmin, newMenu);
router.get('/users',authenticate, isAdmin, getSubsList);
router.post('/tierlist',authenticate, isAdmin, createTierList);
router.get('/tierlist',authenticate, isAdmin, getTierList);

module.exports = router;