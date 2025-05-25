const parseIncorrectAnswers = (incorrectAnswers) => {
  if (!incorrectAnswers || typeof incorrectAnswers !== "string") {
    return incorrectAnswers;
  }

  try {
    if (incorrectAnswers.includes('\\"')) {
      const cleanString = incorrectAnswers.replace(/\\"/g, '"');
      return JSON.parse(cleanString);
    } else {
      return JSON.parse(incorrectAnswers);
    }
  } catch (e) {
    return incorrectAnswers.split(",").map((item) => item.trim());
  }
};

const checkQuizOwnership = async (Quiz, quizId, userId) => {
  const quiz = await Quiz.findOne({
    where: { id: quizId }
  });
  
  if (!quiz) {
    return { error: "Kuis tidak ditemukan", code: 404 };
  }
  
  if (quiz.created_by !== userId) {
    return { error: "Anda tidak punya akses untuk kuis ini", code: 403 };
  }
  
  return { quiz };
};

const formatImageUrl = (req, imagePath) => {
  if (!imagePath) return null;
  return `${req.protocol}://${req.get("host")}/api${imagePath}`;
};

module.exports = {
  parseIncorrectAnswers,
  checkQuizOwnership,
  formatImageUrl
};
