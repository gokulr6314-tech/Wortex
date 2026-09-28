import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  MapPin,
  Phone,
  Calendar,
  Award,
  Sparkles,
  ShoppingBag,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Briefcase,
  Languages,
  DollarSign,
  TrendingUp,
  X,
  Share2,
  ChevronRight,
  Database
} from 'lucide-react';
import { ArtisanProfile, SupportedLanguageCode } from '../types';
import { DatabaseStore } from '../lib/supabase';
import { SUPPORTED_LANGUAGES } from '../lib/languages';

interface ArtisanDirectoryViewProps {
  artisans: ArtisanProfile[];
  onArtisanSelect?: (artisanId: string) => void;
  onRefreshArtisans: () => Promise<void>;
  onEnrollArtisan: (artisan: ArtisanProfile) => Promise<void>;
  currentLanguage: SupportedLanguageCode;
}

export const ArtisanDirectoryView: React.FC<ArtisanDirectoryViewProps> = ({
  artisans,
  onArtisanSelect,
  onRefreshArtisans,
  onEnrollArtisan,
  currentLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCraft, setSelectedCraft] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Artisan Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newVillage, setNewVillage] = useState('');
  const [newState, setNewState] = useState('Uttar Pradesh');
  const [newCraftType, setNewCraftType] = useState('Terracotta Pottery');
  const [newExperience, setNewExperience] = useState('10');
  const [newLanguage, setNewLanguage] = useState<SupportedLanguageCode>(currentLanguage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);

  // Available unique crafts and states for filter dropdowns
  const availableCrafts = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.craftType) set.add(a.craftType);
    });
    return Array.from(set);
  }, [artisans]);

  const availableStates = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.state) set.add(a.state);
    });
    return Array.from(set);
  }, [artisans]);

  // Filtered artisans
  const filteredArtisans = useMemo(() => {
    return artisans.filter((artisan) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        artisan.name.toLowerCase().includes(q) ||
        artisan.craftType.toLowerCase().includes(q) ||
        artisan.village.toLowerCase().includes(q) ||
        artisan.state.toLowerCase().includes(q) ||
        artisan.phone.toLowerCase().includes(q) ||
        artisan.id.toLowerCase().includes(q);

      const matchesState = selectedState === 'all' || artisan.state === selectedState;
      const matchesCraft = selectedCraft === 'all' || artisan.craftType === selectedCraft;

      return matchesSearch && matchesState && matchesCraft;
    });
  }, [artisans, searchQuery, selectedState, selectedCraft]);

  // KPIs
  const totalEarningsAll = useMemo(() => {
    return artisans.reduce((sum, a) => sum + (Number(a.totalEarnings) || 0), 0);
  }, [artisans]);

  const totalListingsAll = useMemo(() => {
    return artisans.reduce((sum, a) => sum + (Number(a.activeListingsCount) || 0), 0);
  }, [artisans]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshArtisans();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCopyContact = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      const newProfile: ArtisanProfile = {
        id: `artisan_${Date.now().toString().slice(-6)}`,
        name: newName.trim(),
        phone: newPhone.trim() || '+91 98765 43210',
        village: newVillage.trim() || 'Naurangabad, Gorakhpur',
        state: newState.trim() || 'Uttar Pradesh',
        craftType: newCraftType.trim() || 'Traditional Handicrafts',
        experienceYears: Number(newExperience) || 5,
        language: newLanguage,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=400&q=80`,
        totalEarnings: 0,
        activeListingsCount: 0,
        totalOrdersCount: 0,
        rating: 5.0,
        verified: true,
        createdAt: new Date().toISOString(),
      };

      await onEnrollArtisan(newProfile);
      setFormSuccess(true);
      setTimeout(() => {
        setFormSuccess(false);
        setIsEnrollModalOpen(false);
        // Reset form
        setNewName('');
        setNewPhone('+91 ');
        setNewVillage('');
      }, 1200);
    } catch (err) {
      console.error('Failed to enroll artisan:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Active Member';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Active Member';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-400">
      {/* 1. Header Banner & High-Level Actions */}
      <div className="bg-[#F0F7F0]/90 backdrop-blur-md rounded-[32px] p-6 sm:p-8 shadow-[12px_12px_24px_#d1dbd1,-12px_-12px_24px_#ffffff] border border-white/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] text-white flex items-center justify-center shadow-[4px_4px_12px_#c8d6c8,-4px_-4px_12px_#ffffff] flex-shrink-0">
              <Users className="w-7 h-7 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#1b4332] tracking-tight">
                  Enrolled Artisans Registry
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#d8f3dc] text-[#1b4332] border border-[#b7e4c7]">
                  <Database className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  Live Supabase Store
                </span>
              </div>
              <p className="text-sm text-[#455A45] mt-1">
                Every verified artisan enrolled on the platform with craft, contact, location & performance metrics.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-emerald-50 text-[#1b4332] border border-white/80 font-bold text-xs shadow-[3px_3px_8px_#c8d6c8,-3px_-3px_8px_#ffffff] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh records from Supabase"
            >
              <RefreshCw className={`w-4 h-4 text-[#2d6a4f] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Database'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEnrollModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] hover:from-[#2d6a4f] hover:to-[#40916c] text-white font-bold text-xs shadow-[4px_4px_12px_rgba(45,106,79,0.3)] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Enroll New Artisan</span>
            </button>
          </div>
        </div>

        {/* 2. Key Metric Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1b4332]/10">
          <div className="bg-white/70 rounded-2xl p-4 border border-white/70 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#455A45] font-semibold mb-1">
              <span>Total Enrolled</span>
              <Users className="w-4 h-4 text-[#2d6a4f]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1b4332]">{artisans.length}</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Active in Database</div>
          </div>

          <div className="bg-white/70 rounded-2xl p-4 border border-white/70 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#455A45] font-semibold mb-1">
              <span>Craft Heritage</span>
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1b4332]">
              {availableCrafts.length || 1}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-0.5">Specialized Craft Types</div>
          </div>

          <div className="bg-white/70 rounded-2xl p-4 border border-white/70 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#455A45] font-semibold mb-1">
              <span>Total Earnings</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1b4332]">
              ₹{totalEarningsAll.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">Generated for Artisans</div>
          </div>

          <div className="bg-white/70 rounded-2xl p-4 border border-white/70 shadow-xs">
            <div className="flex items-center justify-between text-xs text-[#455A45] font-semibold mb-1">
              <span>Products Crafted</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1b4332]">{totalListingsAll}</div>
            <div className="text-[11px] text-blue-700 font-medium mt-0.5">Published to ONDC</div>
          </div>
        </div>
      </div>

      {/* 3. Search and Filtering Bar */}
      <div className="bg-[#F0F7F0]/80 backdrop-blur-md rounded-2xl p-4 shadow-[8px_8px_16px_#d1dbd1,-8px_-8px_16px_#ffffff] border border-white/60 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#455A45]" />
          <input
            type="text"
            placeholder="Search by artisan name, craft, phone, village, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/90 pl-10 pr-4 py-2.5 rounded-xl border border-white/80 text-xs sm:text-sm text-[#1b4332] placeholder-[#455A45]/60 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#455A45] hover:text-[#1b4332]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* State Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="w-full md:w-44 bg-white/90 px-3 py-2.5 rounded-xl border border-white/80 text-xs font-semibold text-[#1b4332] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] cursor-pointer"
          >
            <option value="all">All States ({artisans.length})</option>
            {availableStates.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          {/* Craft Filter */}
          <select
            value={selectedCraft}
            onChange={(e) => setSelectedCraft(e.target.value)}
            className="w-full md:w-48 bg-white/90 px-3 py-2.5 rounded-xl border border-white/80 text-xs font-semibold text-[#1b4332] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] cursor-pointer"
          >
            <option value="all">All Crafts</option>
            {availableCrafts.map((cr) => (
              <option key={cr} value={cr}>
                {cr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Artisans List - One By One Detailed Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-base font-bold text-[#1b4332] flex items-center gap-2">
            <span>Enrolled Artisan Profiles</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#d8f3dc] text-[#1b4332] font-black">
              {filteredArtisans.length}
            </span>
          </h2>
          <span className="text-xs text-[#455A45]">Listing each enrolled master craftsman</span>
        </div>

        {filteredArtisans.length === 0 ? (
          <div className="bg-[#F0F7F0]/60 rounded-3xl p-12 text-center border border-dashed border-[#2d6a4f]/30">
            <Users className="w-12 h-12 text-[#2d6a4f]/40 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#1b4332]">No Artisans Found</h3>
            <p className="text-xs text-[#455A45] mt-1 max-w-md mx-auto">
              No artisan record matches your search query or filters. Click &ldquo;Enroll New Artisan&rdquo; to add someone to the database.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedState('all');
                setSelectedCraft('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white text-[#1b4332] border border-white/80 text-xs font-bold shadow-xs cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredArtisans.map((artisan, index) => (
              <div
                key={artisan.id || index}
                className="bg-[#F0F7F0]/90 backdrop-blur-md rounded-[28px] p-5 sm:p-6 shadow-[10px_10px_20px_#d1dbd1,-10px_-10px_20px_#ffffff] border border-white/70 hover:border-[#2d6a4f]/50 transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Avatar, Name, Verification, ID */}
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={artisan.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'}
                        alt={artisan.name}
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md bg-stone-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80';
                        }}
                      />
                      {artisan.verified && (
                        <div
                          className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full border-2 border-white shadow-xs"
                          title="Verified Master Artisan"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-bold text-[#1b4332] truncate group-hover:text-[#2d6a4f] transition-colors">
                          {artisan.name}
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#e1ebe1] text-[#2d6a4f] border border-white/60">
                          {artisan.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#d8f3dc] text-[#1b4332] border border-[#b7e4c7]">
                          <Award className="w-3 h-3 text-[#2d6a4f]" />
                          {artisan.craftType}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          ★ {Number(artisan.rating || 5.0).toFixed(1)} Rating
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Complete Artisan Data Attributes */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 p-3.5 bg-white/60 rounded-2xl border border-white/60 text-xs">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#2d6a4f] mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-bold text-[#455A45] block">Location</span>
                        <span className="font-semibold text-[#1b4332] truncate block" title={`${artisan.village}, ${artisan.state}`}>
                          {artisan.village}, {artisan.state}
                        </span>
                      </div>
                    </div>

                    {/* Phone / Contact */}
                    <div className="flex items-start gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#2d6a4f] mt-0.5 flex-shrink-0" />
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-bold text-[#455A45] block">Contact</span>
                        <button
                          type="button"
                          onClick={() => handleCopyContact(artisan.id, artisan.phone)}
                          className="font-semibold text-[#1b4332] hover:text-[#2d6a4f] text-left truncate flex items-center gap-1 cursor-pointer"
                          title="Click to copy phone number"
                        >
                          <span>{artisan.phone || 'N/A'}</span>
                          {copiedId === artisan.id && (
                            <span className="text-[9px] text-emerald-700 font-bold">Copied!</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Experience */}
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-[#2d6a4f] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#455A45] block">Experience</span>
                        <span className="font-semibold text-[#1b4332]">
                          {artisan.experienceYears} Years Crafting
                        </span>
                      </div>
                    </div>

                    {/* Language & Enrolled Date */}
                    <div className="flex items-start gap-2">
                      <Languages className="w-3.5 h-3.5 text-[#2d6a4f] mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#455A45] block">Primary Language</span>
                        <span className="font-semibold text-[#1b4332] uppercase">
                          {artisan.language || 'hi'} (Regional)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Business & Commerce Stats Bar */}
                  <div className="flex items-center justify-between gap-2 mt-3.5 px-3 py-2 bg-[#E1EBE1]/60 rounded-xl text-xs font-semibold text-[#2D422D]">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-[#2d6a4f]" />
                      <span>Earnings:</span>
                      <span className="font-extrabold text-[#1b4332]">
                        ₹{Number(artisan.totalEarnings || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#455A45]">
                      <span>
                        <strong className="text-[#1b4332] font-bold">{artisan.activeListingsCount || 0}</strong> Listings
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-[#1b4332] font-bold">{artisan.totalOrdersCount || 0}</strong> Orders
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between gap-3 mt-4 pt-3.5 border-t border-white/60">
                  <div className="flex items-center gap-1 text-[11px] text-[#455A45]">
                    <Calendar className="w-3 h-3 text-[#2d6a4f]" />
                    <span>Enrolled: {formatDate(artisan.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyContact(artisan.id, `${artisan.name} - ${artisan.craftType} (${artisan.phone})`)}
                      className="p-2 rounded-xl bg-white hover:bg-emerald-50 text-[#1b4332] border border-white/80 shadow-2xs transition-colors cursor-pointer"
                      title="Share / Copy Profile Details"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {onArtisanSelect && (
                      <button
                        type="button"
                        onClick={() => onArtisanSelect(artisan.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <span>View Products</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Modal: Enroll New Artisan Directly into Supabase */}
      {isEnrollModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#F0F7F0] rounded-[32px] p-6 sm:p-8 max-w-lg w-full shadow-[16px_16px_32px_rgba(0,0,0,0.25)] border border-white/80 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1b4332]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2d6a4f] text-white flex items-center justify-center shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1b4332]">Enroll New Artisan</h3>
                  <p className="text-xs text-[#455A45]">Persists directly into Supabase database</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnrollModalOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 text-[#455A45] hover:text-[#1b4332] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess ? (
              <div className="p-8 text-center bg-white/70 rounded-2xl border border-emerald-300">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2 animate-bounce" />
                <h4 className="text-base font-bold text-[#1b4332]">Artisan Successfully Enrolled!</h4>
                <p className="text-xs text-[#455A45] mt-1">
                  Saved into Supabase and registered in the active directory.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEnrollSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1b4332] mb-1">
                    Artisan Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar, Sunita Devi"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1b4332] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1b4332] mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="70"
                      value={newExperience}
                      onChange={(e) => setNewExperience(e.target.value)}
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1b4332] mb-1">
                    Craft Specialty / Category *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Terracotta Pottery, Handloom Silk, Bagru Block Print"
                    value={newCraftType}
                    onChange={(e) => setNewCraftType(e.target.value)}
                    className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1b4332] mb-1">
                      Village / District
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Naurangabad, Gorakhpur"
                      value={newVillage}
                      onChange={(e) => setNewVillage(e.target.value)}
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1b4332] mb-1">
                      State *
                    </label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none cursor-pointer"
                    >
                      <option value="Uttar Pradesh">Uttar Pradesh</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Rajasthan">Rajasthan</option>
                      <option value="Chhattisgarh">Chhattisgarh</option>
                      <option value="Bihar">Bihar</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Odisha">Odisha</option>
                      <option value="Madhya Pradesh">Madhya Pradesh</option>
                      <option value="Assam">Assam</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1b4332] mb-1">
                    Primary Regional Language
                  </label>
                  <select
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value as SupportedLanguageCode)}
                    className="w-full bg-white px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs sm:text-sm text-[#1b4332] focus:ring-2 focus:ring-[#2d6a4f] outline-none cursor-pointer"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1b4332]/10">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-[#455A45] font-semibold text-xs border border-stone-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save to Supabase</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
