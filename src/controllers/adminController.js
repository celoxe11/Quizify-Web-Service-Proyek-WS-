const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");

const newMenu = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubsList = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTierList = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTierList = async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
module.exports = {
    newMenu,
    getSubsList,
    createTierList,
    getTierList,
};