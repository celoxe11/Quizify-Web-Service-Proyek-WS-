const axios = require("axios");
require("dotenv").config();

/**
 * Evaluate student's answer using Google Gemini API
 * @param {string} question_text - The question text
 * @param {string} correct_answer - The correct answer
 * @param {string} user_answer - The student's answer
 * @param {Object} options - Optional evaluation parameters
 * @param {string} options.language - Language for feedback: "id" or "en" (default: "id")
 * @param {boolean} options.detailed_feedback - Whether to provide detailed feedback (default: true)
 * @param {string} options.question_type - Type of question: "multiple", "boolean", "essay" (default: "multiple")
 * @returns {Promise<Object>} Evaluation result with score, is_correct, and feedback
 */
const fetchGeminiEvaluation = async (
  question_text,
  correct_answer,
  user_answer,
  options = {}
) => {
  try {
    const {
      language = "id",
      detailed_feedback = true,
      question_type = "multiple",
    } = options;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY tidak ditemukan di environment variables"
      );
    }

    // Build the evaluation prompt
    const prompt = buildEvaluationPrompt({
      question_text,
      correct_answer,
      user_answer,
      language,
      detailed_feedback,
      question_type,
    });

    // Try different API versions and models (same as generateQuestionGemini)
    const apiConfigs = [
      { version: "v1", model: "gemini-2.0-flash-lite" },
      { version: "v1", model: "gemini-2.0-flash" },
      { version: "v1", model: "gemini-2.5-flash" },
      { version: "v1beta", model: "gemini-2.0-flash-lite" },
      { version: "v1beta", model: "gemini-2.0-flash" },
    ];

    let lastError = null;

    for (const config of apiConfigs) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/${config.version}/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`;

        console.log(`Evaluating with: ${config.version}/${config.model}`);

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
              temperature: 0.3, // Lower temperature for more consistent evaluation
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
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

        const evaluationResult = JSON.parse(jsonMatch[0]);

        // Format and validate the evaluation result
        const formattedResult = formatEvaluationResult(
          evaluationResult,
          question_type
        );

        console.log(
          `Successfully evaluated using: ${config.version}/${config.model}`
        );
        return formattedResult;
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
    console.error("Error evaluating answer with Gemini:", error.message);
    if (error.response) {
      console.error(
        "API Error Response:",
        JSON.stringify(error.response.data, null, 2)
      );
    }
    throw new Error(`Gagal evaluasi jawaban: ${error.message}`);
  }
};

/**
 * Build the evaluation prompt for Gemini API
 */
const buildEvaluationPrompt = ({
  question_text,
  correct_answer,
  user_answer,
  language,
  detailed_feedback,
  question_type,
}) => {
  const languageText = language === "id" ? "Bahasa Indonesia" : "English";

  const questionTypeDescriptions = {
    multiple: "pilihan ganda",
    boolean: "benar/salah",
    essay: "esai/uraian",
  };

  let prompt = `Kamu adalah seorang guru ahli yang mengevaluasi jawaban siswa dengan objektif dan adil.

TUGAS:
Evaluasi jawaban siswa untuk pertanyaan berikut:

**Pertanyaan**: ${question_text}

**Tipe Soal**: ${questionTypeDescriptions[question_type] || "pilihan ganda"}

**Jawaban yang Benar**: ${correct_answer}

**Jawaban Siswa**: ${user_answer || "(Tidak dijawab)"}

KRITERIA EVALUASI:
1. **Untuk soal pilihan ganda/benar-salah**: 
   - Jawaban harus PERSIS sama dengan jawaban yang benar (case-insensitive)
   - Jika benar: score = 100, is_correct = true
   - Jika salah atau tidak dijawab: score = 0, is_correct = false

2. **Untuk soal esai**:
   - Evaluasi berdasarkan keakuratan konsep, kelengkapan, dan relevansi
   - Score: 0-100 (0 = sangat salah, 50 = sebagian benar, 100 = sempurna)
   - is_correct = true jika score >= 70

3. **Feedback**:
   - Jika jawaban benar: berikan pujian singkat dan konfirmasi
   - Jika jawaban salah: jelaskan mengapa salah dan berikan penjelasan yang benar
   - Jika tidak dijawab: berikan motivasi dan penjelasan jawaban yang benar
   ${
     detailed_feedback
       ? "- Berikan penjelasan detail dan edukatif"
       : "- Berikan feedback singkat"
   }

**Bahasa Feedback**: ${languageText}

FORMAT RESPONS (JSON Object):
Kembalikan respons dalam format JSON object:
{
  "is_correct": true atau false,
  "score": angka 0-100,
  "feedback": "Feedback untuk siswa dalam ${languageText}",
  "analysis": {
    "correctness": "Deskripsi singkat tentang kebenaran jawaban",
    "key_points_missed": ["Poin penting yang terlewat (jika ada)"],
    "strengths": ["Kekuatan dari jawaban siswa (jika ada)"]
  }
}

ATURAN PENTING:
- Evaluasi harus objektif dan konsisten
- Feedback harus konstruktif dan membantu pembelajaran
- Untuk pilihan ganda/benar-salah, perbandingan harus case-insensitive
- Jika jawaban kosong/null, is_correct = false dan score = 0
- Berikan feedback yang memotivasi siswa untuk belajar lebih baik

PENTING: Kembalikan HANYA JSON object, tanpa teks tambahan atau markdown code block.

Mulai evaluasi sekarang:`;

  return prompt;
};

/**
 * Format and validate the evaluation result
 */
const formatEvaluationResult = (result, question_type) => {
  // Ensure all required fields exist
  const formattedResult = {
    is_correct: Boolean(result.is_correct),
    score: Math.max(0, Math.min(100, Number(result.score) || 0)), // Clamp between 0-100
    feedback: result.feedback || "Tidak ada feedback tersedia",
    analysis: {
      correctness: result.analysis?.correctness || "",
      key_points_missed: Array.isArray(result.analysis?.key_points_missed)
        ? result.analysis.key_points_missed
        : [],
      strengths: Array.isArray(result.analysis?.strengths)
        ? result.analysis.strengths
        : [],
    },
  };

  // For multiple choice and boolean, ensure score is either 0 or 100
  if (question_type === "multiple" || question_type === "boolean") {
    formattedResult.score = formattedResult.is_correct ? 100 : 0;
  }

  return formattedResult;
};

module.exports = fetchGeminiEvaluation;
