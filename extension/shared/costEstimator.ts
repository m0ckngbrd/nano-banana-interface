/**
 * Cost estimation utilities for Gemini 3 Pro Image Preview API
 * Based on official pricing: https://ai.google.dev/gemini-api/docs/pricing
 * 
 * Pricing as of Dec 2025:
 * - Text input: $2.00 per 1M tokens
 * - Text output: $12.00 per 1M tokens  
 * - Image output: $120.00 per 1M tokens
 * - 1K/2K images: 1,120 tokens = $0.134 per image
 * - 4K images: 2,000 tokens = $0.24 per image
 */

export interface CostBreakdown {
  textInputCost: number;
  imageOutputCost: number;
  totalCost: number;
  textTokens: number;
  imageTokens: number;
}

// Pricing constants (per 1M tokens)
const PRICING = {
  TEXT_INPUT_PER_1M: 2.0,
  TEXT_OUTPUT_PER_1M: 12.0,
  IMAGE_OUTPUT_PER_1M: 120.0,
} as const;

// Image token consumption by resolution
const IMAGE_TOKENS = {
  '1K': 1120,
  '2K': 1120,
  '4K': 2000,
} as const;

/**
 * Estimates token count for text using character-based approximation
 * Rule of thumb: 1 token ≈ 4 characters
 * This is a conservative estimate; actual tokenization may vary
 */
export function estimateTextTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  // Remove excessive whitespace for more accurate estimation
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return Math.ceil(normalizedText.length / 4);
}

/**
 * Calculates the cost breakdown for a generation request
 */
export function calculateCost(
  promptText: string,
  resolution: '1K' | '2K' | '4K'
): CostBreakdown {
  const textTokens = estimateTextTokens(promptText);
  const imageTokens = IMAGE_TOKENS[resolution];

  const textInputCost = (textTokens / 1_000_000) * PRICING.TEXT_INPUT_PER_1M;
  const imageOutputCost = (imageTokens / 1_000_000) * PRICING.IMAGE_OUTPUT_PER_1M;
  const totalCost = textInputCost + imageOutputCost;

  return {
    textInputCost,
    imageOutputCost,
    totalCost,
    textTokens,
    imageTokens,
  };
}

/**
 * Formats cost as a user-friendly string
 */
export function formatCost(cost: number): string {
  if (cost < 0.001) return '<$0.001';
  if (cost < 0.01) return `~$${cost.toFixed(3)}`;
  return `~$${cost.toFixed(2)}`;
}

/**
 * Gets a simple cost estimate string for display
 */
export function getCostEstimate(promptText: string, resolution: '1K' | '2K' | '4K'): string {
  const breakdown = calculateCost(promptText, resolution);
  return formatCost(breakdown.totalCost);
}

/**
 * Gets detailed cost breakdown for display
 */
export function getDetailedCostEstimate(
  promptText: string,
  resolution: '1K' | '2K' | '4K'
): string {
  const breakdown = calculateCost(promptText, resolution);
  const parts: string[] = [];
  
  if (breakdown.textTokens > 0) {
    parts.push(`${breakdown.textTokens} text tokens (${formatCost(breakdown.textInputCost)})`);
  }
  parts.push(`${breakdown.imageTokens} image tokens (${formatCost(breakdown.imageOutputCost)})`);
  
  return `${formatCost(breakdown.totalCost)} total\n${parts.join(' + ')}`;
}
