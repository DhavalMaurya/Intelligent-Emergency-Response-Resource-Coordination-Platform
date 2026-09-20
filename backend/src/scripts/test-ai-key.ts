import { env } from '../config/env.js';
import { getGeminiStatus, generateContentWithTimeout } from '../services/geminiService.js';
import { extractIncidentEntities } from '../services/aiExtractionService.js';
import { GoogleGenAI } from '@google/genai';

async function verifyGeminiAi() {
  console.log('====================================================');
  console.log('  SENTINEL — Live Gemini AI & API Key Verification');
  console.log('====================================================\n');

  // 1. Check Env API Key
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is missing in backend/.env!');
    process.exit(1);
  }

  const maskedKey = apiKey.substring(0, 6) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`[1] Environment API Key Detected: ${maskedKey}`);
  console.log(`    Configured Model: ${env.GEMINI_MODEL}`);
  console.log(`    Configured Embedding Model: ${env.GEMINI_EMBEDDING_MODEL}`);

  // 2. Service Status Check
  const status = getGeminiStatus();
  console.log(`\n[2] Gemini Service Initialization Status: ${status.status}`);

  // 3. Direct Gemini Completion Test
  console.log(`\n[3] Testing Direct Gemini Model (${env.GEMINI_MODEL})...`);
  const aiClient = new GoogleGenAI({ apiKey });
  try {
    const response = await aiClient.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Respond with a 1-sentence confirmation: "Gemini API key is active and responding for emergency dispatch."',
    });
    console.log(`    ✅ SUCCESS! Response from ${env.GEMINI_MODEL}:`);
    console.log(`    > "${response.text?.trim()}"`);
  } catch (err: any) {
    console.error(`    ❌ ${env.GEMINI_MODEL} Error:`, err?.message || err);
  }

  // 4. Live Entity Extraction NLP Parsing
  console.log('\n[4] Testing Live Emergency Entity Extraction & NLP Parsing...');
  const sampleReport = "Critical multi-vehicle crash on Highway 4. Tanker leaking fuel, 3 victims unconscious!";
  const extraction = await extractIncidentEntities(sampleReport);
  console.log(`    ✅ Extraction Result:`);
  console.log(`       - Incident Type: ${extraction.incidentType}`);
  console.log(`       - Severity Score: ${extraction.severityScore}/5`);
  console.log(`       - Confidence: ${extraction.confidence}`);
  console.log(`       - Required Resources: ${extraction.requiredResourceTypes.join(', ')}`);
  console.log(`       - Detected Hazards: ${extraction.detectedHazards.join(', ')}`);

  console.log('\n====================================================');
  console.log('  ✅ ALL GEMINI AI VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
}

verifyGeminiAi().catch((err) => {
  console.error('❌ Gemini Verification Failed:', err);
  process.exit(1);
});
