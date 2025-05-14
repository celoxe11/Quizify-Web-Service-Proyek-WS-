const express = require('express');

const { 
    
 } = require('../controllers/adminController');

 const { authenticate, isAdmin, cekLogin } = require('../middleware/authMiddleware');

const router = express.Router();
router.post('/insert',authenticate, isAdmin,cekLogin, newMenu);
router.post('/restock',authenticate, isAdmin,cekLogin, restock);

module.exports = router;