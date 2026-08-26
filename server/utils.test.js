const test = require('node:test');
const assert = require('node:assert');
const {
  parseGeminiJson,
  validateExpectedAnswers,
  validateExpectedQuestions,
  normalizeEvaluation,
  getGeminiApiKey,
  getAllowedOrigins,
  validateAudioFile,
  MAX_AUDIO_SIZE_BYTES,
  validateTapRecord,
  validatePracticeType,
  calculateScore,
} = require('./utils');

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

test('getGeminiApiKey: GEMINI_API_KEY만 허용하고 클라이언트용 VITE 키 및 fallback은 무시해야 함', () => {
  assert.strictEqual(getGeminiApiKey({ GEMINI_API_KEY: '  server-key  ' }), 'server-key');
  assert.strictEqual(getGeminiApiKey({ VITE_GEMINI_API_KEY: 'public-key' }), '');
  assert.strictEqual(getGeminiApiKey({}), '');
});

test('getAllowedOrigins: 기본 Vercel 배포 도메인을 허용하고 환경변수의 복수 Origin을 지원해야 함', () => {
  assert.deepStrictEqual(getAllowedOrigins(), ['http://localhost:5173', 'https://goo-goo-dan.vercel.app']);
  assert.deepStrictEqual(
    getAllowedOrigins('https://preview.example.com, https://goo-goo-dan.vercel.app'),
    ['https://preview.example.com', 'https://goo-goo-dan.vercel.app'],
  );
});

test('validateExpectedQuestions: 선택한 단과 모드에 맞는 정확히 10개 문제만 허용해야 함', () => {
  const sequential = JSON.stringify(Array.from({ length: 10 }, (_, index) => `3 x ${index + 1}`));
  assert.deepStrictEqual(validateExpectedQuestions(3, 'sequential', sequential), JSON.parse(sequential));
  assert.strictEqual(validateExpectedQuestions(3, 'sequential', JSON.stringify(['3 x 1'])), null);
  assert.strictEqual(validateExpectedQuestions(3, 'sequential', JSON.stringify([...JSON.parse(sequential), '3 x 11'])), null);
  assert.strictEqual(validateExpectedQuestions(3, 'sequential', JSON.stringify(['4 x 1', '3 x 2', '3 x 3', '3 x 4', '3 x 5', '3 x 6', '3 x 7', '3 x 8', '3 x 9', '3 x 10'])), null);
});

test('validateExpectedQuestions: 랜덤 모드는 선택한 단의 1~10을 중복 없이 포함해야 함', () => {
  const random = JSON.stringify(['8 x 4', '8 x 1', '8 x 10', '8 x 2', '8 x 5', '8 x 8', '8 x 3', '8 x 6', '8 x 9', '8 x 7']);
  assert.ok(validateExpectedQuestions(8, 'random', random));
  assert.strictEqual(validateExpectedQuestions(8, 'random', JSON.stringify(['8 x 1', '8 x 1', '8 x 2', '8 x 3', '8 x 4', '8 x 5', '8 x 6', '8 x 7', '8 x 8', '8 x 9'])), null);
});

test('normalizeEvaluation: AI가 누락하거나 부정확한 문제·총점을 보내도 10문제와 서버 계산 정답 수를 반환해야 함', () => {
  const questions = Array.from({ length: 10 }, (_, index) => `4 x ${index + 1}`);
  const normalized = normalizeEvaluation({
    results: [{ question: '9 x 9', expected: '81', spoken: '4', isCorrect: true }],
    totalCorrect: 999,
    feedback: '잘했어요!',
  }, questions);

  assert.strictEqual(normalized.results.length, 10);
  assert.deepStrictEqual(normalized.results[0], { question: '4 x 1', expected: '4', spoken: '4', isCorrect: true });
  assert.deepStrictEqual(normalized.results[1], { question: '4 x 2', expected: '8', spoken: '', isCorrect: false });
  assert.strictEqual(normalized.totalCorrect, 1);
});

test('normalizeEvaluation: AI가 정답이라고 해도 알아들을 수 없는 발화는 오답으로 처리해야 함', () => {
  const normalized = normalizeEvaluation({
    results: [{ spoken: '음... 어...', isCorrect: true }],
    totalCorrect: 1,
    feedback: '잘했어요!',
  }, ['4 x 1']);

  assert.deepStrictEqual(normalized.results[0], {
    question: '4 x 1',
    expected: '4',
    spoken: '음... 어...',
    isCorrect: false,
  });
  assert.strictEqual(normalized.totalCorrect, 0);
});

test('normalizeEvaluation: 명확한 한글 숫자 발화만 해당 정답으로 인정해야 함', () => {
  const normalized = normalizeEvaluation({
    results: [
      { spoken: '사', isCorrect: true },
      { spoken: '5', isCorrect: true },
    ],
    feedback: '잘했어요!',
  }, ['4 x 1', '3 x 2']);

  assert.strictEqual(normalized.results[0].isCorrect, true);
  assert.strictEqual(normalized.results[1].isCorrect, false);
  assert.strictEqual(normalized.totalCorrect, 1);
});

test('validateAudioFile: 오디오 형식과 파일 크기를 모두 제한해야 함', () => {
  assert.strictEqual(validateAudioFile(null).valid, false);
  assert.strictEqual(validateAudioFile({ size: 0 }).valid, false);
  assert.strictEqual(validateAudioFile({ size: 500, buffer: Buffer.from('test'), mimetype: 'audio/webm; codecs=opus' }).valid, true);
  assert.strictEqual(validateAudioFile({ size: 500, buffer: Buffer.from('test'), mimetype: 'text/plain' }).valid, false);
  assert.strictEqual(validateAudioFile({ size: MAX_AUDIO_SIZE_BYTES + 1, buffer: Buffer.from('test'), mimetype: 'audio/webm' }).valid, false);
});

test('validateTapRecord: 누르는 구구단 기록의 게임 모드·점수·입력을 서버에서 검증해야 함', () => {
  const record = validateTapRecord({
    table: '4',
    mode: 'reverse',
    gameMode: 'expression',
    userName: ' 구구단 ',
    totalCorrect: '6',
    totalTime: '9000',
  });

  assert.deepStrictEqual(record, {
    valid: true,
    value: {
      table: 4,
      mode: 'reverse',
      gameMode: 'expression',
      userName: '구구단',
      totalCorrect: 6,
      totalTime: 9000,
      score: 72,
    },
  });
  assert.strictEqual(validateTapRecord({ table: 4, mode: 'random', gameMode: 'unknown', userName: '학생', totalCorrect: 10, totalTime: 1 }).valid, false);
  assert.strictEqual(validateTapRecord({ table: 4, mode: 'random', gameMode: 'mixed', userName: '학생', totalCorrect: 11, totalTime: 1 }).valid, false);
  assert.strictEqual(calculateScore(6, 'random'), 120);
  assert.strictEqual(calculateScore(10, 'random'), 200);
});

test('validatePracticeType: 말하기와 누르기 랭킹 타입만 허용해야 함', () => {
  assert.strictEqual(validatePracticeType(undefined), 'speech');
  assert.strictEqual(validatePracticeType('tap'), 'tap');
  assert.strictEqual(validatePracticeType('unknown'), null);
});
