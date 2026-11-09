/**
 * Bilingual Audio & Chime Guidance for Drivers
 * Combines Web Audio API Chimes (100% reliable sound on all OS/browsers)
 * with SpeechSynthesis Text-to-Speech (Hindi/Marathi Devanagari voice).
 */

// AudioContext for instant chime feedback (never blocked by missing language packs)
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChime(type = 'success') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Pleasant rising chime (C5 -> G5) for Verified POD
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Attention alert tone (E4 -> C4) for Retake / Review
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392.00, now);
      osc.frequency.setValueAtTime(329.63, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (err) {
    console.warn('Web Audio chime error:', err);
  }
}

export function speakPrompt(text, lang = 'mr') {
  // 1. Play immediate audio chime so sound is ALWAYS heard
  const isRetake = text.includes('दुबारा') || text.includes('पुन्हा') || text.includes('मुहर') || text.includes('कक्ष') || text.includes('नोंद');
  playChime(isRetake ? 'alert' : 'success');

  // 2. Text-to-Speech
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported by this browser.');
    return;
  }

  try {
    // Resume speech synthesis if suspended by browser
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    // Small delay after cancel to prevent Chrome bug where speech drops
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      
      // Look for regional voices: mr-IN, hi-IN, en-IN
      // Note: Windows lacks a native mr-IN voice, but Devanagari text is read fluently
      // by standard Hindi (hi-IN) voices (e.g. Google हिन्दी, Microsoft Kalpana/Heera).
      let selectedVoice = voices.find(v => v.lang.startsWith('mr'));
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('hi'));
      }
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('IN') || v.lang.startsWith('en'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      } else {
        // Fallback to Hindi locale for Devanagari pronunciation
        utterance.lang = 'hi-IN';
      }

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e.error);
      };

      window.speechSynthesis.speak(utterance);
    }, 50);

  } catch (err) {
    console.warn('Speech synthesis failed:', err);
  }
}

// Pre-load voices on startup
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
