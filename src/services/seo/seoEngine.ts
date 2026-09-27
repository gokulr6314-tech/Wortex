/**
 * Module 4 — Machine-First SEO Generation Engine
 * Deterministic, keyword-dense listing engine producing:
 *  - High-CTR meta title (<= 60 chars)
 *  - Exactly 13 high-intent, low-competition marketplace tags
 *  - Structured description (160-char crawler preview + materials/dimensions/care bullets)
 *  - Dynamic image alt-text and JSON-LD `Product` + `Offer` schema
 */

import { ListingDraftInput, SeoOutput } from './types';
import { buildAltText } from './altText';
import { buildProductJsonLd, serializeJsonLd } from './jsonld';

function clean(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((w) => capitalize(w))
    .join(' ');
}

function clampTo(str: string, max: number): string {
  if (str.length <= max) return str.trim();
  const cut = str.slice(0, max - 1).trim();
  return `${cut.replace(/[\s,.-]+$/, '')} …`.slice(0, max).trim();
}

export const TAG_POOL = [
  'Handmade',
  'Handcrafted',
  'Artisan Direct',
  'GI Tag Heritage',
  'Fair Trade',
  'Vocal for Local',
  'Sustainable',
  'Eco Friendly',
  'Home Decor',
  'Festive Gift',
  'Rural Artisan',
  'Traditional Craft',
  'Premium Quality',
  'Made in India',
  'Small Batch',
  'Natural Materials',
];

function buildTags(input: ListingDraftInput): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();

  const productWords = (input.productName || '')
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 3 && !/^the$|^and$|^with$|^made$/.test(w));
  const categoryWord = clean(input.craftCategory);
  const materialWord = clean(input.materials?.[0] || '');

  const candidates = [
    titleCase(productWords[0] || input.productName || ''),
    categoryWord,
    materialWord,
    ...TAG_POOL,
  ];

  for (const candidate of candidates) {
    const normalized = clean(candidate).replace(/,$/, '');
    if (!normalized || normalized.length < 3) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(normalized);
    if (tags.length >= 13) break;
  }

  // Guarantee exactly 13 tags
  const filler = [
    'Handmade',
    'Traditional',
    'Authentic',
    'Artisan Made',
    'Gift Ready',
    'Unique Gift',
    'Decor',
    'Craft Heritage',
    'Original',
  ];
  let i = 0;
  while (tags.length < 13) {
    const f = filler[i % filler.length];
    if (!seen.has(f.toLowerCase())) {
      seen.add(f.toLowerCase());
      tags.push(f);
    }
    i += 1;
  }

  return tags.slice(0, 13);
}

function buildStructuredDescription(input: ListingDraftInput): string {
  const product = clean(input.productName) || 'artisan creation';
  const material = clean(input.materials?.join(', ')) || 'natural materials';
  const technique = clean(input.technique) || 'traditional handcrafting';
  const region = clean(input.region) || 'rural India';
  const dimension = clean(input.dimensions) || 'standard artisan sizing';

  // 1. First ~160 chars packed with high-volume search terms for crawler previews.
  const opener = `Authentic handmade ${product} crafted from ${material} using ${technique} — a genuine ${region} folk-art treasure.`.replace(/\s+/g, ' ');

  // 2. Bullet points of exact materials, dimensions, and craft lineage.
  const bullets = [
    `• Materials: ${material}`,
    `• Dimensions: ${dimension}`,
    `• Craft: ${capitalize(technique)}`,
    `• Provenance: Handmade by a ${region} artisan.`,
  ];

  // 3. Care instructions and authentic provenance.
  const care = `Care: Wipe with a dry soft cloth; keep away from direct water and harsh sunlight.`;

  return `${opener}\n\n${bullets.join('\n')}\n\n${care}`;
}

export function generateSeo(input: ListingDraftInput): SeoOutput {
  const product = clean(input.productName) || 'handcrafted artifact';
  const category = clean(input.craftCategory) || 'handicraft';
  const material = clean(input.materials?.[0]) || 'natural materials';
  const technique = clean(input.technique) || 'traditional handcrafting';
  const region = clean(input.region) || 'Indian';
  const dimensions = clean(input.dimensions);

  const tags = buildTags(input);

  const title = clampTo(
    `Handmade ${titleCase(category)} — ${titleCase(product)} by a ${region.replace(/rural /i, 'Rural ')} Artisan`.replace(/\s+/g, ' '),
    70
  );

  // High-CTR search-indexed meta title, hard-capped at 60 chars.
  const metaTitle = clampTo(
    `Authentic ${capitalize(product)} | Handmade ${category} by ${region} Artisan`.replace(/\s+/g, ' '),
    60
  );

  const description = `${title}.\n\n${buildStructuredDescription(input)}`;

  const culturalStory = `Reviving a centuries-old folk legacy, this ${product} is created entirely by hand in ${region}. Each detail reflects the artisan's inherited skill, sustainable natural materials and a livelihood preserved through fair, direct trade.`;

  const giTagStatus = `${capitalize(region)} Heritage Craft — GI Tag Eligible`;

  const altText = buildAltText(input);

  const jsonLd = buildProductJsonLd({
    name: title,
    description: clean(openerOnly(description)),
    image: '',
    sku: `SKU-${category.replace(/\s+/g, '-').toUpperCase()}`,
    price: input.askedPrice ?? 0,
    category: titleCase(category),
    material,
    craftRegion: region,
    tags,
    sellerName: 'Bharat TULIP Artisan Studio',
    availability: 'InStock',
  });

  return {
    title,
    metaTitle,
    description,
    structuredDescription: description,
    altText,
    tags,
    giTagStatus,
    culturalStory,
    craftTechnique: technique,
    materials: (input.materials || []).filter((m) => clean(m).length > 0),
    dimensions,
    careInstructions: 'Wipe with a dry soft cloth; keep away from direct water and harsh sunlight.',
    jsonLd,
    jsonLdString: serializeJsonLd(jsonLd),
  };
}

