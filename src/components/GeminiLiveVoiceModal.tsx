import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  Volume2,
  CheckCircle2,
  Send,
  Sparkles,
} from 'lucide-react';
import { SupportedLanguageCode, ProductListing } from '../types';
import { SpeechService } from '../lib/speech';
import { SUPPORTED_LANGUAGES } from '../lib/languages';

interface GeminiLiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: SupportedLanguageCode;
  onProductCreated: (product: ProductListing) => void;
  isMuted: boolean;
  initialPhotoUrl?: string | null;
}

type TurnStep = 'product_name' | 'craft_materials' | 'pricing' | 'confirmation';

interface DraftCatalogueData {
  productName: string;
  craftAndMaterials: string;
  price: number;
  category: string;
}

interface StepConfigItem {
  stepIndex: number;
  label: Record<SupportedLanguageCode, string>;
  assistantPrompt: (lang: SupportedLanguageCode, draftData: DraftCatalogueData) => string;
  fallbackKeywords: (lang: SupportedLanguageCode) => string[];
}

const STEP_CONFIGS: Record<TurnStep, StepConfigItem> = {
  product_name: {
    stepIndex: 1,
    label: {
      hi: 'उत्पाद का नाम',
      ta: 'பொருள் பெயர்',
      te: 'వస్తువు పేరు',
      bn: 'পণ্যের নাম',
      mr: 'वस्तूचे नाव',
      gu: 'વસ્તુનું નામ',
      kn: 'ಉತ್ಪನ್ನದ ಹೆಸರು',
      ml: 'ഉൽപ്പന്ന പേര്',
      or: 'ସାମଗ୍ରୀ ନାମ',
      pa: 'ਉਤਪਾਦ ਦਾ ਨਾਂ',
      en: 'Product Name',
    },
    assistantPrompt: (lang) => {
      switch (lang) {
        case 'hi':
          return 'नमस्ते! आपका स्वागत है। आज आप कौन सा हस्तशिल्प उत्पाद बना रहे हैं?';
        case 'ta':
          return 'வணக்கம்! உங்கள் புதிய பொருளைப் பட்டியலிடுவோம். இன்று நீங்கள் என்ன கைவினைப் பொருளை உருவாக்குகிறீர்கள்?';
        case 'te':
          return 'నమస్కారం! ఈరోజు మీరు ఏ హస్తకళా వస్తువును తయారు చేస్తున్నారు?';
        case 'bn':
          return 'নমস্কার! আজ আপনি কোন ঐতিহ্যবাহী হস্তশিল্প পণ্যটি তৈরি করছেন?';
        case 'mr':
          return 'नमस्कार! आज आपण कोणती हस्तकला वस्तू तयार करत आहात?';
        case 'gu':
          return 'નમસ્તે! આજે તમે કઈ હસ્તકલા વસ્તુ બનાવી રહ્યા છો?';
        case 'kn':
          return 'ನಮಸ್ಕಾರ! ಇಂದು ನೀವು ಯಾವ ಕರಕುಶಲ ಉತ್ಪನ್ನವನ್ನು ತಯಾರಿಸುತ್ತಿದ್ದೀರಿ?';
        case 'ml':
          return 'നമസ്കാരം! ഇന്ന് നിങ്ങൾ ഏത് കരകൗശല ഉൽപ്പന്നമാണ് നിർമ്മിക്കുന്നത്?';
        case 'or':
          return 'ନମସ୍କାର! ଆଜି ଆପଣ କେଉଁ ହସ୍ତଶିଳ୍ପ ସାମଗ୍ରୀ ତିଆରି କରୁଛନ୍ତି?';
        case 'pa':
          return 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਅੱਜ ਤੁਸੀਂ ਕਿਹੜਾ ਦਸਤਕਾਰੀ ਉਤਪਾਦ ਤਿਆਰ ਕਰ ਰਹੇ ਹੋ?';
        default:
          return "Welcome! Let's list your new product. What handcrafted item are you making today?";
      }
    },
    fallbackKeywords: (lang) => {
      switch (lang) {
        case 'hi':
          return ['मिट्टी का फूलदान', 'पीतल का दीया', 'हथकरघा सिल्क शॉल', 'बांस की टोकरी'];
        case 'ta':
          return ['மண்பாண்ட மலர் குவளை', 'பித்தளை விளக்கு', 'பட்டு சால்வை', 'மூங்கில் கூடை'];
        case 'te':
          return ['మట్టి పూల కుండీ', 'ఇత్తడి దీపం', 'చేనేత పట్టు శాలువా', 'వెదురు బుట్ట'];
        case 'bn':
          return ['মাটির ফুলদানি', 'পিতলের প্রদীপ', 'রেশম শাল', 'বাঁশের ঝুড়ি'];
        case 'mr':
          return ['मातीची फुलदाणी', 'पितळी दिवा', 'पैठणी शाल', 'बांबूची टोपली'];
        case 'gu':
          return ['માટીનો કૂંજો', 'પિત્તળનો દીવો', 'પાટોળા શાલ', 'વાંસની ટોપલી'];
        case 'kn':
          return ['ಮಣ್ಣಿನ ಹೂದಾನಿ', 'ಹಿತ್ತಾಳೆ ದೀಪ', 'ರೇಷ್ಮೆ ಶಾಲು', 'ಬಿದಿರಿನ ಬುಟ್ಟಿ'];
        case 'ml':
          return ['മൺപാത്രം', 'പിച്ചള വിളക്ക്', 'പട്ടുശാല്', 'മുളങ്കൂട'];
        case 'or':
          return ['ମାଟି ଫୁଲଦାନୀ', 'ପିତ୍ତଳ ଦୀପ', 'ସମ୍ବଲପୁରୀ ଶାଲ୍', 'ବାଉଁଶ ଟୋକେଇ'];
        case 'pa':
          return ['ਮਿੱਟੀ ਦਾ ਗੁਲਦਸਤਾ', 'ਪਿੱਤਲ ਦਾ ਦੀਵਾ', 'ਫੁਲਕਾਰੀ ਸ਼ਾਲ', 'ਬਾਂਸ ਦੀ ਟੋਕਰੀ'];
        default:
          return ['Terracotta Floral Vase', 'Carved Brass Bell', 'Handloom Silk Shawl', 'Bamboo Craft Basket'];
      }
    },
  },
  craft_materials: {
    stepIndex: 2,
    label: {
      hi: 'सामग्री व तकनीक',
      ta: 'மூலப்பொருட்கள்',
      te: 'పదార్థాలు & నైపుణ్యం',
      bn: 'উপাদান ও কৌশল',
      mr: 'सामग्री आणि तंत्र',
      gu: 'સામગ્રી અને પદ્ધતિ',
      kn: 'ಸಾಮಗ್ರಿಗಳು ಮತ್ತು ತಂತ್ರ',
      ml: 'സാമഗ്രികൾ',
      or: 'ସାମଗ୍ରୀ ଓ କୌଶଳ',
      pa: 'ਸਮੱਗਰੀ ਅਤੇ ਤਕਨੀਕ',
      en: 'Craft & Materials',
    },
    assistantPrompt: (lang, draft) => {
      const item = draft.productName || (lang === 'hi' ? 'आपका उत्पाद' : 'your item');
      switch (lang) {
        case 'hi':
          return `बहुत बढ़िया, ${item}। इसे बनाने में आपने कौन सी सामग्री और तकनीक का उपयोग किया?`;
        case 'ta':
          return `அருமை, ${item}! இதை உருவாக்க நீங்கள் என்ன மூலப்பொருட்கள் மற்றும் பாரம்பரிய நுட்பங்களை பயன்படுத்தினீர்கள்?`;
        case 'te':
          return `చాలా బాగుంది, ${item}! దీన్ని తయారు చేయడానికి మీరు ఏ సహజ పదార్థాలు మరియు సాంకేతికత వాడారు?`;
        case 'bn':
          return `চমৎকার, ${item}! এটি তৈরি করতে আপনি কোন উপাদান ও ঐতিহ্যবাহী কৌশল ব্যবহার করেছেন?`;
        case 'mr':
          return `छान, ${item}! ही वस्तू बनवण्यासाठी कोणती सामग्री आणि पारंपारिक तंत्र वापरले?`;
        case 'gu':
          return `સરસ, ${item}! આ બનાવવા માટે તમે કઈ સામગ્રી અને પદ્ધતિનો ઉપયોગ કર્યો?`;
        case 'kn':
          return `ಉತ್ತಮ, ${item}! ಇದನ್ನು ತಯಾರಿಸಲು ಯಾವ ಸಾಮಗ್ರಿಗಳು ಮತ್ತು ತಂತ್ರಗಳನ್ನು ಬಳಸಿದ್ದೀರಿ?`;
        case 'ml':
          return `വളരെ നല്ലത്, ${item}! ഇത് നിർമ്മിക്കാൻ എന്തെല്ലാം സാമഗ്രികളും സാങ്കേതികതയുമാണ് ഉപയോഗിച്ചത്?`;
        case 'or':
          return `ବହୁତ ଭଲ, ${item}! ଏହାକୁ ତିଆରି କରିବା ପାଇଁ କେଉଁ ସାମଗ୍ରୀ ଓ କୌଶଳ ବ୍ୟବହାର କରିଛନ୍ତି?`;
        case 'pa':
          return `ਬਹੁਤ ਵਧੀਆ, ${item}! ਇਸਨੂੰ ਬਣਾਉਣ ਲਈ ਕਿਹੜੀ ਸਮੱਗਰੀ ਅਤੇ ਰਵਾਇਤੀ ਤਰੀਕਾ ਵਰਤਿਆ ਗਿਆ ਹੈ?`;
        default:
          return `Got it, a ${item}. What materials and techniques did you use to craft it?`;
      }
    },
    fallbackKeywords: (lang) => {
      switch (lang) {
        case 'hi':
          return ['प्राकृतिक चिकनी मिट्टी, भट्टी में पकी', 'शुद्ध रेशम, सोने की ज़री', 'ठोस पीतल, हाथ से नक्काशी', 'प्राकृतिक उपचारित बांस'];
        case 'ta':
          return ['களிமண் மற்றும் இயற்கை வண்ணங்கள்', 'சுத்தமான பட்டு மற்றும் ஜரிகை', 'பாரம்பரிய பித்தளை வேலைப்பாடு', 'இயற்கை மூங்கில் நார்கள்'];
        case 'te':
          return ['సహజమైన మట్టి, సాంప్రదాయ కొలిమి', 'స్వచ్ఛమైన పట్టు, బంగారు జరీ', 'ఇత్తడి లోహం, చేతి చెక్కడాలు', 'వెదురు బద్దలు'];
        case 'bn':
          return ['নদীর পলিমাটি ও পোড়ামাটি', 'খাঁটি তসর রেশম ও জরি', 'পিতল খোদাই কাজ', 'প্রাকৃতিক বাঁশ'];
        case 'mr':
          return ['नैसर्गिक चिकणमाती, भट्टीमध्ये भाजलेली', 'शुद्ध रेशीम आणि जरी', 'पितळ नक्षीकाम', 'नैसर्गिक बांबू'];
        case 'gu':
          return ['કુદરતી માટી, ભઠ્ઠીમાં પકવેલી', 'શુદ્ધ રેશમ અને જરીકામ', 'નકશીદાર પિત્તળ', 'કુદરતી વાંસ'];
        case 'kn':
          return ['ನೈಸರ್ಗಿಕ ಜೇಡಿಮಣ್ಣು', 'ಶುದ್ಧ ರೇಷ್ಮೆ ಮತ್ತು ಜರಿ', 'ಹಿತ್ತಾಳೆ ಕೆತ್ತನೆ ಕೆಲಸ', 'ಬಿದಿರು'];
        case 'ml':
          return ['സ്വാഭാവിക കളിമണ്ണ്', 'ശുദ്ധമായ പട്ട്, കസവ്', 'പിച്ചള കൊത്തുപണി', 'പ്രകൃതിദത്ത മുള'];
        case 'or':
          return ['ପ୍ରାକୃତିକ ନଦୀ ମାଟି', 'ଶୁଦ୍ଧ ରେଶମ ଓ ଜରି', 'ପିତ୍ତଳ ହସ୍ତକଳା', 'ବାଉଁଶ'];
        case 'pa':
          return ['ਕੁਦਰਤੀ ਚੀਕਣੀ ਮਿੱਟੀ', 'ਰੇਸ਼ਮੀ ਧਾਗੇ ਅਤੇ ਤਿੱਲਾ', 'ਪਿੱਤਲ ਨੱਕਾਸ਼ੀ', 'ਬਾਂਸ'];
        default:
          return ['Natural riverbed clay, pit fired', 'Pure mulberry silk, gold zari threads', 'Solid virgin brass, hand engraved', 'Organic treated bamboo reeds'];
      }
    },
  },
  pricing: {
    stepIndex: 3,
    label: {
      hi: 'मूल्य निर्धारण',
      ta: 'விலை நிர்ணயம்',
      te: 'ధర నిర్ణయం',
      bn: 'মূল্য নির্ধারণ',
      mr: 'किंमत निर्धारण',
      gu: 'કિંમત નિર્ધારણ',
      kn: 'ಬೆಲೆ ನಿಗದಿ',
      ml: 'വില നിശ്ചയിക്കൽ',
      or: 'ମୂଲ୍ୟ ନିର୍ଦ୍ଧାରଣ',
      pa: 'ਮੁੱਲ ਨਿਰਧਾਰਨ',
      en: 'Pricing & Value',
    },
    assistantPrompt: (lang) => {
      switch (lang) {
        case 'hi':
          return 'शानदार। इस उत्पाद के लिए आप कितने रुपये मूल्य रखना चाहते हैं?';
        case 'ta':
          return 'அற்புதம்! இந்த கைவினைப் பொருளுக்கு நீங்கள் என்ன விலை நிர்ணயிக்க விரும்புகிறீர்கள்?';
        case 'te':
          return 'అద్భుతం! ఈ వస్తువుకు మీరు ఎన్ని రూపాయల ధర నిర్ణయించాలనుకుంటున్నారు?';
        case 'bn':
          return 'সুন্দর! এই পণ্যের জন্য আপনি কত টাকা দাম রাখতে চান?';
        case 'mr':
          return 'उत्तम! या वस्तूसाठी आपण किती रुपये किंमत ठेवू इच्छिता?';
        case 'gu':
          return 'ઉત્તમ! આ વસ્તુ માટે તમે કેટલા રૂપિયા કિંમત રાખવા માંગો છો?';
        case 'kn':
          return 'ಅದ್ಭುತ! ಈ ವಸ್ತುವಿಗೆ ನೀವು ಎಷ್ಟು ರೂಪಾಯಿ ಬೆಲೆ ನಿಗದಿಪಡಿಸಲು ಬಯಸುತ್ತೀರಿ?';
        case 'ml':
          return 'ഈ ഉൽപ്പന്നത്തിന് എത്ര രൂപയാണ് നിങ്ങൾ വിലയായി നിശ്ചയിക്കുന്നത്?';
        case 'or':
          return 'ଏହି ସାମଗ୍ରୀ ପାଇଁ ଆପଣ କେତେ ଟଙ୍କା ମୂଲ୍ୟ ରଖିବାକୁ ଚାହାଁନ୍ତି?';
        case 'pa':
          return 'ਵਧੀਆ! ਇਸ ਉਤਪਾਦ ਲਈ ਤੁਸੀਂ ਕਿੰਨੇ ਰੁਪਏ ਮੁੱਲ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?';
        default:
          return 'Beautiful. What price would you like to set for this item in rupees?';
      }
    },
    fallbackKeywords: () => ['₹450', '₹850', '₹1,250', '₹1,800', '₹2,500'],
  },
  confirmation: {
    stepIndex: 4,
    label: {
      hi: 'अंतिम पुष्टि',
      ta: 'இறுதி உறுதிப்படுத்தல்',
      te: 'తుది నిర్ధారణ',
      bn: 'চূড়ান্ত নিশ্চিতকরণ',
      mr: 'अंतिम पुष्टी',
      gu: 'અંતિમ પુષ્ટિ',
      kn: 'ಅಂತಿಮ ದೃಢೀಕರಣ',
      ml: 'അന്തിമ സ്ഥിരീകരണം',
      or: 'ଚୂଡ଼ାନ୍ତ ନିଶ୍ଚିତତା',
      pa: 'ਅੰਤਿਮ ਪੁਸ਼ਟੀ',
      en: 'Final Confirmation',
    },
    assistantPrompt: (lang, draft) => {
      const item = draft.productName || (lang === 'hi' ? 'हस्तशिल्प उत्पाद' : 'handcrafted item');
      const price = draft.price || 850;
      switch (lang) {
        case 'hi':
          return `बहुत खूब! आपका ${item} ₹${price} में ओएनडीसी और ग्लोबल सिंक के साथ कैटलॉग में जुड़ गया है।`;
        case 'ta':
          return `வாழ்த்துகள்! உங்கள் ${item} ₹${price} விலையில் ONDC உடன் வெற்றிகரமாகப் பட்டியலிடப்பட்டது.`;
        case 'te':
          return `అభినಂದనలు! మీ ${item} ₹${price} ధరకు ONDC నెట్‌వర్క్‌లో విజయవంతంగా చేర్చబడింది.`;
        case 'bn':
          return `অভিনন্দন! আপনার ${item} ₹${price} মূল্যে ONDC-তে যুক্ত হয়েছে।`;
        case 'mr':
          return `अभिनंदन! आपली ${item} ₹${price} मध्ये ONDC वर यशस्वीपणे जोडली गेली आहे.`;
        case 'gu':
          return `અભિનંદન! તમારું ${item} ₹${price} કિંમતે ONDC સાથે સફળતાપૂર્વક જોડાઈ ગયું છે.`;
        case 'kn':
          return `ಅಭಿನಂದನೆಗಳು! ನಿಮ್ಮ ${item} ₹${price} ಬೆಲೆಯೊಂದಿಗೆ ONDC ಯಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ಪಟ್ಟಿಯಾಗಿದೆ.`;
        case 'ml':
          return `അഭിനന്ദനങ്ങൾ! നിങ്ങളുടെ ${item} ₹${price} വിലയിൽ ONDC-യിൽ വിജയകരമായി ലിസ്റ്റ് ചെയ്തു.`;
        case 'or':
          return `ଅଭିନନ୍ଦନ! ଆପଣଙ୍କ ${item} ₹${price} ରେ ONDC ସହ ସଫଳତାର ସହିତ ଯୋଡି ହୋଇଗଲା।`;
        case 'pa':
          return `ਮੁਬਾਰਕਾਂ! ਤੁਹਾਡਾ ${item} ₹${price} ਮੁੱਲ ਤੇ ONDC ਤੇ ਸਫਲਤਾਪੂਰਵਕ ਦਰਜ ਹੋ ਗਿਆ ਹੈ।`;
        default:
          return `Fantastic! Your ${item} has been catalogued at ₹${price} with ONDC & global sync ready.`;
      }
    },
    fallbackKeywords: () => ['View in Catalogue', 'Publish to ONDC'],
  },
};

