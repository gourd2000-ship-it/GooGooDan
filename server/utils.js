/**
 * Gemini 응답 텍스트에서 안전하게 JSON을 추출하고 파싱합니다.
 * @param {string} responseText - Gemini API 응답 텍스트
 * @returns {object} 파싱된 결과 객체
 */
function parseGeminiJson(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return {
      results: [],
      totalCorrect: 0,
      feedback: "응답을 처리할 수 없습니다."
    };
  }

  // 1. 마크다운 코드블록 제거
  let cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. 혹시 앞뒤에 일반 텍스트가 섞여있을 경우 가장 처음 나오는 '{' 와 가장 마지막 '}' 추출
  const startIdx = cleanText.indexOf('{');
  const endIdx = cleanText.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleanText = cleanText.slice(startIdx, endIdx + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (err) {
    console.error('Gemini JSON 파싱 오류:', err.message);
    return {
      results: [],
      totalCorrect: 0,
      feedback: "음성이 명확하지 않거나 들리지 않아요. 다시 한 번 큰 소리로 말씀해 주시겠어요?"
    };
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

  // 안전한 질문 패턴만 추출 (예: "2 x 1", "9 x 10")
  return list
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(item => /^\d+\s*x\s*\d+$/.test(item))
    .slice(0, 10);
}

module.exports = {
  parseGeminiJson,
  validateExpectedAnswers
};
