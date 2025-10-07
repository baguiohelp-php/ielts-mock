import { z } from "zod";

export const CreateAttemptSchema = z.object({
  user_email: z.string().email(),
  test_id: z.string(),
  meta: z.any().optional()
});

export const ItemsQuerySchema = z.object({
  skill: z.string(),
  subtab: z.string()
});

export const SaveSkillSchema = z.object({
  attemptId: z.string(),
  skill: z.enum(["L","R","W"]),
  answers: z.array(z.object({ q_no: z.number(), response: z.string() }))
});

export const FinalizeSchema = z.object({
  attemptId: z.string(),
  endedBy: z.string(),
  subtabL: z.string().optional(),
  subtabR: z.string().optional()
});
