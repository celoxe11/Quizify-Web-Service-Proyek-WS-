const axios = require("axios");

// This file contains the configuration for the Open Trivia Database API
const opentdb = axios.create({
  baseURL: "https://opentdb.com",
  timeout: 5000,
});

module.exports = opentdb;