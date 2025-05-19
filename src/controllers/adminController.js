const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const LogAccess = require("../models/LogUser");
const Subscription = require("../models/Subscription");


const getLog = async (req, res) => {
  const { user_id, action_type, endpoint } = req.body || {};

  try {
    // Buat objek filter dinamis
    const filter = {};
    if (user_id) filter.user_id = user_id;
    if (action_type) filter.action_type = action_type;
    if (endpoint) filter.endpoint = endpoint;

    console.log(filter);
    // Ambil log sesuai filter
    const logs = await LogAccess.findAll({
      where: filter,
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addToken = async (req, res) => {

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSubsList = async (req, res) => {

    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTierList = async (req, res) => {
    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTierList = async (req, res) => {
    try {
        
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getLog,
    addToken,
    getSubsList,
    createTierList,
    getTierList,
};