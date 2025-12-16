/**
 * Debug script to list all available Gemini models
 * Run with: node src/utils/debugGeminiModels.js
 */

const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const listGeminiModels = async () => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  let output = "";

  const log = (msg) => {
    console.log(msg);
    output += msg + "\n";
  };

  if (!GEMINI_API_KEY) {
    log("ERROR: GEMINI_API_KEY tidak ditemukan di .env file");
    return;
  }

  log("Mencari model Gemini yang tersedia...");
  log("API Key (first 10 chars): " + GEMINI_API_KEY.substring(0, 10) + "...");
  log("API Key length: " + GEMINI_API_KEY.length);
  log("");

  // Try both API versions
  const apiVersions = ["v1", "v1beta"];

  for (const version of apiVersions) {
    log("=== API version: " + version + " ===");

    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/${version}/models?key=${GEMINI_API_KEY}`,
        { timeout: 15000 }
      );

      const models = response.data.models || [];

      if (models.length === 0) {
        log("Tidak ada model yang ditemukan");
        continue;
      }

      log("Ditemukan " + models.length + " model total");
      log("");

      // Filter models that support generateContent
      const generateContentModels = models.filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent")
      );

      log(
        "Model yang support generateContent (" +
          generateContentModels.length +
          "):"
      );
      generateContentModels.forEach((model, index) => {
        // Extract just the model name (e.g., "gemini-1.5-flash" from "models/gemini-1.5-flash")
        const modelName = model.name.replace("models/", "");
        log("  " + (index + 1) + ". " + modelName);
      });
      log("");
    } catch (error) {
      log("Error: " + (error.response?.data?.error?.message || error.message));
    }
  }

  log("=== Debug selesai! ===");

  // Save to file
  fs.writeFileSync("gemini_models_output.txt", output);
  console.log("\nOutput saved to: gemini_models_output.txt");
};

listGeminiModels();
