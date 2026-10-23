/**
 * Backwards-compatibility bridge for promptFixer
 */
export * from "./promptFixer";
import { fixPrompt, analyzePrompt, type FixOptions, type FixResult } from "./promptFixer";

export const healPrompt = fixPrompt;
export const analyzePromptHealth = analyzePrompt;
export type HealOptions = FixOptions;
export type HealResult = FixResult;
