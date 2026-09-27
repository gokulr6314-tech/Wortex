import React, { useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  Heart,
  ShieldCheck,
  Award,
  Sparkles,
  Truck,
  CheckCircle2,
  Eye,
  MapPin,
  Filter
} from 'lucide-react';
import { SupportedLanguageCode, ProductListing, Order } from '../types';
import { TRANSLATIONS } from '../lib/languages';
import { DatabaseStore } from '../lib/supabase';
import { LocalizedCopy, localizeProductFor, translateProductCopy } from '../services/translate/translate';

interface BuyerMarketplaceViewProps {
  products: ProductListing[];
  language: SupportedLanguageCode;
  onOrderPlaced: (order: Order) => void;
  onBackToSeller: () => void;
}

export const BuyerMarketplaceView: React.FC<BuyerMarketplaceViewProps> = ({
  products,
  language,
  onOrderPlaced,
  onBackToSeller,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Buyer-side listing copy in their own language. Gemini performs a live
  // translation; while pending (or if the AI is off-line) the deterministic
  // localizer renders immediately so nothing is ever shown in a foreign tongue.
  const copyCacheRef = useRef<Record<string, LocalizedCopy>>({});
  const [localCopy, setLocalCopy] = useState<Record<string, LocalizedCopy>>({});

  useEffect(() => {
    let cancelled = false;
    const cached = copyCacheRef.current;

    Promise.all(
      products.map(async (p) => {
        const key = `${language}|${p.id}`;
        if (cached[key]) return;
        cached[key] = await translateProductCopy(language, p);
      })
    ).then(() => {
      if (!cancelled) setLocalCopy({ ...cached });
    });

    return () => {
      cancelled = true;
    };
  }, [language, products]);

  const copyFor = (p: ProductListing): LocalizedCopy =>
    localCopy[`${language}|${p.id}`] ?? copyCacheRef.current[`${language}|${p.id}`] ?? localizeProductFor(language, p);

  const [selectedProduct, setSelectedProduct] = useState<ProductListing | null>(
    products[0] || null
  );
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [buyerName, setBuyerName] = useState('Ananya Sharma');
  const [buyerCity, setBuyerCity] = useState('Bengaluru');
  const [buyerAddress, setBuyerAddress] = useState('Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [orderSuccessAlert, setOrderSuccessAlert] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'terracotta' | 'silk' | 'bamboo' | 'in_stock'>('all');

  const filteredProducts = (products || []).filter((p) => {
    if (!p) return false;
    if (categoryFilter === 'all') return true;
    const title = (p.title || '').toLowerCase();
    const technique = (p.craftTechnique || '').toLowerCase();
    const artisanCraft = (p.artisanCraft || '').toLowerCase();
    const mats = Array.isArray(p.materials) ? p.materials : [];

    if (categoryFilter === 'terracotta') {
      return (
        title.includes('terracotta') ||
        technique.includes('clay') ||
        artisanCraft.includes('pottery') ||
        mats.some((m) => String(m || '').toLowerCase().includes('clay'))
      );
    }
    if (categoryFilter === 'silk') {
      return (
        title.includes('silk') ||
        mats.some((m) => String(m || '').toLowerCase().includes('silk'))
      );
    }
    if (categoryFilter === 'bamboo') {
      return (
        title.includes('mat') ||
        title.includes('bamboo') ||
        mats.some(
          (m) =>
            String(m || '').toLowerCase().includes('bamboo') ||
            String(m || '').toLowerCase().includes('cane') ||
            String(m || '').toLowerCase().includes('fiber')
        )
      );
    }
    if (categoryFilter === 'in_stock') return Number(p.stockQuantity || 0) > 0;
    return true;
  });

  const handleBuyClick = (product: ProductListing) => {
    setSelectedProduct(product);
    setOrderModalOpen(true);
  };

  const handleConfirmOrder = () => {
    if (!selectedProduct) return;

    const newOrder: Order = {
      id: `ord_${Date.now().toString().slice(-6)}`,
      orderNumber: `TULIP-${Math.floor(10000 + Math.random() * 90000)}`,
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      productImageUrl: selectedProduct.studioPhotoUrl || selectedProduct.rawPhotoUrl,
      artisanId: selectedProduct.artisanId,
      artisanName: selectedProduct.artisanName,
      buyerName: buyerName || 'Direct Buyer',
      buyerCity: buyerCity || 'New Delhi',
      buyerState: 'India',
      amount: selectedProduct.retailPrice,
      artisanEarnings: selectedProduct.artisanPrice,
      platformFee: selectedProduct.retailPrice - selectedProduct.artisanPrice,
      status: 'pending',
      createdAt: new Date().toISOString(),
      shippingAddress: buyerAddress,
      paymentMethod: paymentMode,
    };

    DatabaseStore.addOrder(newOrder);
    onOrderPlaced(newOrder);
    setOrderModalOpen(false);
    setOrderSuccessAlert(`ऑर्डर दर्ज हुआ! ₹${newOrder.amount} का ऑर्डर कारीगर ${selectedProduct.artisanName} को भेजा गया।`);
    setTimeout(() => setOrderSuccessAlert(null), 6000);
  };

  return (
    <div className="space-y-6">
      {/* Banner / Storefront Header */}
      <div className="bg-[#F0F7F0]/90 backdrop-blur-md rounded-[32px] p-6 sm:p-7 shadow-[12px_12px_24px_#d1dbd1,-12px_-12px_24px_#ffffff] border border-white/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 rounded-full bg-[#C8E6C9] text-[#2E7D32] text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#4CAF50]" />
                Bharat TULIP National Storefront
              </span>
              <span className="text-xs font-semibold text-[#455A45]">
                • 100% Direct from Rural Artisans
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#2D422D]">
              {t.buyerStoreTitle}
            </h2>
            <p className="text-xs text-[#455A45] mt-0.5 max-w-xl">
              कारीगरों द्वारा सीधे बनाए गए असली, प्रमाणित हस्तशिल्प। AI द्वारा संवर्धित प्रामाणिक तस्वीरें और निष्पक्ष मूल्य।
            </p>
          </div>

          <button
            type="button"
            onClick={onBackToSeller}
            className="bg-white/80 hover:bg-white text-[#2D422D] px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-[4px_4px_10px_#d1dbd1,-4px_-4px_10px_#ffffff] border border-white/80 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>कारीगर पेज पर लौटें (Seller Dashboard)</span>
          </button>
        </div>

        {/* Order success notification */}
        {orderSuccessAlert && (
          <div className="mt-4 p-4 rounded-2xl bg-[#81C784] text-white shadow-lg text-xs font-bold flex items-center gap-2.5 border border-white/40 animate-bounce">
            <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
            <span>{orderSuccessAlert}</span>
          </div>
        )}
      </div>

      {/* Category Filter Pills & Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h3 className="text-lg font-extrabold text-[#1b4332] tracking-tight">
            Marketplace Products ({filteredProducts.length})
          </h3>
          <p className="text-xs text-[#455A45]">
            100% genuine artisan-crafted products currently available for direct purchase.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#E1EBE1] p-1 rounded-2xl border border-white/60 shadow-inner overflow-x-auto">
          {([
            { id: 'all', label: `All (${products.length})` },
            { id: 'terracotta', label: 'Terracotta' },
            { id: 'silk', label: 'Silk Textiles' },
            { id: 'bamboo', label: 'Woven Crafts' },
            { id: 'in_stock', label: 'In Stock' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === tab.id
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#455A45] hover:bg-white/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((product) => {
          const c = copyFor(product);
          return (
          <div
            key={product.id}
            className="bg-[#F0F7F0]/90 backdrop-blur-md rounded-[28px] overflow-hidden flex flex-col justify-between group hover:border-[#81C784] transition-all shadow-[8px_8px_20px_#d1dbd1,-8px_-8px_20px_#ffffff] border border-white/80"
          >
            <div>
              {/* Product Photoshoot Image */}
              <div className="relative aspect-[4/3] bg-white overflow-hidden">
                <img
                  src={product.studioPhotoUrl || product.rawPhotoUrl}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1">
                  <span className="bg-[#2D422D]/85 backdrop-blur-sm text-[#C8E6C9] px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Award className="w-3 h-3 text-[#81C784]" />
                    {product.giTagStatus || 'Handcrafted Authentic'}
                  </span>
                </div>

                <div className="absolute top-2.5 right-2.5">
                  <span className="bg-white/90 backdrop-blur-sm text-[#2D422D] px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm">
                    Stock: {product.stockQuantity}
                  </span>
                </div>

                {product.imageEnhanced && (
                  <div className="absolute bottom-2 left-2.5 bg-[#2D422D]/80 backdrop-blur-sm text-[#C8E6C9] text-[10px] px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-[#81C784]" />
                    <span>AI Studio Enhanced</span>
                  </div>
                )}
              </div>

              {/* Product Meta */}
              <div className="p-4 space-y-2.5">
                <div className="flex items-center gap-1 text-[11px] text-[#455A45] font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#4CAF50] flex-shrink-0" />
                  <span className="truncate">
                    {product.artisanName} • {product.artisanVillage}, {product.artisanState}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#2D422D] line-clamp-2 leading-snug">
                  {c.title}
                </h3>

                <p className="text-xs text-[#455A45] line-clamp-2 leading-relaxed">
                  {c.description}
                </p>

                {/* Cultural story quote */}
                {c.culturalStory && (
                  <div className="p-2.5 rounded-xl bg-[#E1EBE1] text-[11px] text-[#2D422D] italic line-clamp-2 shadow-inner border border-white/60">
                    "{c.culturalStory}"
                  </div>
                )}

                {/* Materials badges */}
                <div className="flex flex-wrap gap-1">
                  {c.materials.slice(0, 2).map((m, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-[#C8E6C9] text-[#2E7D32] px-2 py-0.5 rounded-lg font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Buy Action */}
            <div className="p-4 pt-0 border-t border-white/60 flex items-center justify-between mt-2">
              <div>
                <div className="text-xs text-[#455A45] font-semibold line-through">
                  ₹{product.suggestedMarketPrice || Math.round(product.retailPrice * 1.3)}
                </div>
                <div className="text-lg font-extrabold text-[#2D422D]">
                  ₹{product.retailPrice}
                </div>
                <div className="text-[10px] text-[#2E7D32] font-bold">
                  कारीगर को मिलेगा: ₹{product.artisanPrice}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleBuyClick(product)}
                disabled={product.stockQuantity <= 0}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  product.stockQuantity <= 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-[#81C784] hover:bg-[#4CAF50] text-white shadow-[4px_4px_10px_#c8d6c8,-4px_-4px_10px_#ffffff] border border-white/50 active:scale-95'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{product.stockQuantity <= 0 ? 'Out of Stock' : t.addToCart}</span>
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* Buy Direct Checkout Modal */}
      {orderModalOpen && selectedProduct && (() => {
        const c = copyFor(selectedProduct);
        return (
        <div className="fixed inset-0 z-50 bg-[#2D422D]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#F0F7F0]/95 backdrop-blur-lg max-w-lg w-full p-6 sm:p-7 rounded-[32px] shadow-[16px_16px_36px_#b8c8b8,-16px_-16px_36px_#ffffff] border border-white/80 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-[11px] font-bold text-[#2E7D32] uppercase tracking-wider">
                  Direct Artisan Checkout
                </span>
                <h3 className="text-xl font-bold text-[#2D422D]">
                  {c.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="w-9 h-9 rounded-2xl bg-white text-[#2D422D] flex items-center justify-center font-bold text-xs shadow-[3px_3px_8px_#d1dbd1,-3px_-3px_8px_#ffffff] border border-white/80 hover:bg-[#F0F7F0]"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-3.5 mb-4 p-3.5 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/80 shadow-[4px_4px_10px_#d1dbd1,-4px_-4px_10px_#ffffff]">
              <img
                src={selectedProduct.studioPhotoUrl}
                alt={c.title}
                className="w-20 h-20 object-cover rounded-xl shadow-sm"
                referrerPolicy="no-referrer"
              />
              <div className="text-xs space-y-1">
                <div className="font-bold text-[#2D422D]">{c.title}</div>
                <div className="text-[#455A45]">कारीगर: {selectedProduct.artisanName} ({selectedProduct.artisanVillage})</div>
                <div className="text-base font-extrabold text-[#2E7D32]">₹{selectedProduct.retailPrice}</div>
              </div>
            </div>

            {/* Buyer Details Form */}
            <div className="space-y-3 mb-5">
              <div className="bg-[#E1EBE1] border border-white/60 rounded-[18px] p-3 shadow-[inset_3px_3px_6px_#d1dbd1,inset_-3px_-3px_6px_#ffffff]">
                <label className="text-[11px] font-bold text-[#2E7D32] block mb-1">
                  खरीदार का नाम (Buyer Name)
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#2D422D] focus:outline-none"
                />
              </div>

              <div className="bg-[#E1EBE1] border border-white/60 rounded-[18px] p-3 shadow-[inset_3px_3px_6px_#d1dbd1,inset_-3px_-3px_6px_#ffffff]">
                <label className="text-[11px] font-bold text-[#2E7D32] block mb-1">
                  शहर (City / State)
                </label>
                <input
                  type="text"
                  value={buyerCity}
                  onChange={(e) => setBuyerCity(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#2D422D] focus:outline-none"
                />
              </div>

              <div className="bg-[#E1EBE1] border border-white/60 rounded-[18px] p-3 shadow-[inset_3px_3px_6px_#d1dbd1,inset_-3px_-3px_6px_#ffffff]">
                <label className="text-[11px] font-bold text-[#2E7D32] block mb-1">
                  डिलीवरी पता (Delivery Address)
                </label>
                <input
                  type="text"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#2D422D] focus:outline-none"
                />
              </div>

              <div className="bg-[#E1EBE1] border border-white/60 rounded-[18px] p-3 shadow-[inset_3px_3px_6px_#d1dbd1,inset_-3px_-3px_6px_#ffffff]">
                <label className="text-[11px] font-bold text-[#2E7D32] block mb-1">
                  भुगतान माध्यम (Payment Mode)
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#2D422D] focus:outline-none cursor-pointer"
                >
                  <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                  <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                  <option value="Net Banking">Net Banking / Debit Card</option>
                </select>
              </div>
            </div>

            {/* Artisan direct margin breakdown */}
            <div className="p-3.5 rounded-2xl bg-white/80 border border-white/80 text-xs mb-5 space-y-1.5 shadow-sm">
              <div className="flex justify-between font-bold text-[#2D422D]">
                <span>कुल भुगतान (Total Amount):</span>
                <span>₹{selectedProduct.retailPrice}</span>
              </div>
              <div className="flex justify-between text-[#455A45]">
                <span>सीधे कारीगर को (Direct to Artisan):</span>
                <span className="font-bold text-[#2E7D32]">₹{selectedProduct.artisanPrice} (100% Asked)</span>
              </div>
              <div className="flex justify-between text-[#455A45]">
                <span>भारत ट्यूलिप लॉजिस्टिक्स व पैकेजिंग:</span>
                <span>₹{selectedProduct.retailPrice - selectedProduct.artisanPrice}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmOrder}
              className="w-full bg-[#81C784] hover:bg-[#4CAF50] text-white py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-[6px_6px_16px_#c8d6c8,-6px_-6px_16px_#ffffff] border border-white/50 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ऑर्डर कन्फर्म करें (Confirm Direct Order)</span>
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
};
