const path = require('path');
// .env 파일을 여러 경로(현재 폴더 및 상위 폴더의 .env / .ENV)에서 탐색하여 로드합니다.
require('dotenv').config();
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.ENV') });

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const { createGeminiClient, evaluateAudio } = require('./gemini');
const {
  ALLOWED_AUDIO_MIME_TYPES,
  MAX_AUDIO_SIZE_BYTES,
  cleanMimeType,
  getAllowedOrigins,
  getGeminiApiKey,
  normalizeEvaluation,
  parseGeminiJson,
  validateAudioFile,
  validateExpectedQuestions,
} = require('./utils');

const app = express();
const port = process.env.PORT || 5000;

const clientOrigins = getAllowedOrigins(process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || clientOrigins.includes(origin));
  },
  methods: ['GET', 'POST'],
}));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (ALLOWED_AUDIO_MIME_TYPES.has(cleanMimeType(file.mimetype))) {
      callback(null, true);
      return;
    }
    callback(new Error('지원하지 않는 오디오 형식입니다.'));
  },
});

const DATABASE_URL = process.env.DATABASE_URL;

function getGenAIClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return createGeminiClient(apiKey);
}

// Neon DB Pool 초기화
let pool = null;
if (DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Neon DB 풀(Pool) 초기화 완료');
  } catch (err) {
    console.error('❌ Neon DB 초기화 중 오류 발생:', err.message);
  }
} else {
  console.warn('⚠️ 경고: DATABASE_URL이 누락되었습니다. DB 저장 및 랭킹 기능이 제한됩니다.');
}

// 테스트용 루트 API
app.get('/', (req, res) => {
  res.send('말하는 구구단 챌린지 서버가 정상 작동 중입니다!');
});

// 헬스 체크 API
app.get('/api/health', (req, res) => {
  const hasKey = !!getGeminiApiKey();
  res.json({ status: 'ok', hasGeminiKey: hasKey, hasDb: !!pool });
});

// 랭킹 조회 API (8단계)
app.get('/api/ranking', async (req, res) => {
  try {
    const { table } = req.query;
    if (!pool) {
      console.warn('⚠️ Neon DB 미설정으로 더미 랭킹 데이터를 반환합니다.');
      const dummyData = [
        { student_name: '구구단박사', table_number: 9, score: 100, total_time_ms: 8500 },
        { student_name: '바나나친구', table_number: 2, score: 100, total_time_ms: 12000 },
        { student_name: '척척박사', table_number: 5, score: 88, total_time_ms: 15000 },
      ];
      if (table && table !== 'all') {
        return res.json(dummyData.filter(item => item.table_number === parseInt(table)));
      }
      return res.json(dummyData);
    }

    let query = 'SELECT student_name, table_number, score, total_time_ms FROM records';
    let params = [];
    if (table && table !== 'all') {
      query += ' WHERE table_number = $1';
      params.push(parseInt(table));
    }
    query += ' ORDER BY score DESC, total_time_ms ASC LIMIT 10';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('랭킹 조회 오류:', error);
    res.status(500).json({ error: '랭킹을 불러오지 못했습니다.' });
  }
});

