import React, { useEffect, useState } from 'react';
import { Globe, Check, Sparkles, Volume2 } from 'lucide-react';
import { SupportedLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, TRANSLATIONS } from '../lib/languages';
import { SpeechService } from '../lib/speech';
import { VoiceAssistantOrb } from './VoiceAssistantOrb';

interface LanguageSelectorProps {
  selectedLanguage: SupportedLanguageCode;
  onSelectLanguage: (lang: SupportedLanguageCode) => void;
  onProceed: (lang: SupportedLanguageCode) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorProps> = ({
  selectedLanguage = 'en',
  onSelectLanguage,
  onProceed,
  isModal = false,
  onClose,
}) => {
  const [activeLang, setActiveLang] = useState<SupportedLanguageCode>(selectedLanguage || 'en');

  const t = TRANSLATIONS[activeLang] || TRANSLATIONS.en;
  const currentLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === activeLang) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;

  // Speak initial prompt asking for language upon opening
  useEffect(() => {
    const timer = setTimeout(() => {
      SpeechService.speak(
        'Please say your language. कृपया अपनी भाषा बोलें।',
        'en'
      );
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleLanguageClick = (langCode: SupportedLanguageCode) => {
    setActiveLang(langCode);
    onSelectLanguage(langCode);
    onProceed(langCode);
  };

  const handleVoiceInput = (text: string) => {
    const lower = text.toLowerCase().trim();

    const matchMap: Record<SupportedLanguageCode, string[]> = {
      hi: ['hindi', 'hindustani', 'हिन्दी', 'हिंदी'],
      ta: ['tamil', 'thamizh', 'tamizh', 'தமிழ்'],
      te: ['telugu', 'thesugu', 'తెలుగు'],
      bn: ['bengali', 'bangla', 'বাংলা'],
      mr: ['marathi', 'मराठी'],
      gu: ['gujarati', 'gujrati', 'ગુજરાતી'],
      kn: ['kannada', 'kannad', 'ಕನ್ನಡ'],
      ml: ['malayalam', 'malayali', 'മലയാളം'],
      or: ['odia', 'oriya', 'ଓଡ଼ିଆ'],
      pa: ['punjabi', 'panjabi', 'ਪੰਜਾਬੀ'],
      en: ['english', 'angrezi', 'inglish'],
    };

    let matchedCode: SupportedLanguageCode | null = null;
    for (const [code, terms] of Object.entries(matchMap)) {
      if (terms.some((term) => lower.includes(term))) {
        matchedCode = code as SupportedLanguageCode;
        break;
      }
    }

    if (!matchedCode) {
      const found = SUPPORTED_LANGUAGES.find(
        (l) =>
          lower.includes(l.name.toLowerCase()) ||
          lower.includes(l.nativeName.toLowerCase()) ||
          lower.includes(l.code.toLowerCase())
      );
      if (found) matchedCode = found.code;
    }

    if (matchedCode) {
      setActiveLang(matchedCode);
      onSelectLanguage(matchedCode);
      onProceed(matchedCode);
    }
  };

  const spokenPrompt = 'Please say your language • कृपया अपनी भाषा बोलें • தயவுசெய்து உங்கள் மொழியைச் சொல்லுங்கள்';

  return (
    <div className="w-full max-w-xl mx-auto py-2">
      <div className="relative">
        {/* Close Button for Modal Mode */}
        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#2D422D] flex items-center justify-center font-bold text-xs shadow-sm border border-white/80 transition-transform active:scale-95 cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        )}

        {/* Voice Assistant Header Prompt / Tap To Speak Card */}
        <VoiceAssistantOrb
          currentPrompt={spokenPrompt}
          language={activeLang}
          onVoiceResult={handleVoiceInput}
          stepHint="Voice Language Selection"
          suggestedPhrases={[
            'English',
            'हिन्दी',
            'தமிழ்',
            'తెలుగు',
            'বাংলা',
            'मराठी',
          ]}
        />

        {/* Mobile-Friendly Language Selection Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = activeLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageClick(lang.code)}
                className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#2d6a4f] text-white border-[#1b4332] shadow-md ring-2 ring-[#52b788]'
                    : 'bg-white/80 hover:bg-white text-[#1b4332] border-white/60 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-sm leading-tight">{lang.nativeName}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#455A45]'}`}>
                  {lang.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sleek Minimalist Continue Bar */}
        <div className="flex items-center justify-between gap-3 bg-white/85 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/70 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
          <div className="text-xs font-medium text-[#455A45]">
            Selected: <span className="font-extrabold text-[#2d6a4f]">{currentLangConfig.nativeName} ({currentLangConfig.name})</span>
          </div>
          <button
            type="button"
            onClick={() => onProceed(activeLang)}
            className="px-5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 bg-[#2d6a4f] hover:bg-[#1b4332] text-white shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <span>Continue</span>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
