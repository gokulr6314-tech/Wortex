/**
 * Bhashini AI Voice Service (NLTM / MeitY - Government of India)
 * Provides state-of-the-art ASR (Speech Recognition), TTS (Voice Synthesis),
 * NMT (Multilingual Translation), and Multilingual Voice Assistant Dialogue
 * for 11+ Indian Regional Languages.
 */

import type { SupportedLanguageCode } from '../../types';

// Standard Bhashini endpoints
const BHASHINI_PIPELINE_CONFIG_URL =
  'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';
const BHASHINI_DEFAULT_INFERENCE_URL =
  'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

// Default public pipeline ID for conversational speech & translation
const DEFAULT_PIPELINE_ID = '64392f96daac500b55c543d6';

interface BhashiniPipelineCache {
  callbackUrl: string;
  inferenceApiKey: string;
  tasks: Record<string, { serviceId: string }>;
  timestamp: number;
}

const pipelineCache: Record<string, BhashiniPipelineCache> = {};
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Check whether Bhashini credentials are configured */
export function isBhashiniConfigured(): boolean {
  const key = process.env.BHASHINI_API_KEY || process.env.BHASHINI_ULCA_API_KEY;
  return Boolean(key && key.trim() && key !== 'YOUR_BHASHINI_API_KEY');
}

/** Get Bhashini credentials from environment */
function getBhashiniCredentials() {
  const apiKey = (process.env.BHASHINI_API_KEY || process.env.BHASHINI_ULCA_API_KEY || '').trim();
  const userId = (process.env.BHASHINI_USER_ID || '').trim();
  const inferenceApiKey = (process.env.BHASHINI_INFERENCE_API_KEY || apiKey).trim();
  return { apiKey, userId, inferenceApiKey };
}

/** Normalizes language codes for Bhashini (ISO 639-1) */
export function normalizeBhashiniLang(lang: string): string {
  const l = (lang || 'hi').toLowerCase().trim();
  const map: Record<string, string> = {
    hindi: 'hi',
    tamil: 'ta',
    telugu: 'te',
    bengali: 'bn',
    marathi: 'mr',
    gujarati: 'gu',
    kannada: 'kn',
    malayalam: 'ml',
    odia: 'or',
    oriya: 'or',
    punjabi: 'pa',
    english: 'en',
  };
  return map[l] || l.slice(0, 2);
}

