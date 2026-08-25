const MAX_AUDIO_DURATION_SECONDS = 60;
const AUDIO_DURATION_GRACE_SECONDS = 0.25;
const MAX_REPORTED_DURATION_MS = MAX_AUDIO_DURATION_SECONDS * 1000;

let parseBufferPromise;

function getParseBuffer() {
  if (!parseBufferPromise) {
    // https://www.npmjs.com/package/music-metadata#parsebuffer-function
    parseBufferPromise = import('music-metadata').then(({ parseBuffer }) => parseBuffer);
  }
  return parseBufferPromise;
}

function createDurationDiagnostic(file, error) {
  return {
    event: 'audio_duration_metadata_unavailable',
    mimeType: file.mimetype || null,
    originalName: file.originalname || null,
    sizeBytes: Number.isFinite(file.size) ? file.size : null,
    parserError: error ? {
      name: error.name || 'Error',
      message: error.message || String(error),
    } : null,
  };
}

function handleUnavailableDuration(file, reportedDurationMs, error) {
  const diagnostic = createDurationDiagnostic(file, error);
  if (Number.isInteger(reportedDurationMs)
    && reportedDurationMs >= 0
    && reportedDurationMs <= MAX_REPORTED_DURATION_MS) {
    return {
      valid: true,
      durationSeconds: reportedDurationMs / 1000,
      durationSource: 'reported',
      diagnostic,
    };
  }

  return { valid: false, reason: '오디오 길이를 확인할 수 없습니다.', diagnostic };
}

async function validateAudioDuration(file, reportedDurationMs) {
  try {
    const parseBuffer = await getParseBuffer();
    const metadata = await parseBuffer(
      file.buffer,
      { mimeType: file.mimetype, size: file.size },
      { duration: true, skipCovers: true },
    );
    const durationSeconds = metadata.format.duration;

    if (!Number.isFinite(durationSeconds)) {
      return handleUnavailableDuration(file, reportedDurationMs);
    }
    if (durationSeconds > MAX_AUDIO_DURATION_SECONDS + AUDIO_DURATION_GRACE_SECONDS) {
      return { valid: false, reason: '오디오 녹음은 최대 1분까지만 가능합니다.' };
    }
    return { valid: true, durationSeconds };
  } catch (error) {
    return handleUnavailableDuration(file, reportedDurationMs, error);
  }
}

module.exports = {
  MAX_AUDIO_DURATION_SECONDS,
  MAX_REPORTED_DURATION_MS,
  validateAudioDuration,
};
