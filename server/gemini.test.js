const test = require('node:test');
const assert = require('node:assert');
const { buildInteractionRequest, evaluateAudio } = require('./gemini');

test('buildInteractionRequest: 최신 Flash 모델에 텍스트와 인라인 오디오를 전달해야 함', () => {
  const request = buildInteractionRequest({
    prompt: '오디오를 채점해 주세요.',
    audioData: 'YWJj',
    mimeType: 'audio/webm',
  });

  assert.deepStrictEqual(request, {
    model: 'gemini-3.7-flash',
    input: [
      { type: 'text', text: '오디오를 채점해 주세요.' },
      { type: 'audio', data: 'YWJj', mime_type: 'audio/webm' },
    ],
  });
});

test('evaluateAudio: Interactions API의 output_text를 반환해야 함', async () => {
  let capturedRequest;
  const client = {
    interactions: {
      create: async (request) => {
        capturedRequest = request;
        return { output_text: '{"results": []}' };
      },
    },
  };

  const responseText = await evaluateAudio(client, {
    prompt: '채점',
    audioData: 'YWJj',
    mimeType: 'audio/webm',
  });

  assert.strictEqual(responseText, '{"results": []}');
  assert.strictEqual(capturedRequest.model, 'gemini-3.7-flash');
});
