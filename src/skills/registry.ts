import { explainConceptSkill } from "./explain";
import { summarizeDocumentSkill } from "./summarize";
import { generateQuizSkill } from "./quiz";

export const skillRegistry = {
  explainConcept: explainConceptSkill,
  summarizeDocument: summarizeDocumentSkill,
  generateQuiz: generateQuizSkill,
};
