import { embedTextWithTimeout } from './geminiService.js';

/**
 * Calculates Cosine Similarity between two N-dimensional numerical vectors.
 * Returns a value between -1.0 and 1.0 (clamped to 0.0 to 1.0 for similarity).
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;

  const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1.0, sim));
}

/**
 * Converts Cosine Vector Similarity (0.0 - 1.0) to Semantic Embedding Points (0 - 12.5).
 */
export function cosineToSemanticPoints(cosineSim: number): number {
  return Math.round(cosineSim * 12.5);
}

/**
 * Generates a 768-dimension vector embedding for text using text-embedding-004 (or configured Gemini model).
 */
export async function generateTextEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length === 0) return null;
  return embedTextWithTimeout(text, 5000);
}
