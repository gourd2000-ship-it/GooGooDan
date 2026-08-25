const test = require('node:test');
const assert = require('node:assert');
const { MAX_AUDIO_DURATION_SECONDS, validateAudioDuration } = require('./audioDuration');

function createWav(seconds) {
  const sampleRate = 8_000;
  const bytesPerSample = 2;
  const audioBytes = sampleRate * bytesPerSample * seconds;
  const buffer = Buffer.alloc(44 + audioBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + audioBytes, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(audioBytes, 40);
  return buffer;
}

test('validateAudioDuration: one-minute audio is accepted', async () => {
  const buffer = createWav(MAX_AUDIO_DURATION_SECONDS);

  const result = await validateAudioDuration({ buffer, size: buffer.length, mimetype: 'audio/wav' });

  assert.deepStrictEqual(result, { valid: true, durationSeconds: MAX_AUDIO_DURATION_SECONDS });
});

test('validateAudioDuration: accepts encoder padding immediately after a one-minute stop', async () => {
  const buffer = createWav(MAX_AUDIO_DURATION_SECONDS + 0.2);

  const result = await validateAudioDuration({ buffer, size: buffer.length, mimetype: 'audio/wav' });

  assert.strictEqual(result.valid, true);
});

test('validateAudioDuration: audio longer than one minute is rejected', async () => {
  const buffer = createWav(MAX_AUDIO_DURATION_SECONDS + 1);

  const result = await validateAudioDuration({ buffer, size: buffer.length, mimetype: 'audio/wav' });

  assert.strictEqual(result.valid, false);
  assert.match(result.reason, /1분/);
});
