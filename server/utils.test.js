const test = require('node:test');
const assert = require('node:assert');
const { parseGeminiJson, validateExpectedAnswers } = require('./utils');

test('parseGeminiJson: 마크다운 코드 블록이 포함되어 있어도 정상 파싱되어야 함', () => {
  const input = "```json\n{\n  \"results\": [\n    { \"question\": \"2 x 1\", \"expected\": \"2\", \"spoken\": \"이\", \"isCorrect\": true }\n  ],\n  \"totalCorrect\": 1,\n  \"feedback\": \"참 잘했어요!\"\n}\n```";
  const result = parseGeminiJson(input);
  assert.strictEqual(result.totalCorrect, 1);
  assert.strictEqual(result.results.length, 1);
});

test('parseGeminiJson: 코드 블록 앞뒤로 추가 텍스트가 섞여 있어도 JSON만 추출하여 파싱되어야 함', () => {
  const input = `선생님의 채점 결과입니다:
  {
    "results": [],
    "totalCorrect": 0,
    "feedback": "다시 말해볼까요?"
  }
  이상입니다!`;
  const result = parseGeminiJson(input);
  assert.strictEqual(result.totalCorrect, 0);
  assert.strictEqual(result.feedback, "다시 말해볼까요?");
});

test('validateExpectedAnswers: 다양한 구구단 곱하기 표현(x, X, *) 및 공백 형태를 유연하게 지원해야 함', () => {
  const rawInput = JSON.stringify(["2 x 1", "2x2", "3 X 4", "5 * 6", "invalid<script>"]);
  const validated = validateExpectedAnswers(rawInput);
  assert.strictEqual(validated.length, 4);
  assert.strictEqual(validated[0], "2 x 1");
  assert.strictEqual(validated[1], "2 x 2");
  assert.strictEqual(validated[2], "3 x 4");
  assert.strictEqual(validated[3], "5 x 6");
});

test('cleanMimeType: 파라미터가 포함된 MIME 타임을 Gemini 지원 표준 포맷으로 정제해야 함', () => {
  const { cleanMimeType } = require('./utils');
  assert.strictEqual(cleanMimeType('audio/webm;codecs=opus'), 'audio/webm');
  assert.strictEqual(cleanMimeType('audio/mp4;codecs=mp4a.40.2'), 'audio/mp4');
  assert.strictEqual(cleanMimeType('audio/ogg;codecs=vorbis'), 'audio/ogg');
  assert.strictEqual(cleanMimeType(''), 'audio/webm');
});

test('parseGeminiJson: results 필드가 누락된 잘못된 구조 수신 시 안전하게 기본 규격으로 보정되어야 함', () => {
  const input = JSON.stringify({ message: "잘 안 들려요" });
  const result = parseGeminiJson(input);
  assert.ok(Array.isArray(result.results));
  assert.strictEqual(result.totalCorrect, 0);
});

test('getGeminiApiKey: 환경변수 또는 fallback 키를 정상 추출해야 함', () => {
  const { getGeminiApiKey } = require('./utils');
  const key = getGeminiApiKey();
  assert.ok(typeof key === 'string');
  assert.ok(key.length > 0);
});

test('validateAudioFile: 업로드된 오디오 파일의 유효성을 정밀 검증해야 함', () => {
  const { validateAudioFile } = require('./utils');
  assert.strictEqual(validateAudioFile(null).valid, false);
  assert.strictEqual(validateAudioFile({ size: 0 }).valid, false);
  assert.strictEqual(validateAudioFile({ size: 500, buffer: Buffer.from('test') }).valid, true);
});
