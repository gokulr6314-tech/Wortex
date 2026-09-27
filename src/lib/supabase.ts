import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ArtisanProfile, Order, ProductListing, AnalyticsMetrics } from '../types';
import { INITIAL_ARTISAN, INITIAL_PRODUCTS, INITIAL_ORDERS, INITIAL_ANALYTICS } from './mockData';

const DEFAULT_SUPABASE_URL = 'https://etfyipqxfkigozryosrc.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8FvPjZhFDoIJ-mUnSVm6fA_TWrn0Vae';

// Check if credentials exist in Vite or process.env, with automatic project fallback
const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.NEXT_PUBLIC_SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && (process.env?.SUPABASE_ANON_KEY || process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('xyzcompany') &&
  supabaseAnonKey.length > 20
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// SQL Schema for Supabase setup
export const SUPABASE_SQL_SCHEMA = `-- Bharat TULIP Artisan Voice Studio - Database Schema
-- Run this in Supabase SQL Editor:

-- 1. Artisans Table
CREATE TABLE IF NOT EXISTS artisans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  village TEXT,
  state TEXT,
  craft_type TEXT,
  experience_years INT DEFAULT 1,
  language TEXT DEFAULT 'hi',
  avatar_url TEXT,
  total_earnings NUMERIC DEFAULT 0,
  active_listings_count INT DEFAULT 0,
  total_orders_count INT DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  artisan_id TEXT REFERENCES artisans(id) ON DELETE CASCADE,
  artisan_name TEXT,
  artisan_craft TEXT,
  artisan_village TEXT,
  artisan_state TEXT,
  original_language TEXT DEFAULT 'hi',
  raw_voice_transcript TEXT,
  raw_photo_url TEXT,
  studio_photo_url TEXT,
  image_enhanced BOOLEAN DEFAULT false,
  title TEXT NOT NULL,
  seo_title TEXT,
  description TEXT,
  cultural_story TEXT,
  craft_technique TEXT,
  materials JSONB DEFAULT '[]'::jsonb,
  dimensions TEXT,
  care_instructions TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  gi_tag_status TEXT,
  artisan_price NUMERIC NOT NULL,
  suggested_market_price NUMERIC,
  retail_price NUMERIC NOT NULL,
  estimated_margin_percent NUMERIC DEFAULT 80,
  competitor_average_price NUMERIC,
  market_price_benchmark JSONB DEFAULT '{}'::jsonb,
  stock_quantity INT DEFAULT 10,
  status TEXT DEFAULT 'published',
  views INT DEFAULT 0,
  orders_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_title TEXT,
  product_image_url TEXT,
  artisan_id TEXT REFERENCES artisans(id),
  artisan_name TEXT,
  buyer_name TEXT,
  buyer_city TEXT,
  buyer_state TEXT,
  amount NUMERIC NOT NULL,
  artisan_earnings NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address TEXT,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Public Read / Authenticated Write policies
ALTER TABLE artisans ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert to products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to products" ON products FOR UPDATE USING (true);

CREATE POLICY "Allow public read access to artisans" ON artisans FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to artisans" ON artisans FOR ALL USING (true);

CREATE POLICY "Allow public read/write to orders" ON orders FOR ALL USING (true);
`;

// Local Persistence Storage Manager with Supabase Mirroring
const STORAGE_KEYS = {
  ARTISANS: 'bharat_tulip_artisans_v1',
  PRODUCTS: 'bharat_tulip_products_v1',
  ORDERS: 'bharat_tulip_orders_v1',
  ANALYTICS: 'bharat_tulip_analytics_v1',
};

export class DatabaseStore {
  private static getStoredItem<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  }

  private static setStoredItem<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // Artisan API
  static getArtisan(): ArtisanProfile {
    const artisan = this.getStoredItem<ArtisanProfile>(STORAGE_KEYS.ARTISANS, INITIAL_ARTISAN);
    if (!artisan.language) {
      artisan.language = 'en';
    }
    return artisan;
  }

  static async saveArtisan(profile: ArtisanProfile): Promise<void> {
    this.setStoredItem(STORAGE_KEYS.ARTISANS, profile);
    
    // STEP 7: Mobile App -> Backend API -> Supabase
    try {
      const res = await fetch('/api/artisans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('[API Client] Backend error saving artisan:', data.error || data);
      } else {
        console.log('[API Client] Confirmed artisan saved via Backend API to Supabase:', data.data?.name);
        return;
      }
    } catch (apiErr) {
      console.warn('[API Client] Backend API unreachable, trying direct Supabase fallback:', apiErr);
    }

    // Direct Supabase fallback (for offline or edge cases)
    if (supabase) {
      try {
        const { error } = await supabase.from('artisans').upsert({
          id: profile.id,
          name: profile.name,
          phone: profile.phone,
          village: profile.village,
          state: profile.state,
          craft_type: profile.craftType,
          experience_years: profile.experienceYears,
          language: profile.language,
          avatar_url: profile.avatarUrl,
          total_earnings: profile.totalEarnings,
          active_listings_count: profile.activeListingsCount,
          total_orders_count: profile.totalOrdersCount,
          rating: profile.rating,
          verified: profile.verified,
        });
        if (error) {
          console.error('[Supabase Direct] Error saving artisan:', error);
        } else {
          console.log('[Supabase Direct] Successfully saved artisan:', profile.name);
        }
      } catch (err) {
        console.error('[Supabase Direct] Exception in saveArtisan:', err);
      }
    }
  }

  static async syncFromSupabase(): Promise<{
    artisan?: ArtisanProfile;
    products?: ProductListing[];
  }> {
    // 1. Try fetching through Backend API first
    try {
      const [artisanRes, productsRes] = await Promise.allSettled([
        fetch('/api/artisans').then((r) => r.json()),
        fetch('/api/products').then((r) => r.json()),
      ]);

      let fetchedArtisan: ArtisanProfile | undefined;
      let fetchedProducts: ProductListing[] | undefined;

      if (artisanRes.status === 'fulfilled' && artisanRes.value?.success && artisanRes.value.data?.length > 0) {
        const row = artisanRes.value.data[0];
        fetchedArtisan = {
          id: row.id,
          name: row.name,
          phone: row.phone || '+91 98765 43210',
          village: row.village || 'Naurangabad, Gorakhpur',
          state: row.state || 'Uttar Pradesh',
          craftType: row.craft_type || 'Traditional Handicrafts',
          experienceYears: row.experience_years || 1,
          language: (row.language as any) || 'en',
          avatarUrl: row.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          totalEarnings: Number(row.total_earnings) || 0,
          activeListingsCount: Number(row.active_listings_count) || 0,
          totalOrdersCount: Number(row.total_orders_count) || 0,
          rating: Number(row.rating) || 5.0,
          verified: Boolean(row.verified),
          createdAt: row.created_at,
        };
        this.setStoredItem(STORAGE_KEYS.ARTISANS, fetchedArtisan);
      }

      if (productsRes.status === 'fulfilled' && productsRes.value?.success && productsRes.value.data?.length > 0) {
        fetchedProducts = productsRes.value.data.map((p: any) => ({
          id: p.id,
          artisanId: p.artisan_id || 'artisan_001',
          artisanName: p.artisan_name || 'Artisan',
          artisanCraft: p.artisan_craft || 'Handicrafts',
          artisanVillage: p.artisan_village || '',
          artisanState: p.artisan_state || '',
          originalLanguage: p.original_language || 'hi',
          rawVoiceTranscript: p.raw_voice_transcript || '',
          rawPhotoUrl: p.raw_photo_url || '',
          studioPhotoUrl: p.studio_photo_url || '',
          imageEnhanced: Boolean(p.image_enhanced),
          title: p.title || 'Handcrafted Item',
          seoTitle: p.seo_title || p.title || '',
          description: p.description || '',
          culturalStory: p.cultural_story || '',
          craftTechnique: p.craft_technique || 'Traditional Craft',
          materials: Array.isArray(p.materials) ? p.materials : [],
          dimensions: p.dimensions || '',
          careInstructions: p.care_instructions || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          giTagStatus: p.gi_tag_status || '',
          artisanPrice: Number(p.artisan_price) || 0,
          suggestedMarketPrice: Number(p.suggested_market_price) || 0,
          retailPrice: Number(p.retail_price) || 0,
          estimatedMarginPercent: Number(p.estimated_margin_percent) || 0,
          competitorAveragePrice: Number(p.competitor_average_price) || 0,
          marketPriceBenchmark: p.market_price_benchmark || {},
          stockQuantity: Number(p.stock_quantity) || 0,
          status: p.status || 'published',
          views: Number(p.views) || 0,
          ordersCount: Number(p.orders_count) || 0,
          createdAt: p.created_at || new Date().toISOString(),
        }));
        this.setStoredItem(STORAGE_KEYS.PRODUCTS, fetchedProducts);
      }

      if (fetchedArtisan || fetchedProducts) {
        return { artisan: fetchedArtisan, products: fetchedProducts };
      }
    } catch (e) {
      console.warn('[API Client] Backend sync error, falling back to direct Supabase:', e);
    }

    // 2. Direct Supabase Fallback
    if (!supabase) return {};
    try {
      const { data: artisanRows, error: artisanErr } = await supabase
        .from('artisans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      let fetchedArtisan: ArtisanProfile | undefined;
      if (!artisanErr && artisanRows && artisanRows.length > 0) {
        const row = artisanRows[0];
        fetchedArtisan = {
          id: row.id,
          name: row.name,
          phone: row.phone || '+91 98765 43210',
          village: row.village || 'Naurangabad, Gorakhpur',
          state: row.state || 'Uttar Pradesh',
          craftType: row.craft_type || 'Traditional Handicrafts',
          experienceYears: row.experience_years || 1,
          language: (row.language as any) || 'en',
          avatarUrl: row.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
          totalEarnings: Number(row.total_earnings) || 0,
          activeListingsCount: Number(row.active_listings_count) || 0,
          totalOrdersCount: Number(row.total_orders_count) || 0,
          rating: Number(row.rating) || 5.0,
          verified: Boolean(row.verified),
          createdAt: row.created_at,
        };
        this.setStoredItem(STORAGE_KEYS.ARTISANS, fetchedArtisan);
      } else if (!artisanErr && (!artisanRows || artisanRows.length === 0)) {
        const defaultArtisan = this.getArtisan();
        await this.saveArtisan(defaultArtisan);
        fetchedArtisan = defaultArtisan;
      }

      const { data: productRows, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      let fetchedProducts: ProductListing[] | undefined;
      if (!prodErr && productRows && productRows.length > 0) {
        fetchedProducts = productRows.map((p) => ({
          id: p.id,
          artisanId: p.artisan_id || 'artisan_001',
          artisanName: p.artisan_name || 'Artisan',
          artisanCraft: p.artisan_craft || 'Handicrafts',
          artisanVillage: p.artisan_village || '',
          artisanState: p.artisan_state || '',
          originalLanguage: p.original_language || 'hi',
          rawVoiceTranscript: p.raw_voice_transcript || '',
          rawPhotoUrl: p.raw_photo_url || '',
          studioPhotoUrl: p.studio_photo_url || '',
          imageEnhanced: Boolean(p.image_enhanced),
          title: p.title || 'Handcrafted Item',
          seoTitle: p.seo_title || p.title || '',
          description: p.description || '',
          culturalStory: p.cultural_story || '',
          craftTechnique: p.craft_technique || 'Traditional Craft',
          materials: Array.isArray(p.materials) ? p.materials : [],
          dimensions: p.dimensions || '',
          careInstructions: p.care_instructions || '',
          tags: Array.isArray(p.tags) ? p.tags : [],
          giTagStatus: p.gi_tag_status || '',
          artisanPrice: Number(p.artisan_price) || 0,
          suggestedMarketPrice: Number(p.suggested_market_price) || 0,
          retailPrice: Number(p.retail_price) || 0,
          estimatedMarginPercent: Number(p.estimated_margin_percent) || 0,
          competitorAveragePrice: Number(p.competitor_average_price) || 0,
          marketPriceBenchmark: p.market_price_benchmark || {},
          stockQuantity: Number(p.stock_quantity) || 0,
          status: p.status || 'published',
          views: Number(p.views) || 0,
          ordersCount: Number(p.orders_count) || 0,
          createdAt: p.created_at || new Date().toISOString(),
        }));
        this.setStoredItem(STORAGE_KEYS.PRODUCTS, fetchedProducts);
      }

      return { artisan: fetchedArtisan, products: fetchedProducts };
    } catch (e) {
      console.warn('Sync from Supabase failed:', e);
      return {};
    }
  }

  // Products API
  static getProducts(): ProductListing[] {
    return this.getStoredItem<ProductListing[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  }

  static addProduct(product: ProductListing): ProductListing[] {
    const products = this.getProducts();
    const updated = [product, ...products];
    this.setStoredItem(STORAGE_KEYS.PRODUCTS, updated);

    // Update artisan stats
    const artisan = this.getArtisan();
    artisan.activeListingsCount = updated.length;
    this.saveArtisan(artisan);

    // STEP 6: Mobile App -> Backend API -> Supabase
    (async () => {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          console.error('[API Client] Backend error saving product:', result.error || result);
        } else {
          console.log('[API Client] Confirmed product saved via Backend API to Supabase:', result.data?.title);
          return;
        }
      } catch (apiErr) {
        console.warn('[API Client] Backend API unreachable for addProduct, trying direct Supabase fallback:', apiErr);
      }

      // Direct Supabase fallback
      if (supabase) {
        try {
          const targetArtisanId = product.artisanId || artisan.id || 'artisan_001';
          await supabase.from('artisans').upsert({
            id: targetArtisanId,
            name: product.artisanName || artisan.name || 'Artisan',
            phone: artisan.phone || '+91 98765 43210',
            village: product.artisanVillage || artisan.village || 'Naurangabad, Gorakhpur',
            state: product.artisanState || artisan.state || 'Uttar Pradesh',
            craft_type: product.artisanCraft || artisan.craftType || 'Traditional Craft',
            experience_years: artisan.experienceYears || 5,
            language: artisan.language || 'hi',
          });

          const { error: prodErr } = await supabase.from('products').upsert({
            id: product.id,
            artisan_id: targetArtisanId,
            artisan_name: product.artisanName || artisan.name || 'Artisan',
            artisan_craft: product.artisanCraft || 'Handicraft',
            artisan_village: product.artisanVillage || artisan.village || 'Gorakhpur',
            artisan_state: product.artisanState || artisan.state || 'Uttar Pradesh',
            original_language: product.originalLanguage || 'hi',
            raw_voice_transcript: product.rawVoiceTranscript || '',
            raw_photo_url: product.rawPhotoUrl || '',
            studio_photo_url: product.studioPhotoUrl || '',
            image_enhanced: Boolean(product.imageEnhanced),
            title: product.title || 'Handcrafted Product',
            seo_title: product.seoTitle || product.title || 'Artisan Product',
            description: product.description || '',
            cultural_story: product.culturalStory || '',
            craft_technique: product.craftTechnique || '',
            materials: Array.isArray(product.materials) ? product.materials : [],
            dimensions: product.dimensions || '',
            care_instructions: product.careInstructions || '',
            tags: Array.isArray(product.tags) ? product.tags : [],
            gi_tag_status: product.giTagStatus || '',
            artisan_price: Number(product.artisanPrice) || 0,
            suggested_market_price: Number(product.suggestedMarketPrice) || Number(product.artisanPrice) || 0,
            retail_price: Number(product.retailPrice) || Number(product.artisanPrice) || 0,
            estimated_margin_percent: Number(product.estimatedMarginPercent) || 50,
            competitor_average_price: Number(product.competitorAveragePrice) || 0,
            market_price_benchmark: product.marketPriceBenchmark || {},
            stock_quantity: Number(product.stockQuantity) || 10,
            status: product.status || 'published',
          });

          if (prodErr) {
            console.error('[Supabase Direct] Error saving product:', prodErr);
          } else {
            console.log('[Supabase Direct] Successfully saved product:', product.title);
          }
        } catch (err) {
          console.error('[Supabase Direct] Exception in addProduct:', err);
        }
      }
    })();

    return updated;
  }

  static updateProduct(id: string, updates: Partial<ProductListing>): ProductListing[] {
    const products = this.getProducts();
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates } : p));
    this.setStoredItem(STORAGE_KEYS.PRODUCTS, updated);

    if (supabase) {
      Promise.resolve(supabase.from('products').update(updates).eq('id', id)).catch(console.error);
    }
    return updated;
  }

  static deleteProduct(id: string): ProductListing[] {
    const products = this.getProducts().filter((p) => p.id !== id);
    this.setStoredItem(STORAGE_KEYS.PRODUCTS, products);
    if (supabase) {
      Promise.resolve(supabase.from('products').delete().eq('id', id)).catch(console.error);
    }
    return products;
  }

  // Orders API
  static getOrders(): Order[] {
    return this.getStoredItem<Order[]>(STORAGE_KEYS.ORDERS, INITIAL_ORDERS);
  }

  static addOrder(order: Order): Order[] {
    const orders = this.getOrders();
    const updated = [order, ...orders];
    this.setStoredItem(STORAGE_KEYS.ORDERS, updated);

    // Update product stock and artisan metrics
    const products = this.getProducts();
    const targetProduct = products.find((p) => p.id === order.productId);
    if (targetProduct) {
      const newStock = Math.max(0, targetProduct.stockQuantity - 1);
      this.updateProduct(targetProduct.id, {
        stockQuantity: newStock,
        ordersCount: targetProduct.ordersCount + 1,
        status: newStock === 0 ? 'out_of_stock' : newStock < 5 ? 'low_stock' : 'published',
      });
    }

    const artisan = this.getArtisan();
    artisan.totalEarnings += order.artisanEarnings;
    artisan.totalOrdersCount += 1;
    this.saveArtisan(artisan);

    if (supabase) {
      (async () => {
        try {
          const targetArtisanId = order.artisanId || artisan.id || 'artisan_001';
          await supabase.from('artisans').upsert({
            id: targetArtisanId,
            name: order.artisanName || artisan.name || 'Artisan',
            phone: artisan.phone || '+91 98765 43210',
            village: artisan.village || 'Naurangabad, Gorakhpur',
            state: artisan.state || 'Uttar Pradesh',
            craft_type: artisan.craftType || 'Traditional Craft',
            experience_years: artisan.experienceYears || 5,
            language: artisan.language || 'hi',
          });

          const { error: orderErr } = await supabase.from('orders').upsert({
            id: order.id,
            order_number: order.orderNumber,
            product_id: order.productId,
            product_title: order.productTitle,
            product_image_url: order.productImageUrl,
            artisan_id: targetArtisanId,
            artisan_name: order.artisanName,
            buyer_name: order.buyerName,
            buyer_city: order.buyerCity,
            buyer_state: order.buyerState,
            amount: order.amount,
            artisan_earnings: order.artisanEarnings,
            platform_fee: order.platformFee,
            status: order.status,
            shipping_address: order.shippingAddress,
            payment_method: order.paymentMethod,
          });

          if (orderErr) {
            console.error('[Supabase] Error saving order:', orderErr);
          } else {
            console.log('[Supabase] Successfully saved order:', order.orderNumber);
          }
        } catch (err) {
          console.error('[Supabase] Exception in addOrder:', err);
        }
      })();
    }

    return updated;
  }

  static updateOrderStatus(id: string, status: 'pending' | 'fulfilled' | 'canceled'): Order[] {
    const orders = this.getOrders();
    const updated = orders.map((o) => (o.id === id ? { ...o, status } : o));
    this.setStoredItem(STORAGE_KEYS.ORDERS, updated);
    if (supabase) {
      Promise.resolve(supabase.from('orders').update({ status }).eq('id', id)).catch(console.error);
    }
    return updated;
  }

  // Analytics API
  static getAnalytics(): AnalyticsMetrics {
    const orders = this.getOrders();
    const products = this.getProducts();

    const activeOrders = orders.filter((o) => o.status === 'pending').length;
    const totalSales = orders.reduce((sum, o) => (o.status !== 'canceled' ? sum + o.amount : sum), 0);
    const artisanEarnings = orders.reduce((sum, o) => (o.status !== 'canceled' ? sum + o.artisanEarnings : sum), 0);
    const totalInventoryItems = products.reduce((sum, p) => sum + p.stockQuantity, 0);

    const craftDistMap: Record<string, { count: number; revenue: number }> = {};
    products.forEach((p) => {
      const craft = p.artisanCraft || 'Traditional Craft';
      if (!craftDistMap[craft]) craftDistMap[craft] = { count: 0, revenue: 0 };
      craftDistMap[craft].count += 1;
      craftDistMap[craft].revenue += p.ordersCount * p.retailPrice;
    });

    const craftCategoryDistribution = Object.entries(craftDistMap).map(([category, val]) => ({
      category,
      count: val.count,
      revenue: val.revenue,
    }));

    const orderStatusDistribution = [
      { status: 'fulfilled' as const, count: orders.filter((o) => o.status === 'fulfilled').length },
      { status: 'pending' as const, count: orders.filter((o) => o.status === 'pending').length },
      { status: 'canceled' as const, count: orders.filter((o) => o.status === 'canceled').length },
    ];

    return {
      totalSales,
      activeOrders,
      totalRevenue: totalSales,
      artisanEarnings,
      totalInventoryItems,
      revenueTrends: INITIAL_ANALYTICS.revenueTrends,
      craftCategoryDistribution: craftCategoryDistribution.length > 0 ? craftCategoryDistribution : INITIAL_ANALYTICS.craftCategoryDistribution,
      orderStatusDistribution,
    };
  }

  static resetToDefault(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.ARTISANS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.ANALYTICS);
  }
}