function openerOnly(description: string): string {
  const firstLine = description.split('\n')[0] || description;
  return firstLine.slice(0, 200);
}

export function inferCraftCategory(productName?: string, transcript = ''): string {
  const haystack = `${productName || ''} ${transcript || ''}`.toLowerCase();
  const map: [string, string][] = [
    ['terracotta', 'Terracotta'],
    ['pottery', 'Terracotta'],
    ['clay', 'Terracotta'],
    ['matka', 'Terracotta'],
    ['diya', 'Terracotta'],
    ['flower vase', 'Terracotta'],
    ['saree', 'Silk Handloom'],
    ['sari', 'Silk Handloom'],
    ['silk', 'Silk Handloom'],
    ['shawl', 'Silk Handloom'],
    ['dupatta', 'Silk Handloom'],
    ['handloom', 'Silk Handloom'],
    ['brass', 'Brass & Bell Metal'],
    ['bell', 'Brass & Bell Metal'],
    ['idol', 'Brass & Bell Metal'],
    ['wood', 'Woodcraft'],
    ['lacquer', 'Woodcraft'],
    ['toy', 'Woodcraft'],
    ['bamboo', 'Bamboo & Cane'],
    ['basket', 'Bamboo & Cane'],
    ['mat', 'Handloom Weave'],
    ['korai', 'Handloom Weave'],
    ['painting', 'Folk Painting'],
    ['madhubani', 'Folk Painting'],
    ['textile', 'Silk Handloom'],
    ['embroid', 'Textile Embroidery'],
    ['leather', 'Leather Craft'],
    ['leather', 'Leather Craft'],
  ];

  for (const [keyword, category] of map) {
    if (haystack.includes(keyword)) return category;
  }

  return 'Handicraft';
}

export function extractPriceFromSpeech(text: string): number | null {
  const digits = (text || '').replace(/,/g, '').match(/\d+/g);
  if (!digits || digits.length === 0) return null;
  const numbers = digits.map((d) => parseInt(d, 10));
  // Prefer 2-4 digit rupee amounts (avoid picking up incidental large numbers).
  const likely = numbers.find((n) => n >= 50 && n <= 100000);
  return likely ?? numbers[numbers.length - 1];
}

export function confirmWordsFor(language: string): string[] {
  switch (language) {
    case 'hi':
      return ['हाँ', 'हां', 'प्रकाशित', 'ठीक है'];
    case 'ta':
      return ['ஆம்', 'சரி', 'வெளியிடு'];
    case 'te':
      return ['అవును', 'సరే', 'ప్రచురించు'];
    case 'bn':
      return ['হ্যাঁ', 'ঠিক আছে', 'প্রকাশ'];
    case 'mr':
      return ['होय', 'ठीक आहे', 'प्रकाशित'];
    case 'gu':
      return ['હા', 'બરાબર', 'પ્રકાશિત'];
    case 'kn':
      return ['ಹೌದು', 'ಸರಿ', 'ಪ್ರಕಟಿಸು'];
    case 'ml':
      return ['അതെ', 'ശരി', 'പ്രസിദ്ധീകരിക്കുക'];
    case 'or':
      return ['ହଁ', 'ଠିକ୍ ଅଛି', 'ପ୍ରକାଶ'];
    case 'pa':
      return ['ਹਾਂ', 'ਠੀਕ ਹੈ', 'ਪ੍ਰਕਾਸ਼ਿਤ'];
    default:
      return ['yes', 'publish', 'confirm', 'ok'];
  }
}

export function denyWordsFor(language: string): string[] {
  switch (language) {
    case 'hi':
      return ['नहीं', 'रुको', 'बदलो'];
    case 'ta':
      return ['இல்லை', 'மாற்று'];
    case 'te':
      return ['లేదు', 'మార్చు'];
    case 'bn':
      return ['না', 'বদলাও'];
    case 'mr':
      return ['नाही', 'बदला'];
    case 'gu':
      return ['ના', 'બદલો'];
    case 'kn':
      return ['ಇಲ್ಲ', 'ಬದಲಾಯಿಸಿ'];
    case 'ml':
      return ['ഇല്ല', 'മാറ്റുക'];
    case 'or':
      return ['ନା', 'ବଦଳାନ୍ତୁ'];
    case 'pa':
      return ['ਨਹੀਂ', 'ਬਦਲੋ'];
    default:
      return ['no', 'cancel', 'wait', 'not'];
  }
}