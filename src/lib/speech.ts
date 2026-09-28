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

    const speakNative = () => {
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
    };

    // Attempt Bhashini TTS first
    fetch('/api/bhashini/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: languageCode }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.audioBase64) {
          try {
            if (this.activeAudioElement) {
              this.activeAudioElement.pause();
              this.activeAudioElement = null;
            }
            const audio = new Audio(`data:audio/${data.audioFormat || 'wav'};base64,${data.audioBase64}`);
            this.activeAudioElement = audio;
            audio.onplay = () => { if (onStart) onStart(); };
            audio.onended = () => {
              this.activeAudioElement = null;
              if (onEnd) onEnd();
            };
            audio.onerror = () => {
              console.warn('Bhashini audio playback failed, falling back to native TTS');
              speakNative();
            };
            audio.play().catch((err) => {
              console.warn('Audio play error, falling back', err);
              speakNative();
            });
          } catch (e) {
            console.warn('Audio setup error, falling back', e);
            speakNative();
          }
        } else {
          speakNative();
        }
      })
      .catch((err) => {
        console.warn('Bhashini TTS fetch failed, falling back to native TTS', err);
        speakNative();
      });
  }

  static stopSpeaking(): void {
    if (this.activeAudioElement) {
      this.activeAudioElement.pause();
      this.activeAudioElement = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  private static mediaRecorder: MediaRecorder | null = null;
  private static audioStream: MediaStream | null = null;
  private static audioChunks: Blob[] = [];

  // Helper to resample audio and convert to 16kHz WAV base64
  private static async getWavBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const sampleRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.max(1, audioBuffer.duration * sampleRate), sampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();
    
    const length = renderedBuffer.length;
    const channelData = renderedBuffer.getChannelData(0);
    const wavBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(wavBuffer);
    
    const writeString = (v: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        v.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, 1, true); 
    view.setUint32(24, sampleRate, true); 
    view.setUint32(28, sampleRate * 2, true); 
    view.setUint16(32, 2, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
    
    const wavBlob = new Blob([view], { type: 'audio/wav' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => {
        resolve((reader.result as string).split(',')[1]);
      };
    });
  }

  // Starts microphone voice recognition using Bhashini ASR
  // Always cancels TTS first and waits 300ms before opening the mic to
  // prevent the bot recording its own synthesised voice (echo/feedback bug).
  static startListening(
    languageCode: SupportedLanguageCode,
    handlers: SpeechRecognitionResultHandler
  ): boolean {
    if (typeof window === 'undefined') return false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      handlers.onError('Microphone speech recognition not available in this browser');
      return false;
    }

    this.stopSpeaking();
    this.stopKeepalive();

    const startRec = async () => {
      try {
        if (this.mediaRecorder) {
          this.stopListening();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioStream = stream;
        this.mediaRecorder = new MediaRecorder(stream);
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          this.isListeningState = false;
          if (this.audioStream) {
            this.audioStream.getTracks().forEach((track) => track.stop());
            this.audioStream = null;
          }

          if (this.audioChunks.length === 0) {
            handlers.onEnd();
            return;
          }

          handlers.onResult('Thinking...', false); // Interim feedback while Bhashini processes

          try {
            const rawBlob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
            const base64data = await this.getWavBase64(rawBlob);

            const res = await fetch('/api/bhashini/asr', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64data, language: languageCode })
            });

            const data = await res.json();
            if (data && data.success && data.text) {
              handlers.onResult(data.text, true);
            } else {
              handlers.onError('Could not understand audio');
            }
          } catch (err) {
            console.error('ASR error:', err);
            handlers.onError('ASR Request failed');
          }
          handlers.onEnd();
        };

        this.mediaRecorder.start();
        this.isListeningState = true;
      } catch (err: any) {
        this.isListeningState = false;
        handlers.onError(err.message || 'Failed to start microphone');
      }
    };

    setTimeout(startRec, 300);
    return true;
  }

  static stopListening(): void {
    if (this.mediaRecorder && this.isListeningState) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
      this.isListeningState = false;
    }
  }
}
