import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

export type GeminiStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'AVAILABLE_HEALTHY' | 'DEGRADED';

interface GeminiState {
  status: GeminiStatus;
  lastError?: string;
  model: string;
  embeddingModel: string;
}

const state: GeminiState = {
  status: process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'NOT_CONFIGURED',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
};

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    state.status = 'NOT_CONFIGURED';
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({ apiKey });
      state.status = 'AVAILABLE_HEALTHY';
    } catch (err: any) {
      state.status = 'DEGRADED';
      state.lastError = err?.message || 'Failed to initialize GoogleGenAI client';
      return null;
    }
  }
  return aiClient;
}

export function getGeminiStatus(): GeminiState {
  if (!process.env.GEMINI_API_KEY) {
    state.status = 'NOT_CONFIGURED';
  } else if (!aiClient && state.status !== 'DEGRADED') {
    getAiClient();
  }
  return { ...state };
}

export function setGeminiDegraded(errorMsg: string) {
  state.status = 'DEGRADED';
  state.lastError = errorMsg;
}

export async function generateContentWithTimeout(
  prompt: string,
  systemInstruction?: string,
  timeoutMs: number = 5000
): Promise<string | null> {
  const client = getAiClient();
  if (!client) return null;

  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const fetchPromise = (async () => {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: systemInstruction ? { systemInstruction } : undefined,
      });
      return response.text || null;
    } catch (err: any) {
      const errorStr = String(err?.message || err);
      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        setGeminiDegraded('Quota exhausted / 429 rate limited');
      } else {
        setGeminiDegraded(errorStr);
      }
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

export async function generateStructuredContentWithTimeout<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  systemInstruction?: string,
  timeoutMs: number = 5000
): Promise<T | null> {
  const rawText = await generateContentWithTimeout(
    prompt + '\n\nIMPORTANT: Return ONLY a valid JSON object matching the requested schema. No markdown codeblocks, no explanations.',
    systemInstruction,
    timeoutMs
  );

  if (!rawText) return null;

  try {
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.substring(7);
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.substring(3);
    }
    if (cleanJson.endsWith('```')) {
      cleanJson = cleanJson.substring(0, cleanJson.length - 3);
    }
    cleanJson = cleanJson.trim();

    const parsed = JSON.parse(cleanJson);
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    } else {
      console.warn('[GeminiService] Zod validation failed for generated JSON:', validated.error.format());
      return null;
    }
  } catch (parseErr: any) {
    console.warn('[GeminiService] Failed to parse JSON from Gemini response:', parseErr?.message);
    return null;
  }
}

export async function embedTextWithTimeout(
  text: string,
  timeoutMs: number = 5000
): Promise<number[] | null> {
  const client = getAiClient();
  if (!client) return null;

  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';

  const embedPromise = (async () => {
    try {
      const response = await client.models.embedContent({
        model: embeddingModel,
        contents: text,
      });
      const resAny = response as any;
      if (resAny.embedding?.values && Array.isArray(resAny.embedding.values)) {
        return resAny.embedding.values;
      }
      if (resAny.embeddings?.[0]?.values && Array.isArray(resAny.embeddings[0].values)) {
        return resAny.embeddings[0].values;
      }
      return null;
    } catch (err: any) {
      const errorStr = String(err?.message || err);
      if (errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED')) {
        setGeminiDegraded('Embedding Quota exhausted / 429');
      } else {
        setGeminiDegraded(errorStr);
      }
      return null;
    }
  })();

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      resolve(null);
    }, timeoutMs);
  });

  return Promise.race([embedPromise, timeoutPromise]);
}
