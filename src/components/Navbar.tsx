import React from 'react';
import {
  Volume2,
  VolumeX,
  Globe,
  Store,
  Package,
  Globe2,
  BarChart3,
  Users,
} from 'lucide-react';
import { SupportedLanguageCode } from '../types';
import { SUPPORTED_LANGUAGES } from '../lib/languages';

export type ActiveNavTab = 'catalogue' | 'orders' | 'market_linkage' | 'analytics' | 'artisans';

interface NavbarProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  language: SupportedLanguageCode;
  onOpenLanguageModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onLaunchVoiceAssistant: () => void;
  isVoiceActive?: boolean;
  ordersCount?: number;
  productsCount?: number;
  artisansCount?: number;
  userRole?: 'Buyer' | 'Seller';
  onToggleRole?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  language,
  onOpenLanguageModal,
  isMuted,
  onToggleMute,
  onLaunchVoiceAssistant,
  isVoiceActive = false,
  ordersCount = 0,
  productsCount = 0,
  artisansCount = 0,
  userRole = 'Seller',
  onToggleRole,
}) => {
  const currentLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.code === language) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === 'en')!;

  return (
    <header className="sticky top-0 z-40 bg-[#F0F7F0]/85 backdrop-blur-xl border-b border-white/60 shadow-[0_4px_30px_rgba(45,66,45,0.04)] transition-all">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-20 gap-4 sm:gap-8">
          {/* 1. Logo + Brand — pinned to the far left */}
          <button
            type="button"
            onClick={() => onSelectTab('catalogue')}
            className="flex items-center gap-4 text-left group focus:outline-hidden cursor-pointer flex-shrink-0"
          >
            {/* Artisan Geometric Storefront SVG Icon */}
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1b4332] via-[#2d6a4f] to-[#40916c] flex items-center justify-center p-2.5 shadow-[0_6px_16px_rgba(45,106,79,0.25)] border border-white/40 group-hover:scale-105 transition-transform duration-200">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-white">
                <path d="M16 3L4 10V13H28V10L16 3Z" fill="currentColor" fillOpacity="0.9" />
                <path d="M7 15H11V26H7V15Z" fill="#D8F3DC" fillOpacity="0.95" />
                <path d="M14 15H18V26H14V15Z" fill="#B7E4C7" fillOpacity="0.95" />
                <path d="M21 15H25V26H21V15Z" fill="#D8F3DC" fillOpacity="0.95" />
                <polygon points="16,17 19,20.5 16,24 13,20.5" fill="#52B788" stroke="#ffffff" strokeWidth="1.2" />
                <path d="M4 27H28V29H4V27Z" fill="currentColor" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-400 rounded-full border-2 border-white shadow-xs" />
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold tracking-tight text-[#1b4332] font-sans letter-spacing-tight">
                  Karigar<span className="text-[#2d6a4f] font-black">Setu</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-[#d8f3dc] text-[#1b4332] border border-[#b7e4c7] shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-ping" />
                  ONDC Live
                </span>
              </div>
              <p className="text-[11px] text-[#40916c] font-semibold tracking-widest uppercase hidden sm:block">
                Voice‑First  ·  Artisan  ·  Commerce
              </p>
            </div>
          </button>

          {/* 2. Navigation Links: Dynamic based on userRole (Buyer vs Seller) */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#E1EBE1]/70 p-1.5 rounded-2xl border border-white/60 shadow-[inset_2px_2px_5px_#d1dbd1,inset_-2px_-2px_5px_#ffffff]">
            {userRole === 'Buyer' ? (
              <>
                {/* Buyer Marketplace */}
                <button
                  type="button"
                  onClick={() => onSelectTab('catalogue')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'catalogue'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Marketplace</span>
                  {productsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {productsCount}
                    </span>
                  )}
                </button>

                {/* Buyer Orders */}
                <button
                  type="button"
                  onClick={() => onSelectTab('orders')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Track Orders</span>
                  {ordersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {ordersCount}
                    </span>
                  )}
                </button>

                {/* Artisans Directory (Buyer view) */}
                <button
                  type="button"
                  onClick={() => onSelectTab('artisans')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'artisans'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Artisans</span>
                  {artisansCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {artisansCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Seller Catalogue */}
                <button
                  type="button"
                  onClick={() => onSelectTab('catalogue')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'catalogue'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Catalogue</span>
                  {productsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {productsCount}
                    </span>
                  )}
                </button>

                {/* Seller Orders */}
                <button
                  type="button"
                  onClick={() => onSelectTab('orders')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Orders</span>
                  {ordersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {ordersCount}
                    </span>
                  )}
                </button>

                {/* Market Linkage */}
                <button
                  type="button"
                  onClick={() => onSelectTab('market_linkage')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'market_linkage'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Globe2 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Market Linkage</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>

                {/* Shop Analytics */}
                <button
                  type="button"
                  onClick={() => onSelectTab('analytics')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'analytics'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Shop Analytics</span>
                </button>

                {/* Artisans Directory (Seller view) */}
                <button
                  type="button"
                  onClick={() => onSelectTab('artisans')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'artisans'
                      ? 'bg-white text-[#1b4332] shadow-[2px_2px_8px_#c8d6c8,-2px_-2px_8px_#ffffff] border border-white/80'
                      : 'text-[#455A45] hover:text-[#1b4332] hover:bg-white/40'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-[#2d6a4f]" />
                  <span>Artisans</span>
                  {artisansCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#d8f3dc] text-[#1b4332]">
                      {artisansCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </nav>

          {/* 3. Action Controls: Role Switcher, Language Pill, Audio Toggle */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Role Switcher Button */}
            {onToggleRole && (
              <button
                type="button"
                onClick={onToggleRole}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                  userRole === 'Buyer'
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-[#1b4332] border-emerald-300'
                }`}
                title={`Currently in ${userRole} mode. Click to switch.`}
              >
                <span className={`w-2 h-2 rounded-full ${userRole === 'Buyer' ? 'bg-blue-600' : 'bg-emerald-600'}`} />
                <span className="hidden sm:inline">{userRole === 'Buyer' ? 'Buyer Mode' : 'Artisan Mode'}</span>
                <span className="text-[10px] text-[#40916c] underline font-semibold sm:ml-0.5">Switch</span>
              </button>
            )}

            {/* Language Switcher */}
            <button
              type="button"
              onClick={onOpenLanguageModal}
              className="hidden sm:flex items-center gap-2 bg-[#E1EBE1] hover:bg-white px-3 py-2 rounded-xl text-xs font-bold text-[#1b4332] border border-white/70 shadow-[2px_2px_6px_#d1dbd1,-2px_-2px_6px_#ffffff] transition-all cursor-pointer"
              title="Change regional language"
            >
              <Globe className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>{currentLangConfig.nativeName}</span>
            </button>

            {/* Mute/Audio Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm'
                  : 'bg-white/90 text-[#1b4332] border-white/80 shadow-[2px_2px_6px_#d1dbd1,-2px_-2px_6px_#ffffff] hover:bg-white'
              }`}
              title={isMuted ? 'Unmute voice output' : 'Mute voice output'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around py-2.5 border-t border-white/50 text-[11px] font-bold">
          {userRole === 'Buyer' ? (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('catalogue')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
                  activeTab === 'catalogue'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Marketplace</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('orders')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Orders</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('artisans')}
                className={`flex items-center gap-1.5 py-1 px-3 rounded-lg transition-colors ${
                  activeTab === 'artisans'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Artisans</span>
              </button>
              {onToggleRole && (
                <button
                  type="button"
                  onClick={onToggleRole}
                  className="flex items-center gap-1 py-1 px-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[10px] font-bold"
                >
                  <span>Artisan View</span>
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onSelectTab('catalogue')}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  activeTab === 'catalogue'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Catalogue</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('orders')}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Orders</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('market_linkage')}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  activeTab === 'market_linkage'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Globe2 className="w-3.5 h-3.5" />
                <span>Linkage</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('analytics')}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('artisans')}
                className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors ${
                  activeTab === 'artisans'
                    ? 'bg-white text-[#1b4332] shadow-xs'
                    : 'text-[#455A45]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Artisans</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
