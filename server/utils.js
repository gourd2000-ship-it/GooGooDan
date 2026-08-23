const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']);
const FALLBACK_FEEDBACK = '음성이 명확하지 않거나 들리지 않아요. 다시 한 번 큰 소리로 말씀해 주시겠어요?';

/**
 * Gemini 응답 텍스트에서 JSON 객체를 추출합니다. 외부 응답의 필드 신뢰성은
 * normalizeEvaluation에서 별도로 보장합니다.
 */
function parseGeminiJson(responseText) {
  const fallback = { results: [], totalCorrect: 0, feedback: FALLBACK_FEEDBACK };
  if (!responseText || typeof responseText !== 'string') return fallback;

  let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const startIdx = cleanText.indexOf('{');
  const endIdx = cleanText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.slice(startIdx, endIdx + 1);
  }

  try {
    const parsed = JSON.parse(cleanText);
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    return {
      results,
      totalCorrect: typeof parsed.totalCorrect === 'number' ? parsed.totalCorrect : results.filter((result) => result?.isCorrect).length,
      feedback: typeof parsed.feedback === 'string' && parsed.feedback.trim() ? parsed.feedback.trim() : FALLBACK_FEEDBACK,
    };
  } catch (err) {
    console.error('Gemini JSON 파싱 오류:', err.message);
    return fallback;
  }
}

function readExpectedAnswers(input) {
  let list = input;
  if (typeof input === 'string') {
    try {
      list = JSON.parse(input);
    } catch {
      return null;
    }
  }
  return Array.isArray(list) ? list : null;
}

function normalizeExpectedAnswer(item) {
  if (typeof item !== 'string') return null;
  const question = item.trim();
  if (!/^\d+\s*[xX*]\s*\d+$/.test(question)) return null;
  return question.replace(/\s*[xX*]\s*/, ' x ');
}

function validateExpectedAnswers(input) {
  const list = readExpectedAnswers(input);
  if (!list) return [];

  return list
    .map(normalizeExpectedAnswer)
    .filter((question) => question !== null)
    .slice(0, 10);
}

/**
 * 클라이언트가 보낸 문제가 선택한 단·모드와 정확히 일치하는지 검증합니다.
 * 랜덤 모드는 1~10의 순열만 허용합니다.
 */
function validateExpectedQuestions(table, mode, input) {
  const rawQuestions = readExpectedAnswers(input);
  if (!Number.isInteger(table) || table < 2 || table > 9 || !rawQuestions || rawQuestions.length !== 10) return null;
  const questions = rawQuestions.map(normalizeExpectedAnswer);
  if (questions.some((question) => question === null)) return null;

  const sequential = Array.from({ length: 10 }, (_, index) => `${table} x ${index + 1}`);
  if (mode === 'sequential') {
    return questions.every((question, index) => question === sequential[index]) ? questions : null;
  }
  if (mode === 'reverse') {
    return questions.every((question, index) => question === sequential[9 - index]) ? questions : null;
  }
  if (mode === 'random') {
    return new Set(questions).size === 10 && questions.every((question) => sequential.includes(question)) ? questions : null;
  }
  return null;
}

function cleanMimeType(rawMimeType) {
  if (!rawMimeType || typeof rawMimeType !== 'string') return 'audio/webm';
  return rawMimeType.split(';')[0].trim().toLowerCase() || 'audio/webm';
}

/** 서버 전용 환경 변수만 읽습니다. */
function getGeminiApiKey(environment = process.env) {
  return typeof environment.GEMINI_API_KEY === 'string' ? environment.GEMINI_API_KEY.trim() : '';
}

function expectedAnswerForQuestion(question) {
  const match = /^(\d+) x (\d+)$/.exec(question);
  return match ? String(Number(match[1]) * Number(match[2])) : '';
}

/**
 * 모델 응답을 신뢰 가능한 화면/저장 형식으로 보정합니다. 모델이 보낸 문제와
 * totalCorrect는 사용하지 않고, 서버에서 검증한 문제 목록과 결과로 재계산합니다.
 */
function normalizeEvaluation(evaluation, expectedQuestions) {
  const rawResults = Array.isArray(evaluation?.results) ? evaluation.results : [];
  const results = expectedQuestions.map((question, index) => {
    const rawResult = rawResults[index];
    return {
      question,
      expected: expectedAnswerForQuestion(question),
      spoken: typeof rawResult?.spoken === 'string' ? rawResult.spoken.trim().slice(0, 100) : '',
      isCorrect: rawResult?.isCorrect === true,
    };
  });
  const totalCorrect = results.filter((result) => result.isCorrect).length;
  const feedback = typeof evaluation?.feedback === 'string' && evaluation.feedback.trim()
    ? evaluation.feedback.trim().slice(0, 500)
    : FALLBACK_FEEDBACK;

  return { results, totalCorrect, feedback };
}

function validateAudioFile(file) {
  if (!file) return { valid: false, reason: '오디오 파일이 수신되지 않았습니다.' };
  if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.size === 0) {
    return { valid: false, reason: '오디오 파일 내용이 비어 있습니다 (0 bytes).' };
  }
  if (file.size > MAX_AUDIO_SIZE_BYTES) {
    return { valid: false, reason: '오디오 파일은 10MB 이하여야 합니다.' };
  }
  if (!file.mimetype || typeof file.mimetype !== 'string') {
    return { valid: false, reason: '오디오 형식 정보가 없습니다.' };
  }
  const mimeType = cleanMimeType(file.mimetype);
  if (!ALLOWED_AUDIO_MIME_TYPES.has(mimeType)) {
    return { valid: false, reason: '지원하지 않는 오디오 형식입니다.' };
  }
  return { valid: true };
}

module.exports = {
  ALLOWED_AUDIO_MIME_TYPES,
  MAX_AUDIO_SIZE_BYTES,
  cleanMimeType,
  getGeminiApiKey,
  normalizeEvaluation,
  parseGeminiJson,
  validateAudioFile,
  validateExpectedAnswers,
  validateExpectedQuestions,
};
