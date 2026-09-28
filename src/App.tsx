import React, { useState, useEffect } from 'react';
import {
  Mic,
  Plus,
  Sparkles,
  Store,
  Package,
  CheckCircle2,
  TrendingUp,
  Tag,
  Clock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  ExternalLink,
  Layers,
  Search,
  Filter,
  Eye,
  Camera,
  Check,
  MinusCircle,
  PlusCircle,
  Globe2,
  Star,
  Zap,
} from 'lucide-react';
import {
  SupportedLanguageCode,
  ProductListing,
  Order,
  AnalyticsMetrics,
  ArtisanProfile,
} from './types';
import {
  SUPPORTED_LANGUAGES,
  STUDIO_UI_TRANSLATIONS,
  TRANSLATIONS,
} from './lib/languages';
import { SpeechService } from './lib/speech';
import {
  INITIAL_ARTISAN,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_ANALYTICS,
  MARKETPLACE_PRODUCTS,
} from './lib/mockData';
import { DatabaseStore } from './lib/supabase';
import { Navbar, ActiveNavTab } from './components/Navbar';
import { GeminiLiveVoiceModal } from './components/GeminiLiveVoiceModal';
import { MarketLinkageView } from './components/MarketLinkageView';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { ProductImageCapture } from './components/ProductImageCapture';
import { VoiceAuthGate, AuthSession } from './components/VoiceAuthGate';
import VoiceListingTrigger from './components/voice/VoiceListingTrigger';
import VoiceListingAssistant from './components/voice/VoiceListingAssistant';
import { BuyerMarketplaceView } from './components/BuyerMarketplaceView';
import { ArtisanDirectoryView } from './components/ArtisanDirectoryView';
import { buildAltText } from './services/seo/altText';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function App() {
  const [language, setLanguage] = useState<SupportedLanguageCode>('en');
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('catalogue');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);

  // Step 0: Language Selection Gate — shown FIRST before auth, on initial load
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState<boolean>(false);

  // Step 1: Pure Voice-Driven Onboarding & Login (Pre-Dashboard Gate)
  // Must be completed before accessing main dashboard/storefront features
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [userRole, setUserRole] = useState<'Buyer' | 'Seller'>('Seller');

  // App Data State (Synced from DatabaseStore / mockData)
  const [artisan, setArtisan] = useState<ArtisanProfile>(() => DatabaseStore.getArtisan());
  const [artisans, setArtisans] = useState<ArtisanProfile[]>(() => DatabaseStore.getStoredArtisans());
  const [products, setProducts] = useState<ProductListing[]>(() => {
    const saved = DatabaseStore.getProducts();
    return saved.length > 0 ? saved : INITIAL_PRODUCTS;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = DatabaseStore.getOrders();
    return saved.length > 0 ? saved : INITIAL_ORDERS;
  });
  const [analytics, setAnalytics] = useState<AnalyticsMetrics>(() => {
    const saved = DatabaseStore.getAnalytics();
    return saved || INITIAL_ANALYTICS;
  });

  // Sync latest records from Supabase on app mount
  useEffect(() => {
    DatabaseStore.syncFromSupabase().then(({ artisan: remoteArtisan, artisans: remoteArtisans, products: remoteProducts }) => {
      if (remoteArtisan) {
        setArtisan(remoteArtisan);
      }
      if (remoteArtisans && remoteArtisans.length > 0) {
        setArtisans(remoteArtisans);
      }
      if (remoteProducts && remoteProducts.length > 0) {
        setProducts(remoteProducts);
      }
    });
  }, []);

  // Highlight newly voice-catalogued item
  const [newlyCataloguedId, setNewlyCataloguedId] = useState<string | null>(null);
  const [catalogueFilter, setCatalogueFilter] = useState<string>('all');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'fulfilled' | 'canceled'>('all');
  const [showCameraStudio, setShowCameraStudio] = useState<boolean>(false);
  const [voiceListingOpen, setVoiceListingOpen] = useState<boolean>(false);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const studio = STUDIO_UI_TRANSLATIONS[language] || STUDIO_UI_TRANSLATIONS.en;
  const currentLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;

  // Handle successful voice authentication
  const handleVoiceAuthentication = (session: AuthSession) => {
    SpeechService.unlockAudio();
    setAuthSession(session);
    setIsAuthenticated(true);
    setUserRole(session.role);
    if (session.role === 'Buyer') {
      setActiveTab('catalogue');
    }
    if (session.identifier) {
      const storedList = DatabaseStore.getStoredArtisans();
      const existing = storedList.find(
        (a) => a.name.toLowerCase() === session.identifier.trim().toLowerCase()
      );

      const targetProfile: ArtisanProfile = existing
        ? {
            ...existing,
            village: session.address ? session.address.trim() : existing.village,
          }
        : {
            id: `artisan_${Date.now().toString().slice(-6)}`,
            name: session.identifier.trim(),
            phone: '+91 98' + Math.floor(10000000 + Math.random() * 89999999),
            village: session.address ? session.address.trim() : 'Gorakhpur, Uttar Pradesh',
            state: 'Uttar Pradesh',
            craftType: 'Traditional Handicrafts',
            experienceYears: 5,
            language,
            avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
            totalEarnings: 0,
            activeListingsCount: 0,
            totalOrdersCount: 0,
            rating: 5.0,
            verified: true,
            createdAt: new Date().toISOString(),
          };

      setArtisan(targetProfile);
      DatabaseStore.saveArtisan(targetProfile).then(() => {
        DatabaseStore.getAllArtisans().then(setArtisans);
      });
    }
  };

  const handleRefreshArtisans = async () => {
    const list = await DatabaseStore.getAllArtisans();
    setArtisans(list);
  };

  const handleEnrollArtisan = async (newArtisan: ArtisanProfile) => {
    await DatabaseStore.saveArtisan(newArtisan);
    const updated = await DatabaseStore.getAllArtisans();
    setArtisans(updated);
  };

  const handleToggleRole = () => {
    setUserRole((prev) => (prev === 'Buyer' ? 'Seller' : 'Buyer'));
  };

  // Handle when Voice Assistant completes cataloguing a new product
  const handleVoiceProductCreated = (newProduct: ProductListing) => {
    const updated = [newProduct, ...products];
    setProducts(updated);
    DatabaseStore.addProduct(newProduct);
    setNewlyCataloguedId(newProduct.id);
    setActiveTab('catalogue');

    // Update artisan listings count
    setArtisan((prev) => ({
      ...prev,
      activeListingsCount: prev.activeListingsCount + 1,
    }));

    // Scroll smoothly to top
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStatusChange = (orderId: string, newStatus: 'pending' | 'fulfilled' | 'canceled') => {
    const updated = DatabaseStore.updateOrderStatus(orderId, newStatus);
    setOrders(updated);
  };

  const handleStockChange = (productId: string, delta: number) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    const newStock = Math.max(0, target.stockQuantity + delta);
    const updated = DatabaseStore.updateProduct(productId, {
      stockQuantity: newStock,
      status: newStock === 0 ? 'out_of_stock' : newStock < 5 ? 'low_stock' : 'published',
    });
    setProducts(updated);
  };

  // Filter products for catalogue tab
  const filteredProducts = (products || []).filter((p) => {
    if (!p) return false;
    if (catalogueFilter === 'all') return true;
    const title = (p.title || '').toLowerCase();
    const technique = (p.craftTechnique || '').toLowerCase();
    const mats = Array.isArray(p.materials) ? p.materials : [];
    if (catalogueFilter === 'terracotta') return title.includes('terracotta') || technique.includes('clay');
    if (catalogueFilter === 'silk') return title.includes('silk') || mats.some((m) => String(m).toLowerCase().includes('silk'));
    if (catalogueFilter === 'in_stock') return Number(p.stockQuantity || 0) > 0;
    return true;
  });

  // Filter orders for orders tab
  const filteredOrders = (orders || []).filter((o) => {
    if (!o) return false;
    if (orderFilter === 'all') return true;
    return o.status === orderFilter;
  });

  // Buyer marketplace: starts from the static multi-artisan pool, then merges any
  // products the currently logged-in artisan has listed this session (de-duped by id).
  const marketplaceProducts = [
    ...MARKETPLACE_PRODUCTS.filter((mp) => !(products || []).find((p) => p && p.id === mp.id)),
    ...(products || []),
  ];

  return (
    <div className="min-h-screen bg-[#F0F7F0] text-[#1b4332] flex flex-col font-sans selection:bg-[#C8E6C9]">
      {/* ------------------------------------------------------------- */}
      {/* GATE 0: Language Selection — runs FIRST on initial app load   */}
      {/* ------------------------------------------------------------- */}
      {!hasSelectedLanguage && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#0d281e]/95 via-[#1b4332]/90 to-[#2d6a4f]/85 backdrop-blur-xl overflow-y-auto flex items-start sm:items-center justify-center p-3 sm:p-6">
          <div className="max-w-2xl w-full my-auto py-2">
            <LanguageSelectorModal
              selectedLanguage={language}
              onSelectLanguage={setLanguage}
              onProceed={(chosen) => {
                setLanguage(chosen);
                setHasSelectedLanguage(true);
              }}
              isModal={false}
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* GATE 1: Voice-Only Auth — shown after language is selected     */}
      {/* Pure voice-driven flow: Role Selection -> Identity -> Handshake */}
      {/* ------------------------------------------------------------- */}
      {hasSelectedLanguage && !isAuthenticated && (
        <VoiceAuthGate
          language={language}
          onAuthenticated={handleVoiceAuthentication}
          isMuted={isMuted}
        />
      )}

      {/* 1. Sleek Glassmorphic Navbar & KarigarSetu Branding */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        language={language}
        onOpenLanguageModal={() => setShowLanguageModal(true)}
        isMuted={isMuted}
        onToggleMute={() => {
          if (!isMuted) {
            SpeechService.stopSpeaking();
          }
          setIsMuted(!isMuted);
        }}
        onLaunchVoiceAssistant={() => setIsVoiceModalOpen(true)}
        isVoiceActive={isVoiceModalOpen}
        ordersCount={orders.length}
        productsCount={products.length}
        artisansCount={artisans.length}
        userRole={userRole}
        onToggleRole={handleToggleRole}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10 transition-all">
        {/* ======================================================== */}
        {/* TAB 1: CATALOGUE / MARKETPLACE VIEW */}
        {/* ======================================================== */}
        {activeTab === 'catalogue' && (
          userRole === 'Buyer' ? (
            <BuyerMarketplaceView
              products={marketplaceProducts}
              language={language}
              onOrderPlaced={(newOrder) => {
                DatabaseStore.addOrder(newOrder);
                setOrders((prev) => [newOrder, ...prev]);
              }}
              onBackToSeller={handleToggleRole}
            />
          ) : (
            <div className="space-y-8">
            {/* Hero Banner */}
            <div className="bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] text-white rounded-[32px] overflow-hidden shadow-[14px_14px_30px_#d1dbd1,-14px_-14px_30px_#ffffff] border border-white/30 relative">
              {/* Background decor blobs */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-20 w-64 h-64 bg-teal-400/8 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-300/5 rounded-full blur-3xl pointer-events-none" />

              {/* Top meta strip */}
              <div className="relative z-10 px-7 sm:px-10 lg:px-12 pt-7 flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-emerald-300/25 text-emerald-100 border border-emerald-300/30">
                  Master Artisan Hub
                </span>
                <span className="text-xs text-emerald-200/80 font-semibold">
                  {artisan.name} {authSession ? `(${authSession.role})` : ''} · {artisan.village}
                </span>
              </div>

              {/* Centered content */}
              <div className="relative z-10 flex flex-col items-center text-center px-6 sm:px-10 py-10 sm:py-14 gap-5">
                {/* 4-word slogan */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-lg">
                  Sell Your Craft, <span className="text-emerald-300">Globally.</span>
                </h1>

                <p className="text-[11px] sm:text-xs text-emerald-100/80 max-w-md leading-relaxed font-medium">
                  Speak in your language — voice AI lists products, prices fairly, and broadcasts to ONDC &amp; global markets.
                </p>

                {/* Centered CTA buttons: Mic + Camera side by side */}
                <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 mt-2 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="group flex-1 flex flex-col items-center gap-2 bg-white hover:bg-emerald-50 text-[#1b4332] px-3 sm:px-7 py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-black shadow-[0_12px_32px_rgba(0,0,0,0.25)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
                  >
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md">
                      <Mic className="w-5 h-5 sm:w-7 sm:h-7 animate-pulse" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-extrabold tracking-wide whitespace-nowrap">Voice Listing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowCameraStudio(!showCameraStudio)}
                    className="group flex-1 flex flex-col items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-3 sm:px-7 py-3 sm:py-4 rounded-2xl sm:rounded-3xl font-bold border border-white/30 backdrop-blur-md transition-all cursor-pointer hover:-translate-y-0.5 active:scale-95"
                  >
                    <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5 sm:w-7 sm:h-7" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold tracking-wide whitespace-nowrap">
                      {showCameraStudio ? 'Hide Studio' : 'AI Photo Studio'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Camera Studio — only visible when toggled */}
            {showCameraStudio && (
              <div className="bg-[#F0F7F0]/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/80 shadow-[6px_6px_16px_#d1dbd1,-6px_-6px_16px_#ffffff] animate-fadeIn">
                <h2 className="text-base font-extrabold text-[#1b4332] mb-4 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-600" /> AI-Powered Photo Studio
                </h2>
                <ProductImageCapture
                  language={language}
                  onImageSelected={(_imageUrl, _craftName) => { setUploadedPhoto(_imageUrl); setIsVoiceModalOpen(true); }}
                  rawImageUrl={null}
                  studioImageUrl={null}
                  lightingNotes={null}
                  isAiEnhancing={false}
                  onRetake={() => {}}
                />
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* PRODUCT CATALOGUE GRID */}
            {/* -------------------------------------------------- */}
            <div className="space-y-5">
              {/* Toolbar: title + filter pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#1b4332] tracking-tight">My Product Listings</h2>
                  <p className="text-xs text-[#455A45] font-medium mt-0.5">{filteredProducts.length} item{filteredProducts.length !== 1 ? 's' : ''} shown — ONDC synced &amp; marketplace-ready</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#E1EBE1] p-1 rounded-2xl border border-white/60 shadow-inner overflow-x-auto">
                  {(['all', 'terracotta', 'silk', 'in_stock'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCatalogueFilter(f)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap capitalize cursor-pointer ${
                        catalogueFilter === f
                          ? 'bg-[#1b4332] text-white shadow-sm'
                          : 'text-[#455A45] hover:bg-white/40'
                      }`}
                    >
                      {f === 'all' ? `All (${products.length})` : f === 'in_stock' ? 'In Stock' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-white/80 flex items-center justify-center shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
                    <Package className="w-9 h-9 text-[#40916c]" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[#1b4332] text-lg">No products found</p>
                    <p className="text-sm text-[#455A45] mt-1">Use the Voice Listing button above to add your first product!</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVoiceModalOpen(true)}
                    className="flex items-center gap-2 bg-[#1b4332] text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all hover:bg-[#2d6a4f] cursor-pointer active:scale-95"
                  >
                    <Mic className="w-4 h-4" /> Start Voice Listing
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredProducts.map((product) => {
                    const isNew = product.id === newlyCataloguedId;
                    return (
                      <div
                        key={product.id}
                        className={`group relative bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden border transition-all duration-300 hover:shadow-[8px_8px_24px_#c8d6c8,-8px_-8px_24px_#ffffff] hover:-translate-y-0.5 ${
                          isNew
                            ? 'border-emerald-400 ring-2 ring-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.3),6px_6px_16px_#c8d6c8,-6px_-6px_16px_#ffffff]'
                            : 'border-white/80 shadow-[6px_6px_16px_#d1dbd1,-6px_-6px_16px_#ffffff]'
                        }`}
                      >
                        {isNew && (
                          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm animate-pulse">
                            <Zap className="w-3 h-3" /> Just Listed!
                          </div>
                        )}

                        {/* Product Image */}
                        <div className="relative h-48 overflow-hidden bg-gray-100">
                          <img
                            src={product.studioPhotoUrl || product.rawPhotoUrl}
                            alt={buildAltText({
                              productName: product.title,
                              materials: product.materials,
                              craftCategory: product.artisanCraft,
                              technique: product.craftTechnique,
                              region: `${product.artisanVillage}, ${product.artisanState}`,
                              dimensions: product.dimensions,
                            })}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          {/* Status Badge */}
                          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            product.status === 'published'
                              ? 'bg-emerald-500/90 text-white'
                              : product.status === 'low_stock'
                              ? 'bg-amber-500/90 text-white'
                              : 'bg-red-500/90 text-white'
                          }`}>
                            {product.status === 'published' ? '● Live' : product.status === 'low_stock' ? '⚠ Low Stock' : '✗ Out of Stock'}
                          </div>
                          {/* ONDC Sync Badge */}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1b4332]/80 backdrop-blur-sm text-emerald-300 text-[9px] font-extrabold uppercase tracking-wider border border-emerald-400/30">
                            <Globe2 className="w-2.5 h-2.5" /> ONDC Synced
                          </div>
                          {/* Enhanced AI Badge */}
                          {product.imageEnhanced && (
                            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-600/80 backdrop-blur-sm text-white text-[9px] font-extrabold border border-purple-400/30">
                              <Sparkles className="w-2.5 h-2.5" /> AI Enhanced
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-4 space-y-3">
                          {/* GI Tag */}
                          {product.giTagStatus && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <Star className="w-2.5 h-2.5" /> {product.giTagStatus.split('(')[0].trim()}
                            </span>
                          )}

                          <h3 className="font-extrabold text-sm text-[#1b4332] leading-tight line-clamp-2">{product.title}</h3>
                          <p className="text-xs text-[#455A45] line-clamp-2 leading-relaxed">{product.description}</p>

                          {/* Craft Technique */}
                          <div className="flex items-center gap-1.5 text-[11px] text-[#2d6a4f] font-semibold">
                            <Tag className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{product.craftTechnique}</span>
                          </div>

                          {/* Pricing Row */}
                          <div className="flex items-end justify-between pt-1 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] text-[#455A45] font-semibold uppercase tracking-wide">Your Price</p>
                              <p className="text-lg font-black text-[#1b4332]">₹{product.artisanPrice.toLocaleString()}</p>
                              <p className="text-[10px] text-emerald-600 font-bold">Retail: ₹{product.retailPrice.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-[#455A45] font-semibold">Your Margin</p>
                              <p className="text-base font-black text-emerald-600">{product.estimatedMarginPercent}%</p>
                            </div>
                          </div>

                          {/* Stock & Actions Row */}
                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStockChange(product.id, -1)}
                                disabled={product.stockQuantity === 0}
                                className="w-7 h-7 rounded-lg bg-[#E1EBE1] hover:bg-red-100 flex items-center justify-center text-[#1b4332] hover:text-red-600 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                                title="Decrease stock"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs font-black text-[#1b4332] min-w-8 text-center">
                                {product.stockQuantity} pcs
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStockChange(product.id, +1)}
                                className="w-7 h-7 rounded-lg bg-[#E1EBE1] hover:bg-emerald-100 flex items-center justify-center text-[#1b4332] hover:text-emerald-600 transition-colors cursor-pointer"
                                title="Increase stock"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[#455A45]">
                                <Eye className="w-3 h-3" /> {product.views}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                <ShoppingBag className="w-3 h-3" /> {product.ordersCount} orders
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          )
        )}

        {/* ======================================================== */}
        {/* TAB 2: ORDERS VIEW */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          userRole === 'Buyer' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#1b4332] tracking-tight">
                    My Purchases &amp; Orders
                  </h1>
                  <p className="text-xs sm:text-sm text-[#455A45] mt-0.5">
                    Track your authentic handcrafted items shipped directly from rural artisans.
                  </p>
                </div>

                {/* Order Status Filter */}
                <div className="flex items-center gap-1.5 bg-[#E1EBE1] p-1 rounded-2xl border border-white/60 shadow-inner">
                  {(['all', 'pending', 'fulfilled'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderFilter(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                        orderFilter === st
                          ? 'bg-[#1b4332] text-white shadow-xs'
                          : 'text-[#455A45] hover:bg-white/40'
                      }`}
                    >
                      {st === 'all' ? `All (${orders.length})` : st === 'pending' ? 'Preparing / In Transit' : 'Delivered'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buyer Orders List */}
              <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12 bg-white/70 rounded-3xl p-6">
                    <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#1b4332]">No orders placed yet</p>
                    <p className="text-xs text-[#455A45] mt-1">Browse the Marketplace to order directly from village artisans!</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalogue')}
                      className="mt-3 px-5 py-2 rounded-xl bg-[#2d6a4f] text-white text-xs font-bold shadow-sm hover:bg-[#1b4332] cursor-pointer"
                    >
                      Explore Marketplace
                    </button>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white/90 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={order.productImageUrl}
                          alt={order.productTitle}
                          className="w-16 h-16 rounded-2xl object-cover border border-white/80 shadow-xs flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-[#2d6a4f]">
                              {order.orderNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                order.status === 'fulfilled'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800 animate-pulse'
                              }`}
                            >
                              {order.status === 'fulfilled' ? 'Delivered' : 'Preparing for Dispatch'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#1b4332] truncate mt-0.5">
                            {order.productTitle}
                          </h4>
                          <p className="text-xs text-[#455A45]">
                            Artisan: <span className="font-semibold text-[#1b4332]">{order.artisanName}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Delivering to: {order.shippingAddress || `${order.buyerCity}, ${order.buyerState}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="text-left sm:text-right">
                          <p className="text-[10px] text-[#455A45] uppercase font-bold">Total Paid</p>
                          <p className="text-lg font-black text-[#1b4332]">₹{order.amount}</p>
                          <p className="text-[10px] text-emerald-600 font-semibold">{order.paymentMethod || 'UPI Payment'}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-[#1b4332] tracking-tight">
                    Artisan Orders &amp; Direct Payouts
                  </h1>
                  <p className="text-xs sm:text-sm text-[#455A45] mt-0.5">
                    Direct UPI bank deposits on fulfillment with 0% middleman deduction.
                  </p>
                </div>

                {/* Order Status Filter */}
                <div className="flex items-center gap-1.5 bg-[#E1EBE1] p-1 rounded-2xl border border-white/60 shadow-inner">
                  {(['all', 'pending', 'fulfilled', 'canceled'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderFilter(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                        orderFilter === st
                          ? 'bg-[#1b4332] text-white shadow-xs'
                          : 'text-[#455A45] hover:bg-white/40'
                      }`}
                    >
                      {st} ({orders.filter((o) => (st === 'all' ? true : o.status === st)).length})
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white/85 backdrop-blur-md rounded-2xl p-5 border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={order.productImageUrl}
                        alt={order.productTitle}
                        className="w-16 h-16 rounded-2xl object-cover border border-white/80 shadow-xs flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#2d6a4f]">
                            {order.orderNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                              order.status === 'fulfilled'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-800 animate-pulse'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#1b4332] truncate mt-0.5">
                          {order.productTitle}
                        </h4>
                        <p className="text-xs text-[#455A45]">
                          Buyer: {order.buyerName} • {order.buyerCity}, {order.buyerState}
                        </p>
                      </div>
                    </div>

                    {/* Financial Details & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] text-[#455A45] uppercase font-bold">Artisan Earnings</p>
                        <p className="text-lg font-black text-emerald-600">₹{order.artisanEarnings}</p>
                        <p className="text-[10px] text-[#455A45]">Total: ₹{order.amount}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(order.id, 'fulfilled')}
                            className="bg-[#2d6a4f] hover:bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                          >
                            Mark Fulfilled
                          </button>
                        )}
                        {order.status === 'fulfilled' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                            <Check className="w-3.5 h-3.5" /> Payout Settled
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {/* ======================================================== */}
        {/* TAB 3: MARKET LINKAGE VIEW */}
        {/* ======================================================== */}
        {activeTab === 'market_linkage' && (
          <MarketLinkageView
            products={products}
            language={language}
            onOrderPlaced={(order) => {
              DatabaseStore.addOrder(order);
              setOrders((prev) => [order, ...prev]);
            }}
          />
        )}

        {/* ======================================================== */}
        {/* TAB 4: SHOP ANALYTICS */}
        {/* ======================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-[#1b4332] tracking-tight">
                Shop Analytics & Revenue Insights
              </h1>
              <p className="text-xs sm:text-sm text-[#455A45] mt-0.5">
                Real-time performance across ONDC and Global Direct Handicraft Channels.
              </p>
            </div>

            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white/85 p-6 rounded-3xl border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
                <p className="text-xs font-bold text-[#455A45] uppercase">Total Sales</p>
                <p className="text-2xl font-black text-[#1b4332] mt-1">₹{analytics.totalSales.toLocaleString()}</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">↑ +18% vs last month</p>
              </div>

              <div className="bg-white/85 p-6 rounded-3xl border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
                <p className="text-xs font-bold text-[#455A45] uppercase">Artisan Payouts</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">₹{analytics.artisanEarnings.toLocaleString()}</p>
                <p className="text-[11px] text-[#455A45] font-semibold mt-1">82% net profit ratio</p>
              </div>

              <div className="bg-white/85 p-6 rounded-3xl border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
                <p className="text-xs font-bold text-[#455A45] uppercase">Active Orders</p>
                <p className="text-2xl font-black text-[#1b4332] mt-1">{orders.length} Orders</p>
                <p className="text-[11px] text-emerald-600 font-bold mt-1">4 pending delivery</p>
              </div>

              <div className="bg-white/85 p-6 rounded-3xl border border-white/80 shadow-[4px_4px_12px_#d1dbd1,-4px_-4px_12px_#ffffff]">
                <p className="text-xs font-bold text-[#455A45] uppercase">Craft Inventory</p>
                <p className="text-2xl font-black text-[#1b4332] mt-1">{products.length} Products</p>
                <p className="text-[11px] text-amber-600 font-bold mt-1">ONDC Protocol Ready</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/85 p-6 sm:p-7 rounded-3xl border border-white/80 shadow-[6px_6px_16px_#d1dbd1,-6px_-6px_16px_#ffffff]">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1b4332] mb-4">
                  7-Day Sales Trajectory (₹)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.revenueTrends}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#455A45" fontSize={12} tickLine={false} />
                      <YAxis stroke="#455A45" fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#salesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white/85 p-6 sm:p-7 rounded-3xl border border-white/80 shadow-[6px_6px_16px_#d1dbd1,-6px_-6px_16px_#ffffff]">
                <h3 className="font-extrabold text-sm sm:text-base text-[#1b4332] mb-4">
                  Category Revenue Distribution (₹)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.craftCategoryDistribution}>
                      <XAxis dataKey="category" stroke="#455A45" fontSize={11} tickLine={false} />
                      <YAxis stroke="#455A45" fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#2d6a4f" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: ENROLLED ARTISANS REGISTRY */}
        {/* ======================================================== */}
        {activeTab === 'artisans' && (
          <ArtisanDirectoryView
            artisans={artisans}
            onRefreshArtisans={handleRefreshArtisans}
            onEnrollArtisan={handleEnrollArtisan}
            currentLanguage={language}
            onArtisanSelect={(_selectedArtisanId) => {
              setActiveTab('catalogue');
            }}
          />
        )}
      </main>

      {/* 3. CENTERPIECE: iOS Siri / Gemini Live Floating Bottom Modal */}
      <GeminiLiveVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        language={language}
        onProductCreated={handleVoiceProductCreated}
        isMuted={isMuted}
        initialPhotoUrl={uploadedPhoto}
      />

      {/* 3.5 MODULE 2: Floating Voice Listing Assistant (post-auth, always on hand) */}
      {isAuthenticated && (
        <VoiceListingTrigger
          onClick={() => {
            if (userRole === 'Buyer') {
              setIsVoiceModalOpen(true);
            } else {
              setIsVoiceModalOpen(false);
              setVoiceListingOpen(true);
            }
          }}
          isActive={userRole === 'Buyer' ? isVoiceModalOpen : voiceListingOpen}
          isInterviewInProgress={voiceListingOpen}
        />
      )}
      {isAuthenticated && (
        <VoiceListingAssistant
          open={voiceListingOpen}
          onClose={() => setVoiceListingOpen(false)}
          artisan={artisan}
          language={language}
          isMuted={isMuted}
          onProductCreated={handleVoiceProductCreated}
          onViewInStore={() => {
            setActiveTab('catalogue');
            if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      )}

      {/* 4. Language Selector Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 bg-[#1b4332]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full">
            <LanguageSelectorModal
              selectedLanguage={language}
              onSelectLanguage={(newLang) => {
                setLanguage(newLang);
              }}
              onProceed={(chosen) => {
                setLanguage(chosen);
                setShowLanguageModal(false);
              }}
              isModal={true}
              onClose={() => setShowLanguageModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
