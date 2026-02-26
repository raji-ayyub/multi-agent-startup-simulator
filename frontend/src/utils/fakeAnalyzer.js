// src/utils/fakeAnalyzer.js

export function generateFakeAnalysis(fileName) {
  const randomScore = () => Math.floor(Math.random() * 40) + 60;

  return {
    employee_name: fileName.replace(/\.(pdf|docx?|txt)$/i, ""),
    technical_skills: ["React", "Node.js", "SQL", "REST APIs"],
    soft_skills: ["Leadership", "Communication", "Problem Solving"],
    skill_score: randomScore(),
    leadership_score: randomScore(),
    promotion_readiness: randomScore(),
    recommended_role: "Senior Software Engineer",
    training_recommendations: [
      "Advanced System Design",
      "Cloud Architecture (AWS)",
      "Leadership Development Program",
    ],
  };
}
