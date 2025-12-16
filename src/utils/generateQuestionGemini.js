const axios = require("axios");
require("dotenv").config();

/**
 * Generate questions using Google Gemini API via REST
 * @param {Object} options - Generation options
 * @param {string} options.type - Question type: "multiple" or "boolean"
 * @param {string} options.difficulty - Difficulty level: "easy", "medium", "hard"
 * @param {string} options.category - General category of questions
 * @param {string} options.topic - Specific topic within the category
 * @param {string} options.language - Language for questions: "id" or "en" (default: "id")
 * @param {string} options.context - Context or learning material to base questions on
 * @param {string} options.age_group - Target age group: "SD", "SMP", "SMA", "Perguruan Tinggi"
 * @param {string[]} options.avoid_topics - Topics to avoid in questions
 * @param {boolean} options.include_explanation - Whether to include answer explanations
 * @param {string} options.question_style - Question style: "formal", "casual", "scenario-based"
 * @returns {Promise<Object>} Single generated question object in Question model format
 */
const generateQuestionGemini = async (options) => {
  try {
    const {
      type = "multiple",
      difficulty = "medium",
      category = "General Knowledge",
      topic = "",
      language = "id",
      context = "",
      age_group = "SMA",
      avoid_topics = [],
      include_explanation = false,
      question_style = "formal",
    } = options;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY tidak ditemukan di environment variables"
      );
    }

    // Build the prompt
    const prompt = buildPrompt({
      type,
      difficulty,
      category,
      topic,
      language,
      context,
      age_group,
      avoid_topics,
      include_explanation,
      question_style,
    });

    // Try different API versions and models (based on ListModels output)
    const apiConfigs = [
      { version: "v1", model: "gemini-2.0-flash-lite" }, // Fastest, lowest rate limits
      { version: "v1", model: "gemini-2.0-flash" },
      { version: "v1", model: "gemini-2.5-flash" },
      { version: "v1beta", model: "gemini-2.0-flash-lite" },
      { version: "v1beta", model: "gemini-2.0-flash" },
    ];

    let lastError = null;

    for (const config of apiConfigs) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`;

        console.log(`Trying: ${config.version}/${config.model}`);

        const response = await axios.post(
          apiUrl,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 4096,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        // Parse the response
        const generatedText = response.data.candidates[0].content.parts[0].text;

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("Response tidak mengandung JSON object yang valid");
        }

        const parsedQuestion = JSON.parse(jsonMatch[0]);

        // Format question to match Question model structure
        const formattedQuestion = formatQuestionToModel(
          parsedQuestion,
          type,
          difficulty,
          include_explanation
        );

        console.log(
          `Successfully generated using: ${config.version}/${config.model}`
        );
        return formattedQuestion;
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.log(`${config.version}/${config.model} failed: ${errorMsg}`);
        lastError = error;
        continue;
      }
    }

    // If all failed, throw the last error with more details
    const errorDetails =
      lastError?.response?.data?.error?.message || lastError?.message;
    throw new Error(`Semua model Gemini gagal. Detail: ${errorDetails}`);
  } catch (error) {
    console.error("Error generating questions with Gemini:", error.message);
    if (error.response) {
      console.error(
        "API Error Response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw new Error(`Gagal generate pertanyaan: ${error.message}`);
  }
};

/**
 * Build the prompt for Gemini API
 */
const buildPrompt = ({
  type,
  difficulty,
  category,
  topic,
  language,
  context,
  age_group,
  avoid_topics,
  include_explanation,
  question_style,
}) => {
  const languageText = language === "id" ? "Bahasa Indonesia" : "English";
  const typeText =
    type === "multiple"
      ? "pilihan ganda dengan 4 opsi jawaban"
      : "benar/salah (True/False)";

  const difficultyDescriptions = {
    easy: "mudah - pertanyaan dasar yang dapat dijawab dengan pengetahuan umum",
    medium: "sedang - pertanyaan yang memerlukan pemahaman konsep",
    hard: "sulit - pertanyaan yang memerlukan analisis mendalam dan pengetahuan detail",
  };

  const ageGroupDescriptions = {
    SD: "siswa Sekolah Dasar (6-12 tahun)",
    SMP: "siswa Sekolah Menengah Pertama (12-15 tahun)",
    SMA: "siswa Sekolah Menengah Atas (15-18 tahun)",
    "Perguruan Tinggi": "mahasiswa perguruan tinggi (18+ tahun)",
  };

  const styleDescriptions = {
    formal: "formal dan akademis",
    casual: "santai dan mudah dipahami",
    "scenario-based": "berbasis skenario atau studi kasus",
  };

  let prompt = `Kamu adalah seorang guru ahli yang membuat soal kuis berkualitas tinggi.

INSTRUKSI:
Buatkan 1 (SATU) soal kuis dengan kriteria berikut:

1. **Kategori**: ${category}${topic ? ` - Topik spesifik: ${topic}` : ""}
2. **Tipe Soal**: ${typeText}
3. **Tingkat Kesulitan**: ${difficultyDescriptions[difficulty]}
4. **Target Audience**: ${ageGroupDescriptions[age_group]}
5. **Bahasa**: ${languageText}
6. **Gaya Pertanyaan**: ${styleDescriptions[question_style]}
${
  avoid_topics.length > 0
    ? `7. **Hindari Topik**: ${avoid_topics.join(", ")}`
    : ""
}

${
  context
    ? `
KONTEKS/MATERI PEMBELAJARAN:
${context}

Buat pertanyaan berdasarkan konteks di atas.
`
    : ""
}

FORMAT RESPONS (JSON Object):
Kembalikan respons dalam format JSON object:
{
  "question_text": "Teks pertanyaan di sini",
  "correct_answer": "Jawaban yang benar",
  "incorrect_answers": ${
    type === "multiple"
      ? '["Jawaban salah 1", "Jawaban salah 2", "Jawaban salah 3"]'
      : '["Jawaban salah"]'
  }${
  include_explanation
    ? ',\n  "explanation": "Penjelasan mengapa jawaban tersebut benar"'
    : ""
}
}

ATURAN PENTING:
- Hanya generate TEPAT 1 soal
- Pastikan jawaban benar AKURAT dan dapat diverifikasi
- Jawaban salah harus masuk akal tapi jelas salah
- Pertanyaan harus jelas dan tidak ambigu
- ${
    type === "boolean"
      ? 'Untuk soal benar/salah, correct_answer harus "True" atau "False", dan incorrect_answers berisi kebalikannya'
      : "Untuk pilihan ganda, berikan tepat 3 jawaban salah yang berbeda"
  }

PENTING: Kembalikan HANYA JSON object, tanpa teks tambahan atau markdown code block.

Mulai generate 1 soal sekarang:`;

  return prompt;
};

/**
 * Format the generated question to match Question model structure
 */
const formatQuestionToModel = (
  question,
  type,
  difficulty,
  includeExplanation
) => {
  // Combine correct and incorrect answers, then shuffle
  const allOptions = [question.correct_answer, ...question.incorrect_answers];
  const shuffledOptions = shuffleArray(allOptions);

  const formattedQuestion = {
    type,
    difficulty,
    question_text: question.question_text,
    correct_answer: question.correct_answer,
    options: shuffledOptions,
    is_generated: true,
  };

  // Include explanation if requested
  if (includeExplanation && question.explanation) {
    formattedQuestion.explanation = question.explanation;
  }

  return formattedQuestion;
};

/**
 * Shuffle array using Fisher-Yates algorithm
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

module.exports = generateQuestionGemini;
