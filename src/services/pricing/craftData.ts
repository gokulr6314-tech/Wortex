/**
 * Module 5 — Real-Time Market Pricing Agent
 * Deterministic craft cost & demand profiles indexed by craft category.
 * Baseline data mirrors realistic Indian marketplace ranges; the server can
 * override with live Gemini market intelligence.
 */

export interface CraftCostProfile {
  category: string;
  baseMaterialCost: number;
  laborHours: number;
  laborRatePerHour: number;
  medianReference: number;
  highReference: number;
  platformComparisons: { platform: string; price: number }[];
}

export const CRAFT_COST_PROFILES: CraftCostProfile[] = [
  {
    category: 'Terracotta',
    baseMaterialCost: 120,
    laborHours: 6,
    laborRatePerHour: 90,
    medianReference: 850,
    highReference: 1400,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 1450 },
      { platform: 'Amazon Karigar Direct', price: 990 },
      { platform: 'ONDC Open Network', price: 820 },
      { platform: 'Etsy Global Handmade', price: 1750 },
    ],
  },
  {
    category: 'Silk Handloom',
    baseMaterialCost: 900,
    laborHours: 16,
    laborRatePerHour: 110,
    medianReference: 3200,
    highReference: 5200,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 4800 },
      { platform: 'Amazon Karigar Direct', price: 3400 },
      { platform: 'ONDC Open Network', price: 3000 },
      { platform: 'Etsy Global Handmade', price: 6800 },
    ],
  },
  {
    category: 'Brass & Bell Metal',
    baseMaterialCost: 380,
    laborHours: 8,
    laborRatePerHour: 100,
    medianReference: 1250,
    highReference: 2100,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 2100 },
      { platform: 'Amazon Karigar Direct', price: 1300 },
      { platform: 'ONDC Open Network', price: 1150 },
      { platform: 'Etsy Global Handmade', price: 2600 },
    ],
  },
  {
    category: 'Woodcraft',
    baseMaterialCost: 260,
    laborHours: 9,
    laborRatePerHour: 95,
    medianReference: 1100,
    highReference: 1900,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 1900 },
      { platform: 'Amazon Karigar Direct', price: 1150 },
      { platform: 'ONDC Open Network', price: 980 },
      { platform: 'Etsy Global Handmade', price: 2400 },
    ],
  },
  {
    category: 'Bamboo & Cane',
    baseMaterialCost: 140,
    laborHours: 7,
    laborRatePerHour: 85,
    medianReference: 650,
    highReference: 1100,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 1050 },
      { platform: 'Amazon Karigar Direct', price: 720 },
      { platform: 'ONDC Open Network', price: 600 },
      { platform: 'Etsy Global Handmade', price: 1400 },
    ],
  },
  {
    category: 'Handloom Weave',
    baseMaterialCost: 420,
    laborHours: 12,
    laborRatePerHour: 90,
    medianReference: 1800,
    highReference: 2900,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 2850 },
      { platform: 'Amazon Karigar Direct', price: 1900 },
      { platform: 'ONDC Open Network', price: 1650 },
      { platform: 'Etsy Global Handmade', price: 3500 },
    ],
  },
  {
    category: 'Folk Painting',
    baseMaterialCost: 180,
    laborHours: 14,
    laborRatePerHour: 80,
    medianReference: 1500,
    highReference: 3200,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 2800 },
      { platform: 'Amazon Karigar Direct', price: 1600 },
      { platform: 'ONDC Open Network', price: 1400 },
      { platform: 'Etsy Global Handmade', price: 3800 },
    ],
  },
  {
    category: 'Textile Embroidery',
    baseMaterialCost: 240,
    laborHours: 11,
    laborRatePerHour: 95,
    medianReference: 1600,
    highReference: 2600,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 2500 },
      { platform: 'Amazon Karigar Direct', price: 1700 },
      { platform: 'ONDC Open Network', price: 1500 },
      { platform: 'Etsy Global Handmade', price: 3100 },
    ],
  },
  {
    category: 'Leather Craft',
    baseMaterialCost: 520,
    laborHours: 10,
    laborRatePerHour: 100,
    medianReference: 1900,
    highReference: 3200,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 3000 },
      { platform: 'Amazon Karigar Direct', price: 2000 },
      { platform: 'ONDC Open Network', price: 1750 },
      { platform: 'Etsy Global Handmade', price: 3800 },
    ],
  },
  {
    category: 'Handicraft',
    baseMaterialCost: 150,
    laborHours: 6,
    laborRatePerHour: 85,
    medianReference: 750,
    highReference: 1300,
    platformComparisons: [
      { platform: 'Fabindia Craft Store', price: 1250 },
      { platform: 'Amazon Karigar Direct', price: 820 },
      { platform: 'ONDC Open Network', price: 700 },
      { platform: 'Etsy Global Handmade', price: 1600 },
    ],
  },
];

export function resolveCraftProfile(craftCategory: string): CraftCostProfile {
  const normalized = (craftCategory || '').toLowerCase();
  const exact = CRAFT_COST_PROFILES.find((p) => (p.category || '').toLowerCase() === normalized);
  if (exact) return exact;

  const matched = CRAFT_COST_PROFILES.find((p) => {
    const categoryKey = (p.category || '').toLowerCase();
    return categoryKey.split(' ').some((word) => normalized.includes(word));
  });
  return matched || CRAFT_COST_PROFILES.find((p) => p.category === 'Handicraft')!;
}