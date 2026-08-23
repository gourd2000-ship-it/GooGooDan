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

test('validateExpectedAnswers: JSON 문자열 및 배열 데이터를 안전하게 배열로 변환하고 필터링해야 함', () => {
  const rawInput = JSON.stringify(["2 x 1", "2 x 2", "invalid<script>"]);
  const validated = validateExpectedAnswers(rawInput);
  assert.strictEqual(validated.length, 2);
  assert.strictEqual(validated[0], "2 x 1");
  assert.strictEqual(validated[1], "2 x 2");
});
