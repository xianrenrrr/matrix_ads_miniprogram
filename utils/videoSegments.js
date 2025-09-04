// Simple segment playback helpers for WeChat <video> via wx.createVideoContext

function seekTo(videoId, sec) {
  try {
    const ctx = wx.createVideoContext(videoId);
    ctx.seek(sec);
    return ctx;
  } catch (e) {
    return null;
  }
}

function ensureStartOnLoaded(videoId, startSec) {
  seekTo(videoId, startSec);
}

function ensureStartOnPlay(videoId, startSec) {
  seekTo(videoId, startSec);
}

function stopAtEnd(videoId, endSec, startSec) {
  const ctx = seekTo(videoId, endSec);
  if (!ctx) return;
  try { ctx.pause(); } catch (e) {}
  // Reset to start so the next Play begins at correct position
  try { ctx.seek(startSec); } catch (e) {}
}

module.exports = {
  ensureStartOnLoaded,
  ensureStartOnPlay,
  stopAtEnd,
};

