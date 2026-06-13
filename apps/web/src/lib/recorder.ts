/**
 * Client-side composite recorder.
 *
 * Draws every participant's video onto a single canvas and mixes all audio
 * tracks through the Web Audio API, then records the result with MediaRecorder.
 * Produces one webm Blob containing both parties — uploaded to Cloudinary.
 *
 * The live call still flows through the mediasoup SFU; this only captures what
 * is already being received, so it doesn't change the media-routing model.
 */

export interface CompositeRecorder {
  stop: () => Promise<Blob>;
  mimeType: string;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const vw = video.videoWidth || 16;
  const vh = video.videoHeight || 9;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  try {
    ctx.drawImage(video, dx, dy, dw, dh);
  } catch {
    /* video not ready yet */
  }
}

function pickMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "video/webm";
}

export async function startCompositeRecording(
  localStream: MediaStream | null,
  remoteStreams: MediaStream[]
): Promise<CompositeRecorder> {
  const width = 1280;
  const height = 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Offscreen <video> elements to source frames from each stream.
  const videoEls: HTMLVideoElement[] = [];
  const makeVideo = (stream: MediaStream): HTMLVideoElement | null => {
    if (stream.getVideoTracks().length === 0) return null;
    const v = document.createElement("video");
    v.srcObject = stream;
    v.muted = true;
    v.playsInline = true;
    v.play().catch(() => {});
    videoEls.push(v);
    return v;
  };

  const remoteVids = remoteStreams.map(makeVideo).filter(Boolean) as HTMLVideoElement[];
  const localVid = localStream ? makeVideo(localStream) : null;

  // Tiles: remotes first (stage), local last.
  const tiles = [...remoteVids, ...(localVid ? [localVid] : [])];

  let raf = 0;
  const render = () => {
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, width, height);

    if (tiles.length === 1) {
      drawCover(ctx, tiles[0], 0, 0, width, height);
    } else if (tiles.length >= 2) {
      const half = width / 2;
      drawCover(ctx, tiles[0], 0, 0, half, height);
      drawCover(ctx, tiles[1], half, 0, half, height);
      // divider
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(half - 1, 0, 2, height);
    }

    raf = requestAnimationFrame(render);
  };
  render();

  const canvasStream = canvas.captureStream(30);

  // Mix all audio tracks into one.
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx: AudioContext = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();
  const addAudio = (stream: MediaStream | null) => {
    if (!stream || stream.getAudioTracks().length === 0) return;
    try {
      audioCtx.createMediaStreamSource(stream).connect(dest);
    } catch {
      /* track unusable */
    }
  };
  addAudio(localStream);
  remoteStreams.forEach(addAudio);

  const mixed = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const mimeType = pickMimeType();
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(mixed, {
    mimeType,
    videoBitsPerSecond: 2_500_000,
  });
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };
  recorder.start(1000);

  return {
    mimeType,
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          cancelAnimationFrame(raf);
          canvasStream.getTracks().forEach((t) => t.stop());
          videoEls.forEach((v) => {
            v.pause();
            v.srcObject = null;
          });
          audioCtx.close().catch(() => {});
          resolve(new Blob(chunks, { type: mimeType }));
        };
        if (recorder.state !== "inactive") recorder.stop();
        else resolve(new Blob(chunks, { type: mimeType }));
      }),
  };
}