// AI 채점 API (오디오 파일을 받아 Gemini로 평가)
app.post('/api/evaluate', (req, res) => {
  upload.single('audio')(req, res, async (uploadErr) => {
    if (uploadErr) {
      console.error('❌ 멀터 오디오 수신 에러:', uploadErr);
      return res.status(400).json({ error: '오디오 업로드를 처리하지 못했습니다. 파일 크기와 형식을 확인해 주세요.' });
    }

    try {
      const audioCheck = validateAudioFile(req.file);
      if (!audioCheck.valid) {
        return res.status(400).json({ error: audioCheck.reason });
      }

    const { table, mode, expectedAnswers, userName, totalTime } = req.body;

    // 입력값 검증 (보안 강화 및 SQL injection/XSS 사전 예방)
    const parsedTable = Number(table);
    if (!Number.isInteger(parsedTable) || parsedTable < 2 || parsedTable > 9) {
      return res.status(400).json({ error: '유효하지 않은 단 선택입니다. (2~9단만 가능)' });
    }

    const validModes = ['sequential', 'random', 'reverse'];
    if (!validModes.includes(mode)) {
      return res.status(400).json({ error: '유효하지 않은 연습 모드입니다.' });
    }

    // 이름 검증: 특수문자, 스크립트 코드 필터링
    const cleanName = userName ? userName.trim() : '';
    const nameRegex = /^[a-zA-Z0-9가-힣\s]{1,10}$/;
    if (!cleanName || !nameRegex.test(cleanName)) {
      return res.status(400).json({ error: '이름은 특수문자 없이 1~10자 이내로 입력해주세요.' });
    }

    const parsedTotalTime = Number(totalTime);
    if (!Number.isInteger(parsedTotalTime) || parsedTotalTime < 0) {
      return res.status(400).json({ error: '유효하지 않은 소요 시간입니다.' });
    }

    const safeExpectedAnswers = validateExpectedQuestions(parsedTable, mode, expectedAnswers);
    if (!safeExpectedAnswers) {
      return res.status(400).json({ error: '선택한 단과 연습 모드에 맞는 10개 문제가 필요합니다.' });
    }

    console.log(`[채점 요청] 사용자: ${cleanName}, ${parsedTable}단, 파일크기: ${req.file.size} bytes, 형식: ${req.file.mimetype}`);
    
    const genAI = getGenAIClient();
    if (!genAI) {
      console.error('❌ Gemini API 클라이언트가 초기화되지 않았습니다. GEMINI_API_KEY 환경변수를 확인하세요.');
      return res.status(500).json({ error: '서버의 GEMINI_API_KEY 환경변수가 누락되었습니다. Render 대시보드의 Environment Variables 설정을 확인해주세요.' });
    }

    // 프롬프트(명령어) 작성
    const prompt = `
    당신은 초등학교 구구단 시험을 채점하는 선생님입니다.
    사용자가 ${parsedTable}단 구구단을 말한 음성 파일입니다.
    
    [채점 지침]
    1. 배경 소음이나 발음이 부정확해도 문맥상 구구단 정답이라면 정답으로 인정해주세요.
    2. 기대하는 정답 순서는 다음과 같습니다: ${JSON.stringify(safeExpectedAnswers)}
    3. 사용자가 숫자를 한국어로 말하거나(이, 사, 육...) 아라비아 숫자로 말해도 모두 인정합니다.
    
    음성을 분석해서 반드시 아래의 JSON 형식으로만 응답해주세요. 설명이나 마크다운 기호 없이 순수 JSON만 보내주세요.
    
    {
      "results": [
        {
          "question": "구구단 문제 (예: 2 x 1)",
          "expected": "기대하는 정답 숫자",
          "spoken": "학생이 실제로 말한 내용 (최대한 들리는 대로)", 
          "isCorrect": true 또는 false
        },
        ... (총 10문제)
      ],
      "totalCorrect": 맞힌 개수,
      "feedback": "학생에게 해줄 친절하고 따뜻한 격려의 말 (반드시 3문장 이하로 작성해주세요.)"
    }
    `;

    // 오디오 데이터를 Gemini가 이해할 수 있는 순수 포맷으로 변환
    const pureMimeType = cleanMimeType(req.file.mimetype);
    console.log(`[오디오 정제] 원본 mimeType: "${req.file.mimetype}" ➔ 정제 mimeType: "${pureMimeType}"`);

    const audioPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: pureMimeType
      }
    };

    let evaluation;
    try {
      const responseText = await evaluateAudio(genAI, {
        prompt,
        audioData: audioPart.inlineData.data,
        mimeType: pureMimeType,
      });
      evaluation = parseGeminiJson(responseText);
    } catch (err) {
      console.error('❌ Gemini Interactions API 호출 실패:', err.message || err);
      return res.status(502).json({ error: 'AI 채점 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
    }

    if (!evaluation || !evaluation.results || evaluation.results.length === 0) {
      console.error('❌ Gemini 응답에서 채점 결과를 찾지 못했습니다.');
      return res.status(502).json({ error: 'AI 채점 서비스를 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.' });
    }

    const normalizedEvaluation = normalizeEvaluation(evaluation, safeExpectedAnswers);

    // Neon DB 기록 저장
    if (pool && cleanName) {
      const correct = normalizedEvaluation.totalCorrect;
      let score = 0;
      if (mode === 'reverse') {
        score = correct * 12;
      } else if (mode === 'random') {
        score = correct * 15;
      } else {
        score = correct * 10;
      }
      const totalTimeMs = parsedTotalTime || 0;
      
      try {
        await pool.query(
          'INSERT INTO records (student_name, table_number, mode, score, total_time_ms) VALUES ($1, $2, $3, $4, $5)',
          [cleanName, parsedTable, mode, score, totalTimeMs]
        );
        console.log('✅ Neon DB에 기록 저장 성공');
      } catch (dbError) {
        console.error('❌ Neon DB 저장 중 오류:', dbError.message);
      }
    }

    res.json(normalizedEvaluation);
    } catch (error) {
      console.error('채점 중 오류 발생:', error);
      res.status(500).json({ error: '채점 중 서버 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  });
});

// 전역 500 에러 처리 미들웨어 (HTML 에러 반환 방지)
app.use((err, req, res, next) => {
  console.error('❌ 서버 전역 예외 발생:', err.stack || err);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

// 서버 실행
app.listen(port, () => {
  console.log(`🚀 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
