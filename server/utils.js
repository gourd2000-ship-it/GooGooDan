/**
 * Gemini 응답 텍스트에서 안전하게 JSON을 추출하고 파싱합니다.
 * @param {string} responseText - Gemini API 응답 텍스트
 * @returns {object} 파싱된 결과 객체
 */
function parseGeminiJson(responseText) {
  const fallback = {
    results: [],
    totalCorrect: 0,
    feedback: "음성이 명확하지 않거나 들리지 않아요. 다시 한 번 큰 소리로 말씀해 주시겠어요?"
  };

  if (!responseText || typeof responseText !== 'string') {
    return fallback;
  }

  // 1. 마크다운 코드블록 제거
  let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. 가장 처음 나오는 '{' 와 가장 마지막 '}' 추출
  const startIdx = cleanText.indexOf('{');
  const endIdx = cleanText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.slice(startIdx, endIdx + 1);
  }

  try {
    const parsed = JSON.parse(cleanText);
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    const totalCorrect = typeof parsed.totalCorrect === 'number' 
      ? parsed.totalCorrect 
      : results.filter(r => r.isCorrect).length;
    const feedback = typeof parsed.feedback === 'string' && parsed.feedback.trim()
      ? parsed.feedback 
      : fallback.feedback;

    return {
      results,
      totalCorrect,
      feedback
    };
  } catch (err) {
    console.error('Gemini JSON 파싱 오류:', err.message);
    return fallback;
  }
}

/**
 * 기대 정답 배열(expectedAnswers)의 유효성을 검증하고 필터링합니다.
 * @param {string|Array} input - 클라이언트에서 전달받은 질문 목록
 * @returns {Array<string>} 안전한 질문 문자열 배열
 */
function validateExpectedAnswers(input) {
  let list = input;
  if (typeof input === 'string') {
    try {
      list = JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(list)) return [];

  // 안전한 질문 패턴만 추출 및 'N x M' 표준 규격으로 정제 (예: "2 x 1", "2x1", "2*1" 지원)
  return list
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => /^\d+\s*[xX*]\s*\d+$/.test(item))
    .map(item => item.replace(/\s*[xX*]\s*/, ' x '))
    .slice(0, 10);
}

/**
 * MIME 타입을 Gemini API가 인식할 수 있는 순수한 오디오 포맷(e.g., audio/webm)으로 정제합니다.
 * @param {string} rawMimeType 
 * @returns {string}
 */
function cleanMimeType(rawMimeType) {
  if (!rawMimeType || typeof rawMimeType !== 'string') {
    return 'audio/webm';
  }
  const baseMime = rawMimeType.split(';')[0].trim().toLowerCase();
  return baseMime || 'audio/webm';
}

/**
 * 환경 변수 또는 안전 fallback 키에서 Gemini API Key를 추출합니다.
 * @returns {string}
 */
function getGeminiApiKey() {
  const envKey = (
    process.env.GEMINI_API_KEY || 
    process.env['GEMINI-API-KEY'] || 
    process.env.GEMINI_KEY || 
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();

  if (envKey) return envKey;

  // 프로젝트 기본 안전 키
  return 'AIzaSyA_G1im7G03vtpOhvVhLWKnEhT6jRpW7KY';
}

/**
 * 업로드된 오디오 파일 객체의 유효성을 정밀 검증합니다.
 * @param {object} file - multer req.file 객체
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateAudioFile(file) {
  if (!file) {
    return { valid: false, reason: '오디오 파일이 수신되지 않았습니다.' };
  }
  if (!file.buffer || !Buffer.isBuffer(file.buffer) || file.size === 0) {
    return { valid: false, reason: '오디오 파일 내용이 비어 있습니다 (0 bytes).' };
  }
  return { valid: true };
}

module.exports = {
  parseGeminiJson,
  validateExpectedAnswers,
  cleanMimeType,
  getGeminiApiKey,
  validateAudioFile
};
