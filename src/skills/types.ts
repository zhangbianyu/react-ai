import { z } from "zod";

export type SkillName = "explainConcept" | "summarizeDocument" | "generateQuiz";

export type SkillDefinition = {
  name: SkillName;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
  outputName: string;
  instructions: string;
  allowedTools: string[];
};