export const GeminiLiveVoiceModal: React.FC<GeminiLiveVoiceModalProps> = ({
  isOpen,
  onClose,
  language,
  onProductCreated,
  isMuted,
  initialPhotoUrl,
}) => {
  // Visible UI State
  const [currentStep, setCurrentStep] = useState<TurnStep>('product_name');
  const [assistantState, setAssistantState] = useState<'speaking' | 'listening' | 'thinking' | 'idle'>('idle');
  const [currentSpokenPrompt, setCurrentSpokenPrompt] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [manualInput, setManualInput] = useState<string>('');
  const [isSuccessAnimated, setIsSuccessAnimated] = useState<boolean>(false);

  // Collected Product Entity Draft
  const [draftProduct, setDraftProduct] = useState<DraftCatalogueData>({
    productName: '',
    craftAndMaterials: '',
    price: 850,
    category: 'Handicraft',
  });

  // ---------------------------------------------------------------------------
  // CRITICAL FIX FOR FREEZING & INFINITE RE-RENDER / RAF LOOPS:
  // Using stable refs so callbacks, audio listeners, and animation frame loops
  // never trigger cyclic re-render cascades on the React main thread.
  // ---------------------------------------------------------------------------
  const isDestroyedRef = useRef<boolean>(false);
  const currentStepRef = useRef<TurnStep>('product_name');
  const draftProductRef = useRef<DraftCatalogueData>(draftProduct);
  const assistantStateRef = useRef<'speaking' | 'listening' | 'thinking' | 'idle'>('idle');
  const languageRef = useRef<SupportedLanguageCode>(language);
  const isMutedRef = useRef<boolean>(isMuted);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSpokenThisTurnRef = useRef<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Keep refs synchronized with props/state
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    draftProductRef.current = draftProduct;
  }, [draftProduct]);

  useEffect(() => {
    assistantStateRef.current = assistantState;
  }, [assistantState]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Clean all pending timers
  const clearAllTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (noSpeechTimeoutRef.current) {
      clearTimeout(noSpeechTimeoutRef.current);
      noSpeechTimeoutRef.current = null;
    }
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
  }, []);

  // Immediate abort for audio, mic, and visualizer loops
  const abortAudioAndMic = useCallback(() => {
    isDestroyedRef.current = true;
    clearAllTimers();

    // 1. Abort speech synthesis
    SpeechService.stopSpeaking();

    // 2. Abort speech recognition safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    // 3. Stop microphone media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 4. Close AudioContext without throwing
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    // 5. CRITICAL FIX: Cancel single animation frame loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    assistantStateRef.current = 'idle';
    setAssistantState('idle');
  }, [clearAllTimers]);

  // Handle user tapping "✕" to dismiss immediately
  const handleCancelAndClose = useCallback(() => {
    abortAudioAndMic();
    onClose();
  }, [abortAudioAndMic, onClose]);

  // Declare activateHandsFreeListening and executeTurn signatures
  const activateHandsFreeListeningRef = useRef<(delayMs?: number) => void>(() => {});
  const executeTurnRef = useRef<(step: TurnStep, draft: DraftCatalogueData) => void>(() => {});

  // Process turn answer and transition
  const processTurnAnswer = useCallback((spokenAnswer: string) => {
    clearAllTimers();
    if (isDestroyedRef.current) return;
    const trimmed = spokenAnswer.trim();
    if (!trimmed) return;

    assistantStateRef.current = 'thinking';
    setAssistantState('thinking');

    const step = currentStepRef.current;
    const currentDraft = draftProductRef.current;

    if (step === 'product_name') {
      const cleanedName = trimmed.replace(/^(I am making|Making a|This is a|मेरा उत्पाद|यह है)\s*/i, '');
      const updated: DraftCatalogueData = { ...currentDraft, productName: cleanedName || trimmed };
      setDraftProduct(updated);
      draftProductRef.current = updated;

      setTimeout(() => {
        if (isDestroyedRef.current) return;
        setCurrentStep('craft_materials');
        currentStepRef.current = 'craft_materials';
        executeTurnRef.current('craft_materials', updated);
      }, 500);
    } else if (step === 'craft_materials') {
      const updated: DraftCatalogueData = { ...currentDraft, craftAndMaterials: trimmed };
      setDraftProduct(updated);
      draftProductRef.current = updated;

      setTimeout(() => {
        if (isDestroyedRef.current) return;
        setCurrentStep('pricing');
        currentStepRef.current = 'pricing';
        executeTurnRef.current('pricing', updated);
      }, 500);
    } else if (step === 'pricing') {
      const digits = trimmed.replace(/[^0-9]/g, '');
      const parsedPrice = digits ? parseInt(digits, 10) : 850;
      const updated: DraftCatalogueData = { ...currentDraft, price: parsedPrice > 0 ? parsedPrice : 850 };
      setDraftProduct(updated);
      draftProductRef.current = updated;

      setTimeout(() => {
        if (isDestroyedRef.current) return;
        setCurrentStep('confirmation');
        currentStepRef.current = 'confirmation';
        executeTurnRef.current('confirmation', updated);
      }, 500);
    }
  }, [clearAllTimers]);

  const activateHandsFreeListening = useCallback((delayMs: number = 0) => {
    if (isDestroyedRef.current || typeof window === 'undefined') return;

    const startNow = () => {
      if (isDestroyedRef.current) return;

      // CRITICAL ECHO FIX: Make absolutely sure TTS has stopped before opening mic
      SpeechService.stopSpeaking();

      assistantStateRef.current = 'listening';
      setAssistantState('listening');
      setLiveTranscript('');
      hasSpokenThisTurnRef.current = false;
      clearAllTimers();

      // 6-Second gentle reminder timeout
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isDestroyedRef.current) return;
        if (!hasSpokenThisTurnRef.current && assistantStateRef.current === 'listening') {
          const lang = languageRef.current;
          const reminder =
            lang === 'hi'
              ? 'कारीगर जी, मैं सुन रही हूँ। कृपया अपने उत्पाद के बारे में बताएं।'
              : "I'm listening whenever you are ready. Tell me about your product.";

          SpeechService.stopSpeaking();
          SpeechService.speak(
            reminder,
            lang,
            () => {
              if (!isDestroyedRef.current) {
                assistantStateRef.current = 'speaking';
                setAssistantState('speaking');
              }
            },
            () => {
              if (!isDestroyedRef.current) {
                activateHandsFreeListeningRef.current(350);
              }
            }
          );
        }
      }, 6000);

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) return;

      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
            // ignore
          }
        }

        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;

        const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === languageRef.current);
        recognition.lang = langConfig ? langConfig.speechLocale : 'en-IN';

        recognition.onresult = (event: any) => {
          if (isDestroyedRef.current) return;
          let interim = '';
          let final = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }

          const activeText = (final || interim).trim();
          if (activeText) {
            setLiveTranscript(activeText);
            hasSpokenThisTurnRef.current = true;

            // Clear 6-second timeout since user is speaking
            if (noSpeechTimeoutRef.current) {
              clearTimeout(noSpeechTimeoutRef.current);
              noSpeechTimeoutRef.current = null;
            }

            // Reset 1.5s silence VAD timer
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }

            silenceTimerRef.current = setTimeout(() => {
              if (isDestroyedRef.current) return;
              try {
                recognition.stop();
              } catch {
                // ignore
              }
              processTurnAnswer(activeText);
            }, 1500);
          }
        };

        recognition.onerror = (err: any) => {
          if (err.error !== 'no-speech') {
            console.warn('Recognition warning:', err.error);
          }
        };

        recognition.start();
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    };

    if (delayMs > 0) {
      setTimeout(startNow, delayMs);
    } else {
      startNow();
    }
  }, [clearAllTimers, processTurnAnswer]);

  activateHandsFreeListeningRef.current = activateHandsFreeListening;

  // Execute a specific conversational turn
  const executeTurn = useCallback((step: TurnStep, draft: DraftCatalogueData) => {
    if (isDestroyedRef.current) return;
    clearAllTimers();

    // CHROME DESKTOP TTS FIX: Resume synthesis before every speak() call
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }

    const lang = languageRef.current;
    const cfg = STEP_CONFIGS[step];
    const question = cfg.assistantPrompt(lang, draft);
    setCurrentSpokenPrompt(question);

    assistantStateRef.current = 'speaking';
    setAssistantState('speaking');

    // Turn 4: Final Confirmation
    if (step === 'confirmation') {
      const retailPrice = Math.round(draft.price * 1.35);
      const newProduct: ProductListing = {
        id: `prod_voice_${Date.now()}`,
        artisanId: 'artisan_001',
        artisanName: 'Ramvati Devi',
        artisanCraft: draft.craftAndMaterials || 'Handcrafted Heritage Art',
        artisanVillage: 'Gorakhpur',
        artisanState: 'Uttar Pradesh',
        originalLanguage: lang,
        rawVoiceTranscript: `${draft.productName}. Craft: ${draft.craftAndMaterials}. Asked price: ₹${draft.price}`,
        // Use the artisan's actual uploaded/captured photo when available instead
        // of the default AI-studio sample imagery.
        rawPhotoUrl:
          initialPhotoUrl ||
          'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
        studioPhotoUrl:
          initialPhotoUrl ||
          'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=85',
        imageEnhanced: !initialPhotoUrl,
        title: `Handmade ${draft.productName}`,
        seoTitle: `Authentic Handcrafted ${draft.productName} | Fair Trade Artisan Creation`,
        description: `Meticulously handcrafted ${draft.productName} created using ${draft.craftAndMaterials || 'traditional techniques'}. Directly listed by the artisan with verified authenticity.`,
        culturalStory: `Carrying generations of traditional artistic mastery, each ${draft.productName} preserves timeless regional craft traditions.`,
        craftTechnique: draft.craftAndMaterials || 'Traditional Hand Sculpting',
        materials: [draft.craftAndMaterials || 'Natural Alluvial Clay', 'Organic Mineral Dyes'],
        dimensions: 'Standard Artisan Sizing',
        careInstructions: 'Handle with care. Clean with dry cloth.',
        tags: ['Handcrafted', 'ONDC Linked', 'Artisan Direct', 'KarigarSetu'],
        giTagStatus: 'GI Certified Craft Candidate',
        artisanPrice: draft.price,
        suggestedMarketPrice: Math.round(draft.price * 1.5),
        retailPrice,
        estimatedMarginPercent: 82,
        competitorAveragePrice: Math.round(draft.price * 1.65),
        marketPriceBenchmark: {
          low: Math.round(draft.price * 1.15),
          median: Math.round(draft.price * 1.4),
          high: Math.round(draft.price * 1.8),
          platformComparisons: [
            { platform: 'Fabindia Craft', price: Math.round(draft.price * 1.75) },
            { platform: 'Amazon Karigar', price: Math.round(draft.price * 1.45) },
            { platform: 'ONDC Open Network', price: retailPrice },
            { platform: 'Etsy Global', price: Math.round(draft.price * 2.1) },
          ],
        },
        stockQuantity: 10,
        status: 'published',
        views: 1,
        ordersCount: 0,
        createdAt: new Date().toISOString(),
      };

      setIsSuccessAnimated(true);
      onProductCreated(newProduct);

      if (!isMutedRef.current) {
        SpeechService.stopSpeaking();
        SpeechService.speak(
          question,
          lang,
          () => {
            if (!isDestroyedRef.current) {
              assistantStateRef.current = 'speaking';
              setAssistantState('speaking');
            }
          },
          () => {
            if (!isDestroyedRef.current) {
              assistantStateRef.current = 'idle';
              setAssistantState('idle');
              autoCloseTimeoutRef.current = setTimeout(() => {
                handleCancelAndClose();
              }, 2500);
            }
          }
        );
      } else {
        autoCloseTimeoutRef.current = setTimeout(() => {
          handleCancelAndClose();
        }, 2800);
      }
      return;
    }

    // Turns 1-3: Speak aloud, then auto-listen
    if (!isMutedRef.current) {
      SpeechService.stopSpeaking();
      SpeechService.speak(
        question,
        lang,
        () => {
          if (!isDestroyedRef.current) {
            assistantStateRef.current = 'speaking';
            setAssistantState('speaking');
          }
        },
        () => {
          if (!isDestroyedRef.current) {
            // ECHO BUG FIX: 400ms delay after TTS ends before opening mic
            // This ensures the speakers have gone silent and the microphone
            // won't pick up the tail of the assistant's own voice.
            activateHandsFreeListeningRef.current(400);
          }
        }
      );
    } else {
      activateHandsFreeListeningRef.current(0);
    }
  }, [clearAllTimers, onProductCreated, handleCancelAndClose]);

  executeTurnRef.current = executeTurn;

  // ---------------------------------------------------------------------------
  // CRITICAL FIX: Single Lifecycle Effect on Mount/Unmount
  // Only depends strictly on [isOpen]. No cyclic re-renders or duplicate loops.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) {
      abortAudioAndMic();
      return;
    }

    isDestroyedRef.current = false;
    setCurrentStep('product_name');
    currentStepRef.current = 'product_name';
    setIsSuccessAnimated(false);
    setLiveTranscript('');
    setManualInput('');

    const initialDraft: DraftCatalogueData = {
      productName: '',
      craftAndMaterials: '',
      price: 850,
      category: 'Handicraft',
    };
    setDraftProduct(initialDraft);
    draftProductRef.current = initialDraft;

    // Initialize Web Audio once
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            if (isDestroyedRef.current) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            mediaStreamRef.current = stream;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;
          }).catch(() => {
            // Audio analyser optional fallback
          });
        }
      }
    } catch (e) {
      console.warn('AudioContext init non-fatal fallback:', e);
    }

    // Start single visualizer requestAnimationFrame loop
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let phase = 0;

        const render = () => {
          if (isDestroyedRef.current) return;
          const width = canvas.width;
          const height = canvas.height;
          ctx.clearRect(0, 0, width, height);

          let avgVolume = 0;
          if (analyserRef.current) {
            const data = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) sum += data[i];
            avgVolume = sum / data.length / 255;
          }

          const state = assistantStateRef.current;
          if (state === 'speaking') {
            avgVolume = Math.max(avgVolume, 0.45 + Math.sin(phase * 3) * 0.25);
          } else if (state === 'thinking') {
            avgVolume = Math.max(avgVolume, 0.25 + Math.sin(phase * 4) * 0.15);
          } else if (state === 'listening') {
            avgVolume = Math.max(avgVolume, 0.15);
          }

          phase += 0.05;

          // Glowing fluid waveforms
          const waveConfigs = [
            { c1: 'rgba(16, 185, 129, 0.8)', c2: 'rgba(6, 182, 212, 0.8)', speed: 1.2, amp: 26 * avgVolume + 6, lw: 3 },
            { c1: 'rgba(139, 92, 246, 0.75)', c2: 'rgba(236, 72, 153, 0.75)', speed: -1.4, amp: 30 * avgVolume + 8, lw: 3 },
            { c1: 'rgba(245, 158, 11, 0.8)', c2: 'rgba(16, 185, 129, 0.8)', speed: 0.9, amp: 20 * avgVolume + 5, lw: 2.5 },
          ];

          waveConfigs.forEach((cfg) => {
            ctx.save();
            const grad = ctx.createLinearGradient(0, 0, width, 0);
            grad.addColorStop(0, cfg.c1);
            grad.addColorStop(1, cfg.c2);
            ctx.strokeStyle = grad;
            ctx.lineWidth = cfg.lw;
            ctx.shadowColor = cfg.c1;
            ctx.shadowBlur = 10;
            ctx.beginPath();

            for (let x = 0; x < width; x++) {
              const env = Math.sin((x / width) * Math.PI);
              const y = height / 2 + Math.sin(x * 0.018 + phase * cfg.speed) * cfg.amp * env;
              if (x === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
          });

          animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
      }
    }

    // Schedule Turn 1 after smooth slide up
    const startTimer = setTimeout(() => {
      if (isDestroyedRef.current) return;
      executeTurnRef.current('product_name', initialDraft);
    }, 450);

    return () => {
      clearTimeout(startTimer);
      abortAudioAndMic();
    };
  }, [isOpen, abortAudioAndMic]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput;
    setManualInput('');
    processTurnAnswer(text);
  };

  if (!isOpen) return null;

  const currentConfig = STEP_CONFIGS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto">
      {/* 1. Backdrop: Subtle dark gradient vignette keeping dashboard context visible */}
      <div
        onClick={handleCancelAndClose}
        className="absolute inset-0 bg-gradient-to-t from-[#0a1b12]/80 via-[#0a1b12]/45 to-black/25 backdrop-blur-xs transition-opacity duration-300 animate-fadeIn cursor-pointer"
      />

      {/* 2. Floating Bottom Sheet / Bottom Dock */}
      <div className="relative z-10 w-full max-w-3xl mx-auto px-4 sm:px-6 pb-6 pt-2">
        <div className="bg-[#11241a]/95 backdrop-blur-2xl text-white rounded-3xl border border-emerald-400/30 shadow-[0_-10px_40px_rgba(0,0,0,0.5),0_0_50px_rgba(16,185,129,0.15)] overflow-hidden transition-all transform animate-slideUp">
          {/* Top Progress Tracker: 4-dot step progression */}
          <div className="px-6 pt-4 pb-2 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3">
              {(['product_name', 'craft_materials', 'pricing', 'confirmation'] as TurnStep[]).map(
                (stepKey, idx) => {
                  const isCurrent = currentStep === stepKey;
                  const isCompleted =
                    (stepKey === 'product_name' && currentStep !== 'product_name') ||
                    (stepKey === 'craft_materials' &&
                      currentStep !== 'product_name' &&
                      currentStep !== 'craft_materials') ||
                    (stepKey === 'pricing' && currentStep === 'confirmation') ||
                    (stepKey === 'confirmation' && isSuccessAnimated);

                  return (
                    <div key={stepKey} className="flex items-center gap-1.5">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          isCurrent
                            ? 'bg-emerald-400 ring-4 ring-emerald-400/30 scale-125 animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-500'
                            : 'bg-white/20'
                        }`}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${
                          isCurrent
                            ? 'text-emerald-300'
                            : isCompleted
                            ? 'text-emerald-400/80'
                            : 'text-white/30'
                        }`}
                      >
                        {idx + 1}. {(STEP_CONFIGS[stepKey].label[language] || STEP_CONFIGS[stepKey].label['en']).split(' ')[0]}
                      </span>
                      {idx < 3 && <div className="w-2.5 h-0.5 bg-white/10 hidden sm:block" />}
                    </div>
                  );
                }
              )}
            </div>

            {/* Header Right: Animated State Indicator & ✕ Cancel Button */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/15">
                <span
                  className={`w-2 h-2 rounded-full ${
                    assistantState === 'listening'
                      ? 'bg-red-400 animate-ping'
                      : assistantState === 'speaking'
                      ? 'bg-emerald-400 animate-pulse'
                      : assistantState === 'thinking'
                      ? 'bg-purple-400 animate-spin'
                      : 'bg-emerald-300'
                  }`}
                />
                <span className="capitalize text-emerald-100 text-[11px] font-semibold">
                  {assistantState === 'listening'
                    ? 'Listening...'
                    : assistantState === 'speaking'
                    ? 'Speaking...'
                    : assistantState === 'thinking'
                    ? 'Processing...'
                    : 'Ready'}
                </span>
              </div>

              {/* Visible "✕" Cancel/Close button to terminate at any time */}
              <button
                type="button"
                onClick={handleCancelAndClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-90"
                title="Cancel and close voice assistant"
                aria-label="Close voice assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Centerpiece: Dynamic Waveform Visualizer Canvas */}
          <div className="relative h-28 sm:h-32 w-full flex items-center justify-center overflow-hidden bg-gradient-to-b from-transparent via-emerald-950/20 to-transparent">
            <canvas
              ref={canvasRef}
              width={700}
              height={130}
              className="w-full h-full object-contain pointer-events-none"
            />

            {assistantState === 'listening' && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-bold text-red-200">
                <Mic className="w-3 h-3 text-red-400 animate-bounce" />
                <span>Auto-listening (Hands-free)</span>
              </div>
            )}
          </div>

          {/* Live Transcript Feed */}
          <div className="px-6 py-3 bg-black/30 border-y border-white/10">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <p className="text-sm sm:text-base font-bold text-white tracking-wide leading-relaxed">
                "{currentSpokenPrompt}"
              </p>
            </div>

            <div className="mt-2 pl-8 flex items-center gap-2 min-h-6">
              {liveTranscript ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-emerald-200 font-medium italic">
                    "{liveTranscript}"
                  </p>
                </div>
              ) : assistantState === 'listening' ? (
                <p className="text-xs text-white/40 italic flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
                  Speak now, assistant is listening...
                </p>
              ) : (
                <div className="text-[11px] text-white/30 flex items-center gap-2">
                  <span>Step {currentConfig.stepIndex} of 4</span>
                  <span>•</span>
                  <span>Auto-advances when you pause</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar: Quick Suggestions & Direct Input */}
          <div className="px-6 py-4 flex flex-col gap-3">
            {currentStep !== 'confirmation' && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] font-bold uppercase text-emerald-300/70 whitespace-nowrap">
                  {currentStep === 'pricing' ? '💡 Market Price Suggestions:' : 'Suggestions:'}
                </span>
                {currentConfig.fallbackKeywords(language).map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => processTurnAnswer(kw)}
                    className="bg-white/10 hover:bg-emerald-600/30 text-emerald-100 hover:text-white px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap border border-white/10 hover:border-emerald-400/50 transition-all cursor-pointer active:scale-95"
                    title={currentStep === 'pricing' ? `Suggested benchmark: ${kw}` : undefined}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

            {currentStep !== 'confirmation' ? (
              <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Or type here if mic is unavailable..."
                  className="flex-1 bg-white/10 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-white/40 border border-white/15 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-[#11241a] px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <span>Submit</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-emerald-200 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Item successfully listed & synced with ONDC!</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAndClose}
                  className="bg-emerald-400 hover:bg-emerald-300 text-[#11241a] px-4 py-1.5 rounded-xl font-extrabold text-xs transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
