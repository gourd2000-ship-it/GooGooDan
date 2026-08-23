const { GoogleGenAI } = require('@google/genai');

// Google GenAI SDK Interactions API with inline audio:
// https://ai.google.dev/gemini-api/docs/audio#pass_audio_data_inline
const DEFAULT_GEMINI_MODEL = 'gemini-3.7-flash';

function createGeminiClient(apiKey) {
  return new GoogleGenAI({ apiKey });
}

function buildInteractionRequest({ prompt, audioData, mimeType, model = DEFAULT_GEMINI_MODEL }) {
  return {
    model,
    input: [
      { type: 'text', text: prompt },
      { type: 'audio', data: audioData, mime_type: mimeType },
    ],
  };
}

async function evaluateAudio(client, input) {
  const response = await client.interactions.create(buildInteractionRequest(input));
  if (!response || typeof response.output_text !== 'string' || !response.output_text.trim()) {
    throw new Error('Gemini Interactions API가 비어 있는 응답을 반환했습니다.');
  }
  return response.output_text;
}

module.exports = {
  DEFAULT_GEMINI_MODEL,
  buildInteractionRequest,
  createGeminiClient,
  evaluateAudio,
};