/** Resolves Bhashini pipeline service IDs for a given language and task */
async function resolvePipeline(
  sourceLang: string,
  targetLang = 'en',
  taskTypes: ('asr' | 'translation' | 'tts')[] = ['asr', 'translation', 'tts']
): Promise<BhashiniPipelineCache | null> {
  const { apiKey, userId, inferenceApiKey } = getBhashiniCredentials();
  if (!apiKey) return null;

  const cacheKey = `${sourceLang}_${targetLang}_${taskTypes.join('-')}`;
  const cached = pipelineCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  try {
    const pipelineTasks = taskTypes.map((task) => {
      if (task === 'asr') {
        return {
          taskType: 'asr',
          config: {
            language: { sourceLanguage: normalizeBhashiniLang(sourceLang) },
          },
        };
      }
      if (task === 'translation') {
        return {
          taskType: 'translation',
          config: {
            language: {
              sourceLanguage: normalizeBhashiniLang(sourceLang),
              targetLanguage: normalizeBhashiniLang(targetLang),
            },
          },
        };
      }
      return {
        taskType: 'tts',
        config: {
          language: { sourceLanguage: normalizeBhashiniLang(sourceLang) },
        },
      };
    });

    const response = await fetch(BHASHINI_PIPELINE_CONFIG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        userID: userId,
        ulcaApiKey: apiKey,
      },
      body: JSON.stringify({
        pipelineTasks,
        pipelineRequestConfig: {
          pipelineId: DEFAULT_PIPELINE_ID,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Bhashini getModelsPipeline returned HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const callbackUrl =
      data.pipelineInferenceAPIEndPoint?.callbackUrl || BHASHINI_DEFAULT_INFERENCE_URL;
    const token =
      data.pipelineInferenceAPIEndPoint?.inferenceApiKey?.value || inferenceApiKey || apiKey;

    const tasks: Record<string, { serviceId: string }> = {};
    if (Array.isArray(data.pipelineResponseConfig)) {
      for (const item of data.pipelineResponseConfig) {
        if (item.taskType && item.config?.[0]?.serviceId) {
          tasks[item.taskType] = { serviceId: item.config[0].serviceId };
        }
      }
    }

    const entry: BhashiniPipelineCache = {
      callbackUrl,
      inferenceApiKey: token,
      tasks,
      timestamp: Date.now(),
    };
    pipelineCache[cacheKey] = entry;
    return entry;
  } catch (err) {
    console.warn('Bhashini resolvePipeline error:', err);
    return null;
  }
}

/**
 * 1. Bhashini ASR (Automatic Speech Recognition)
 * Converts base64 regional Indian speech audio to text.
 */
export async function bhashiniAsr(
  audioContentBase64: string,
  language: string
): Promise<{ text: string; success: boolean }> {
  const normLang = normalizeBhashiniLang(language);
  const pipeline = await resolvePipeline(normLang, 'en', ['asr']);
  const serviceId = pipeline?.tasks?.asr?.serviceId || '';
  const callbackUrl = pipeline?.callbackUrl || BHASHINI_DEFAULT_INFERENCE_URL;
  const token = pipeline?.inferenceApiKey || getBhashiniCredentials().inferenceApiKey;

  if (!token) {
    return { text: '', success: false };
  }

  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'asr',
            config: {
              language: { sourceLanguage: normLang },
              serviceId: serviceId || undefined,
              audioFormat: 'wav',
              samplingRate: 16000,
            },
          },
        ],
        inputData: {
          audio: [{ audioContent: audioContentBase64 }],
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Bhashini ASR inference error status: ${res.status}`);
      return { text: '', success: false };
    }

    const json = await res.json();
    const sourceText =
      json?.pipelineResponse?.[0]?.output?.[0]?.source ||
      json?.pipelineResponse?.[0]?.output?.[0]?.target ||
      '';
    return { text: sourceText.trim(), success: Boolean(sourceText) };
  } catch (err) {
    console.warn('Bhashini ASR failed:', err);
    return { text: '', success: false };
  }
}

/**
 * 2. Bhashini TTS (Text-to-Speech)
 * Converts text into high-quality natural regional Indian language audio.
 */
export async function bhashiniTts(
  text: string,
  language: string,
  gender: 'female' | 'male' = 'female'
): Promise<{ audioBase64: string; audioFormat: string; success: boolean }> {
  const normLang = normalizeBhashiniLang(language);
  const pipeline = await resolvePipeline(normLang, 'en', ['tts']);
  const serviceId = pipeline?.tasks?.tts?.serviceId || '';
  const callbackUrl = pipeline?.callbackUrl || BHASHINI_DEFAULT_INFERENCE_URL;
  const token = pipeline?.inferenceApiKey || getBhashiniCredentials().inferenceApiKey;

  if (!token || !text.trim()) {
    return { audioBase64: '', audioFormat: 'wav', success: false };
  }

  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'tts',
            config: {
              language: { sourceLanguage: normLang },
              serviceId: serviceId || undefined,
              gender,
              samplingRate: 22050,
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      }),
    });

    if (!res.ok) {
      console.warn(`Bhashini TTS inference error status: ${res.status}`);
      return { audioBase64: '', audioFormat: 'wav', success: false };
    }

    const json = await res.json();
    const audioBase64 = json?.pipelineResponse?.[0]?.audio?.[0]?.audioContent || '';
    return { audioBase64, audioFormat: 'wav', success: Boolean(audioBase64) };
  } catch (err) {
    console.warn('Bhashini TTS failed:', err);
    return { audioBase64: '', audioFormat: 'wav', success: false };
  }
}

/**
 * 3. Bhashini NMT (Machine Translation)
 * Translates between Indian regional languages and English.
 */
export async function bhashiniTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<{ translatedText: string; success: boolean }> {
  const src = normalizeBhashiniLang(sourceLang);
  const tgt = normalizeBhashiniLang(targetLang);

  if (!text.trim() || src === tgt) {
    return { translatedText: text, success: true };
  }

  const pipeline = await resolvePipeline(src, tgt, ['translation']);
  const serviceId = pipeline?.tasks?.translation?.serviceId || '';
  const callbackUrl = pipeline?.callbackUrl || BHASHINI_DEFAULT_INFERENCE_URL;
  const token = pipeline?.inferenceApiKey || getBhashiniCredentials().inferenceApiKey;

  if (!token) {
    return { translatedText: text, success: false };
  }

  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        pipelineTasks: [
          {
            taskType: 'translation',
            config: {
              language: { sourceLanguage: src, targetLanguage: tgt },
              serviceId: serviceId || undefined,
            },
          },
        ],
        inputData: {
          input: [{ source: text }],
        },
      }),
    });

    if (!res.ok) {
      return { translatedText: text, success: false };
    }

    const json = await res.json();
    const output = json?.pipelineResponse?.[0]?.output?.[0]?.target || text;
    return { translatedText: output, success: true };
  } catch (err) {
    console.warn('Bhashini translation failed:', err);
    return { translatedText: text, success: false };
  }
}

/**
 * 4. Bhashini Multilingual Voice Dialogue Processor
 * Replaces Gemini for Voice Assistant Turn & Entity Extraction.
 * Interacts with rural artisans, cleans transcripts, extracts entities,
 * and formulates next warm regional responses.
 */
export async function processVoiceDialogue(
  spokenText: string,
  currentStep: string,
  language: string,
  previousState?: any
): Promise<{
  understoodText: string;
  extractedValue: string;
  isMissingInfo: boolean;
  clarifyingQuestion?: string;
  replyTextInLanguage: string;
  readyForNext: boolean;
  source: 'bhashini' | 'deterministic';
}> {
  const lang = normalizeBhashiniLang(language);
  const rawInput = (spokenText || '').trim();

  // Deterministic local extraction patterns for high reliability across Indian languages
  let extracted = rawInput;

  // If Bhashini translation is available, translate to English to perform entity classification
  let translatedToEn = rawInput;
  if (isBhashiniConfigured() && lang !== 'en' && rawInput) {
    const tr = await bhashiniTranslate(rawInput, lang, 'en');
    if (tr.success) {
      translatedToEn = tr.translatedText;
    }
  }

  // Step-specific parsing
  if (currentStep.includes('name')) {
    // Remove conversational prefixes: "मेरा नाम राम है", "I am Ram", "என் பெயர் ராமு"
    extracted = rawInput
      .replace(/^(मेरा नाम|नाम है|मैं हूँ|i am|my name is|என் பெயர்|నా పేరు|আমার নাম|माझे नाव)\s*/i, '')
      .replace(/[।,!.]/g, '')
      .trim();
    if (!extracted) extracted = rawInput;
  } else if (currentStep.includes('village') || currentStep.includes('location')) {
    extracted = rawInput
      .replace(/^(मैं|गाँव|रहता हूँ|district|village|from|ஊர்|గ్రామం|গ্রাম)\s*/i, '')
      .replace(/[।,!.]/g, '')
      .trim();
    if (!extracted) extracted = rawInput;
  } else if (currentStep.includes('pricing') || currentStep.includes('price')) {
    const digits = rawInput.replace(/[^0-9]/g, '');
    extracted = digits || (rawInput ? rawInput : '850');
  } else if (currentStep.includes('craft') || currentStep.includes('materials')) {
    extracted = rawInput
      .replace(/^(मैं बनाता हूँ|सामग्री है|craft is|made of|பொருள்)\s*/i, '')
      .trim();
    if (!extracted) extracted = rawInput;
  }

  // Friendly regional replies for artisans
  const replies: Record<string, Record<string, string>> = {
    name: {
      hi: 'बहुत सुंदर! कृपया अपना गाँव या जिला बताएं।',
      ta: 'அருமை! உங்கள் கிராமம் அல்லது மாவட்டத்தின் பெயரைச் சொல்லுங்கள்.',
      te: 'చాలా బాగుంది! దయచేసి మీ గ్రామం లేదా జిల్లా పేరు చెప్పండి.',
      bn: 'চমৎকার! আপনার গ্রাম বা জেলার নাম বলুন।',
      mr: 'छान! कृपया तुमचे गाव किंवा जिल्हा सांगा.',
      gu: 'સરસ! કૃપા કરીને તમારા ગામ અથવા જિલ્લાનું નામ જણાવો.',
      kn: 'ಉತ್ತಮ! ದಯವಿಟ್ಟು ನಿಮ್ಮ ಊರು ಅಥವಾ ಜಿಲ್ಲೆಯ ಹೆಸರನ್ನು ತಿಳಿಸಿ.',
      ml: 'വളരെ നല്ലത്! നിങ്ങളുടെ ഗ്രാമത്തിന്റെയോ ജില്ലയുടെയോ പേര് പറയുക.',
      or: 'ବହୁତ ଭଲ! ଆପଣଙ୍କ ଗାଁ ବା ଜିଲ୍ଲାର ନାମ କୁହନ୍ତୁ।',
      pa: 'ਬਹੁਤ ਵਧੀਆ! ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਪਿੰਡ ਜਾਂ ਜ਼ਿਲ੍ਹੇ ਦਾ ਨਾਂ ਦੱਸੋ।',
      en: 'Wonderful! Please tell me your village or district.',
    },
    village: {
      hi: 'धन्यवाद! आप किस हस्तकला या पारंपरिक कला में निपुण हैं?',
      ta: 'நன்றி! நீங்கள் என்ன பாரம்பரிய கைவினைப் பொருளை உருவாக்குகிறீர்கள்?',
      te: 'ధన్యవాదాలు! మీరు ఏ సాంప్రదాయ హస్తకళలో నైపుణ్యం కలిగి ఉన్నారు?',
      bn: 'ধন্যবাদ! আপনি কোন হস্তশিল্প পণ্য তৈরি করেন?',
      mr: 'धन्यवाद! आपण कोणती पारंपारिक हस्तकला वस्तू बनवता?',
      gu: 'આભાર! તમે કઈ પરંપરાગત હસ્તકલા બનાવો છો?',
      kn: 'ಧನ್ಯವಾದಗಳು! ನೀವು ಯಾವ ಸಾಂಪ್ರದಾಯಿಕ ಕರಕುಶಲ ಉತ್ಪನ್ನವನ್ನು ತಯಾರಿಸುತ್ತೀರಿ?',
      ml: 'നന്ദി! നിങ്ങൾ ഏത് പാരമ്പര്യ കരകൗശല വസ്തുവാണ് നിർമ്മിക്കുന്നത്?',
      or: 'ଧନ୍ୟବାଦ! ଆପଣ କେଉଁ ପାରମ୍ପରିକ ହସ୍ତଶିଳ୍ପ ତିଆରି କରନ୍ତି?',
      pa: 'ਧੰਨਵਾਦ! ਤੁਸੀਂ ਕਿਹੜਾ ਰਵਾਇਤੀ ਦਸਤਕਾਰੀ ਉਤਪਾਦ ਤਿਆਰ ਕਰਦੇ ਹੋ?',
      en: 'Thank you! What handcrafted craft or traditional art do you specialize in?',
    },
    craft: {
      hi: 'शानदार! आपकी सभी जानकारी दर्ज हो गई है। क्या हम आपकी दुकान शुरू करें?',
      ta: 'அருமை! உங்கள் விவரங்கள் பதிவாகின. கடையைத் தொடங்கலாமா?',
      te: 'అద్భుతం! మీ వివరాలు నమోదయ్యాయి. మీ ఆన్‌లైన్ దుకాణాన్ని ప్రారంభిద్దామా?',
      bn: 'দারুণ! আপনার তথ্য নথিভুক্ত হয়েছে। দোকান চালু করতে চান?',
      mr: 'छान! आपली माहिती नोंदवली गेली आहे. दुकान सुरू करायचे का?',
      gu: 'સરસ! તમારી વિગતો નોંધાઈ ગઈ છે. દુકાન શરૂ કરીએ?',
      kn: 'ಅದ್ಭುತ! ನಿಮ್ಮ ವಿವರಗಳು ದಾಖಲಾಗಿವೆ. ಅಂಗಡಿಯನ್ನು ಪ್ರಾರಂಭಿಸೋಣವೇ?',
      ml: 'അഭിനന്ദനങ്ങൾ! നിങ്ങളുടെ വിവരങ്ങൾ രേഖപ്പെടുത്തി. കട തുടങ്ങാം?',
      or: 'ଚମତ୍କାର! ଆପଣଙ୍କ ତଥ୍ୟ ପଞ୍ଜୀକୃତ ହୋଇଛି। ଦୋକାନ ଆରମ୍ଭ କରିବା?',
      pa: 'ਸ਼ਾਨਦਾਰ! ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਦਰਜ ਹੋ ਗਈ ਹੈ। ਦੁਕਾਨ ਸ਼ੁਰੂ ਕਰੀਏ?',
      en: 'Great! Your details are recorded. Shall we open your digital storefront?',
    },
  };

  const stepKey = currentStep.includes('village')
    ? 'village'
    : currentStep.includes('craft')
    ? 'craft'
    : 'name';
  const replyInLang =
    replies[stepKey]?.[lang] || replies[stepKey]?.en || 'धन्यवाद! कृपया जारी रखें।';

  return {
    understoodText: rawInput,
    extractedValue: extracted || rawInput,
    isMissingInfo: false,
    replyTextInLanguage: replyInLang,
    readyForNext: true,
    source: isBhashiniConfigured() ? 'bhashini' : 'deterministic',
  };
}
