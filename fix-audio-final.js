const fs = require('fs');
const p = 'src/components/CallModal.tsx';
let s = fs.readFileSync(p, 'utf8');

// Find and replace the entire broken block
const startMarker = '  // Dummy useEffect to satisfy TypeScript (never runs)';
const endMarker = '  const startLocalMicAnalyzer = async () => {';

const startIdx = s.indexOf(startMarker);
const endIdx = s.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Block boundaries not found.');
  process.exit(1);
}

const cleanBlock = `  useEffect(() => {
    const audio = audioRef.current;
    const stream = remoteStream;
    if (!audio || !stream) return;
    
    // Attach function (can be called multiple times as tracks arrive)
    const attachStream = () => {
      if (!audioRef.current || !remoteStream) return;
      const tracks = remoteStream.getAudioTracks();
      if (tracks.length === 0) return;
      
      // Only attach if not already attached to this stream
      if (audioRef.current.srcObject !== remoteStream) {
        console.log("[CallModal] 🎧 Attaching stream with", tracks.length, "audio track(s)");
        audioRef.current.srcObject = remoteStream;
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
      }
      
      // Always try to play (in case it paused)
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("[CallModal] ✅ Audio playing");
            setNeedsTapToHear(false);
          })
          .catch((err: any) => {
            console.warn("[CallModal] ⚠️ Play blocked:", err.name);
            setNeedsTapToHear(true);
          });
      }
    };
    
    // Try immediately
    attachStream();
    
    // Poll for 10 seconds to catch tracks that arrive late
    const pollInterval = setInterval(attachStream, 500);
    const pollTimeout = setTimeout(() => clearInterval(pollInterval), 10000);
    
    // Also try Web Audio API as backup
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const source = ctx.createMediaStreamSource(stream);
      source.connect(ctx.destination);
      ctx.resume().then(() => {
        console.log("[CallModal] ✅ Web Audio API running, state:", ctx.state);
        (window as any).__remoteAudioCtx = ctx;
      }).catch((e: any) => console.error("[CallModal] Web Audio failed:", e));
    } catch (e) {
      console.error("[CallModal] Web Audio init failed:", e);
    }
    
    return () => {
      clearInterval(pollInterval);
      clearTimeout(pollTimeout);
      if ((window as any).__remoteAudioCtx) {
        try { (window as any).__remoteAudioCtx.close(); } catch {}
        (window as any).__remoteAudioCtx = null;
      }
    };
  }, [remoteStream]);

`;

s = s.substring(0, startIdx) + cleanBlock + s.substring(endIdx);
fs.writeFileSync(p, s);
console.log('OK: Replaced broken block with clean polling implementation.');
