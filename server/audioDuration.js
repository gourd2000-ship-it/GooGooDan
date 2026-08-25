const MAX_AUDIO_DURATION_SECONDS = 60;
const AUDIO_DURATION_GRACE_SECONDS = 0.25;

let parseBufferPromise;

function getParseBuffer() {
  if (!parseBufferPromise) {
    // https://www.npmjs.com/package/music-metadata#parsebuffer-function
    parseBufferPromise = import('music-metadata').then(({ parseBuffer }) => parseBuffer);
  }
  return parseBufferPromise;
}

async function validateAudioDuration(file) {
  try {
    const parseBuffer = await getParseBuffer();
    const metadata = await parseBuffer(
      file.buffer,
      { mimeType: file.mimetype, size: file.size },
      { duration: true, skipCovers: true },
    );
    const durationSeconds = metadata.format.duration;

    if (!Number.isFinite(durationSeconds)) {
      return { valid: false, reason: '오디오 길이를 확인할 수 없습니다.' };
    }
    if (durationSeconds > MAX_AUDIO_DURATION_SECONDS + AUDIO_DURATION_GRACE_SECONDS) {
      return { valid: false, reason: '오디오 녹음은 최대 1분까지만 가능합니다.' };
    }
    return { valid: true, durationSeconds };
  } catch {
    return { valid: false, reason: '오디오 길이를 확인할 수 없습니다.' };
  }
}

module.exports = {
  MAX_AUDIO_DURATION_SECONDS,
  validateAudioDuration,
};
