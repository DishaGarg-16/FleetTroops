/**
 * Native Browser Web Speech API for Marathi & Hindi Audio Guidance
 * 100% Free, zero external API keys, works offline on Android/iOS browsers.
 */

export function speakPrompt(text, lang = 'mr-IN') {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported by this browser.');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'mr' ? 'mr-IN' : 'hi-IN';
  utterance.rate = 0.95; // Slightly slower pace for clarity over truck engine noise
  utterance.pitch = 1.0;

  // Attempt to select an Indian regional voice if available
  const voices = window.speechSynthesis.getVoices();
  const regionalVoice = voices.find(v => v.lang.startsWith(lang === 'mr' ? 'mr' : 'hi'));
  if (regionalVoice) {
    utterance.voice = regionalVoice;
  }

  window.speechSynthesis.speak(utterance);
}

