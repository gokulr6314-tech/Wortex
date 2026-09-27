import { SupportedLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from './languages';
import { describeVoice, preloadVoices, resolveVoice } from './voiceLanguage';

export interface SpeechRecognitionResultHandler {
  onResult: (text: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export interface SpeechCapabilities {
  ttsAvailable: boolean;
  recogAvailable: boolean;
  ttsVoices: number;
  preferredVoice: string | null;
}

export class SpeechService {
  private static recognition: any = null;
  private static isListeningState = false;
  private static cachedVoices: SpeechSynthesisVoice[] | null = null;
  private static activeAudioElement: HTMLAudioElement | null = null;


  static getCapabilities(): SpeechCapabilities {
    const ttsAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const SpeechRec =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : undefined;
    const voices = this.cachedVoices || (ttsAvailable ? window.speechSynthesis.getVoices() : []);
    return {
      ttsAvailable,
      recogAvailable: Boolean(SpeechRec),
      ttsVoices: voices.length,
      preferredVoice: voices.length ? describeVoice(voices[0]) : null,
    };
  }

  /** Returns the least-noisy native voice available for the selected language. */
  static pickVoice(languageCode: SupportedLanguageCode): SpeechSynthesisVoice | null {
    const all = this.cachedVoices || (typeof window !== 'undefined' ? window.speechSynthesis.getVoices() : []);
    return resolveVoice(languageCode, all).voice;
  }

  /** Global audio and speech synthesis unlocker for mobile and desktop */
  static unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.resume();
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0.01;
        window.speechSynthesis.speak(dummy);
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  // Speaks text using Web Speech API in the selected regional language.
  // Voices are preloaded lazily on first use and gracefully fall back on desktop
  // so desktop narration never remains silent.
  // Chrome desktop: keep speechSynthesis alive by calling resume() every 14s.
  // Chrome silently pauses synthesis for long utterances — this prevents TTS from going dead.
  private static keepaliveInterval: ReturnType<typeof setInterval> | null = null;

  private static startKeepalive(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.keepaliveInterval) return; // already running
    this.keepaliveInterval = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 14000);
  }

  private static stopKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }

  static speak(
    text: string,
    languageCode: SupportedLanguageCode,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      if (onEnd) onEnd();
      return;
    }

    const speakNow = () => {
      try {
        window.speechSynthesis.cancel(); // cancel any ongoing speech
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        // Retain global reference to prevent Chrome's garbage-collection bug on desktop
        (window as any).__activeUtterance = utterance;

        const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
        const targetLocale = langConfig ? langConfig.speechLocale : 'en-IN';

        const voices =
          this.cachedVoices && this.cachedVoices.length
            ? this.cachedVoices
            : window.speechSynthesis.getVoices();

        if (voices && voices.length) {
          this.cachedVoices = voices;
          const resolved = resolveVoice(languageCode, voices);
          if (resolved.voice) {
            utterance.voice = resolved.voice;
            // If the matched voice is native regional, keep the regional target locale.
            // If falling back to English on desktop, use the voice's locale so Windows SAPI doesn't abort.
            utterance.lang = resolved.matched ? targetLocale : resolved.voice.lang;
          } else {
            utterance.lang = targetLocale;
          }
        } else {
          utterance.lang = targetLocale;
        }

        utterance.rate = 0.95; // slightly slower for clear listening
        utterance.pitch = 1.05; // warm, friendly tone

        let hasFinished = false;
        const finish = () => {
          if (hasFinished) return;
          hasFinished = true;
          (window as any).__activeUtterance = null;
          this.stopKeepalive();
          if (onEnd) onEnd();
        };

        utterance.onstart = () => {
          this.startKeepalive(); // begin Chrome keepalive once speech actually starts
          if (onStart) onStart();
        };
        utterance.onend = finish;
        utterance.onerror = (e) => {
          console.warn('Speech synthesis event:', e.error);
          finish();
        };

        // Micro-delay prevents Chromium on desktop from dropping new utterance immediately after cancel()
        setTimeout(() => {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utterance);
          } catch (err) {
            console.error('Speech call error:', err);
            finish();
          }
        }, 25);
      } catch (err) {
        console.error('Speech error:', err);
        if (onEnd) onEnd();
      }
    };

    const voicesReady =
      this.cachedVoices && this.cachedVoices.length
        ? this.cachedVoices
        : window.speechSynthesis.getVoices();
    if (voicesReady.length) {
      speakNow();
      return;
    }

    preloadVoices()
      .then((voices) => {
        this.cachedVoices = voices && voices.length ? voices : window.speechSynthesis.getVoices();
        speakNow();
      })
      .catch(() => speakNow());
  }

  static stopSpeaking(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // Starts microphone voice recognition with browser support fallback.
  // Always cancels TTS first and waits 300ms before opening the mic to
  // prevent the bot recording its own synthesised voice (echo/feedback bug).
  static startListening(
    languageCode: SupportedLanguageCode,
    handlers: SpeechRecognitionResultHandler
  ): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      handlers.onError('Microphone speech recognition not available in this browser');
      return false;
    }

    // Stop any ongoing TTS before opening mic (prevents echo/feedback loop)
    this.stopSpeaking();
    this.stopKeepalive();

    const startRec = () => {
      try {
        if (this.recognition) {
          try {
            this.recognition.abort();
          } catch {
            // ignore
          }
        }

        const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
        const targetLocale = langConfig ? langConfig.speechLocale : 'en-IN';

        this.recognition = new SpeechRec();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = targetLocale;

        this.recognition.onstart = () => {
          this.isListeningState = true;
        };

        this.recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          if (final) {
            handlers.onResult(final, true);
          } else if (interim) {
            handlers.onResult(interim, false);
          }
        };

        this.recognition.onerror = (event: any) => {
          this.isListeningState = false;
          handlers.onError(event.error || 'Speech capture error');
        };

        this.recognition.onend = () => {
          this.isListeningState = false;
          handlers.onEnd();
        };

        this.recognition.start();
      } catch (err: any) {
        this.isListeningState = false;
        handlers.onError(err.message || 'Failed to start microphone');
      }
    };

    // 300ms silence gap ensures TTS audio fully drains from speakers before
    // the mic opens — prevents the recognition engine from picking up the bot's own voice.
    setTimeout(startRec, 300);
    return true;
  }

  static stopListening(): void {
    if (this.recognition && this.isListeningState) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListeningState = false;
    }
  }
}
