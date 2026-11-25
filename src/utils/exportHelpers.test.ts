import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExportFileName,
  buildWebCodecsEncoderCandidates,
  computeExportFrameSchedule,
  selectMediaRecorderMimeCandidates,
  shouldPreferMediaRecorderMp4,
} from './exportHelpers';

test('selectMediaRecorderMimeCandidates omits audio codecs when video-only and prioritizes vp8', () => {
  const videoOnly = selectMediaRecorderMimeCandidates(false);
  assert.equal(
    videoOnly.some((c) => c.mimeType.includes('opus') || c.mimeType.includes('mp4a')),
    false,
  );
  const vp8Idx = videoOnly.findIndex((c) => c.mimeType.includes('vp8'));
  const vp9Idx = videoOnly.findIndex((c) => c.mimeType.includes('vp9'));
  assert.ok(vp8Idx >= 0 && vp9Idx >= 0 && vp8Idx < vp9Idx);

  const withAudio = selectMediaRecorderMimeCandidates(true);
  assert.equal(
    withAudio.some((c) => c.mimeType === 'video/webm;codecs=vp8,opus'),
    true,
  );
});

test('buildWebCodecsEncoderCandidates prioritizes Constrained Baseline AVC for mobile compatibility', () => {
  const hd = buildWebCodecsEncoderCandidates({
    width: 720,
    height: 1280,
    fps: 30,
    resolution: '720p',
  });
  assert.equal(hd[0].container, 'mp4');
  assert.equal(hd[0].codec, 'avc1.42E01F');
  assert.equal(hd[0].avcFormat, 'avc');
  assert.ok(hd.some((c) => c.container === 'webm' && c.codec === 'vp8' && c.muxerVideoCodec === 'V_VP8'));

  const fullHd = buildWebCodecsEncoderCandidates({
    width: 1080,
    height: 1920,
    fps: 60,
    resolution: '1080p',
  });
  assert.equal(fullHd[0].codec, 'avc1.42E028');
  assert.ok(fullHd[0].videoBitrate > hd[0].videoBitrate);
});

test('shouldPreferMediaRecorderMp4 switches to MP4 MediaRecorder when audio WebM fallback occurs on phone', () => {
  assert.equal(
    shouldPreferMediaRecorderMp4({
      hasMixedAudio: true,
      webCodecsContainer: 'webm',
      mediaRecorderMp4Supported: true,
    }),
    true,
  );
  assert.equal(
    shouldPreferMediaRecorderMp4({
      hasMixedAudio: true,
      webCodecsContainer: 'mp4',
      mediaRecorderMp4Supported: true,
    }),
    false,
  );
  assert.equal(
    shouldPreferMediaRecorderMp4({
      hasMixedAudio: false,
      webCodecsContainer: 'webm',
      mediaRecorderMp4Supported: true,
    }),
    false,
  );
});

test('computeExportFrameSchedule produces deterministic frame counts and microsecond durations', () => {
  const schedule = computeExportFrameSchedule(3.5, 30);
  assert.equal(schedule.totalFrames, 105);
  assert.equal(schedule.frameDurationUs, 33333);

  const tiny = computeExportFrameSchedule(0.01, 30);
  assert.equal(tiny.totalFrames, 2);

  assert.equal(buildExportFileName('720p', 'mp4'), 'insho-text-720p.mp4');
});
