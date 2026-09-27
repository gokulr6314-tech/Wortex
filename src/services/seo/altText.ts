/**
 * Module 4 — Machine-First SEO Generation Engine
 * Dynamic, algorithmically-composed image `alt` text built from:
 * [Product Type] + [Artisan Material] + [Craft Style] + [Color/Dimension]
 * and always annotated with the authentic regional craft provenance.
 */

export interface AltTextInput {
  productName: string;
  materials: string[];
  craftCategory: string;
  technique: string;
  region: string;
  colorNotes?: string;
  dimensions?: string;
}

function clean(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function firstThreeMaterial(materials: string[]): string {
  const list = materials.map(clean).filter(Boolean);
  if (list.length === 0) return 'natural materials';
  return list.slice(0, 2).join(' and ') || list[0];
}

function guessColorFromCategory(category?: string | null): string {
  const c = (category || '').toLowerCase();
  if (c.includes('terracotta') || c.includes('clay') || c.includes('pottery')) return 'earthy terracotta-red';
  if (c.includes('silk') || c.includes('handloom') || c.includes('weave')) return 'rich hand-dyed';
  if (c.includes('brass')) return 'warm polished gold';
  if (c.includes('wood')) return 'natural wood grain';
  if (c.includes('bamboo') || c.includes('reed')) return 'natural green-brown';
  if (c.includes('paint')) return 'pigment-rich';
  return 'hand-painted';
}

export function buildAltText(input: AltTextInput): string {
  const product = clean(input.productName) || 'handcrafted artifact';
  const material = firstThreeMaterial(input.materials);
  const style = clean(input.technique) || 'traditional handcrafting';
  const dimension = clean(input.dimensions);
  const color = clean(input.colorNotes) || guessColorFromCategory(input.craftCategory);
  const region = clean(input.region) || 'Indian';

  const parts = [`Handmade ${material} ${product}`];
  parts.push(`crafted via ${style}`);
  parts.push(`in ${color}${dimension ? `, ${dimension}` : ''}`);
  parts.push(`- authentic ${region} handicraft`);

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}