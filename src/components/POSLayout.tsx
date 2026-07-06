'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import CartSidebar from './CartSidebar';
import ProductGrid from './ProductGrid';
import VariantModal from './VariantModal';
import ReceiptModal from './ReceiptModal';
import ProductCrudModal from './ProductCrudModal';
import UserDropdown from './UserDropdown';
import Link from 'next/link';

/* ---------------------------------------------------------
   Same token system as ProductCrudModal: near-black chrome,
   a single brass accent standing in for the old purple, and
   the same nm-theme localStorage switch so the shell and the
   modals always agree on light/dark.
--------------------------------------------------------- */
const DARK = {
  bgShell: '#0a0908', bgNav: '#121110', bgSunken: '#1a1815',
  border: '#242119', borderSoft: '#1a1712',
  text: '#ece6d9', textMid: '#948c7c', textFaint: '#5c564a',
  accent: '#c9a24a', accentSoft: '#c9a24a22', accentText: '#0a0908',
  danger: '#b5566f',
};
const LIGHT = {
  bgShell: '#f3ede1', bgNav: '#ffffff', bgSunken: '#faf7f0',
  border: '#e6ddc9', borderSoft: '#efe8d8',
  text: '#211d15', textMid: '#7a7160', textFaint: '#a89f8c',
  accent: '#96741f', accentSoft: '#96741f14', accentText: '#ffffff',
  danger: '#c0392b',
};

export default function POSLayout() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => setIsDark(localStorage.getItem('nm-theme') !== 'light'), []);
  const T = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  // ✅ Initialize from localStorage for persistence across refreshes
  const [cartWidth, setCartWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('pos-cart-width');
      return savedWidth ? parseInt(savedWidth, 10) : 420;
    }
    return 420;
  });

  // Refs for drag logic
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Store State & Actions
  const mobileView = usePosStore((s) => s.mobileView);
  const setMobileView = usePosStore((s) => s.setMobileView);
  const sessions = usePosStore((s) => s.sessions);
  const activeTab = usePosStore((s) => s.activeTab);
  const queue = usePosStore((s) => s.queue);
  const syncing = usePosStore((s) => s.syncing);

  const processQueue = usePosStore((s) => s.processQueue);
  const openCrudModal = usePosStore((s) => s.openCrudModal);

  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';
  const cartCount = Object.keys(sessions[activeTab]?.items || {}).length;

  // ✅ Save to localStorage whenever width changes
  useEffect(() => {
    localStorage.setItem('pos-cart-width', String(cartWidth));
  }, [cartWidth]);

  // Queue Processing Effect
  useEffect(() => {
    if (queue.length === 0 || syncing) return;
    processQueue();
  }, [queue.length, syncing, processQueue]);

  // ✅ Draggable divider logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      // Calculate new width based on mouse position relative to the container
      let newWidth = e.clientX - rect.left;

      // Clamp width: Min 280px, Max container width minus 400px (for products)
      const minWidth = 280;
      const maxWidth = rect.width - 400;
      newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));

      setCartWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        // Reset body styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    // Prevent text selection and change cursor while dragging
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      className="font-sans h-[100dvh] overflow-hidden flex flex-col select-none"
      style={{ background: T.bgShell, color: T.text }}
    >
      {/* TOP NAV */}
      <nav
        className="h-14 md:h-12 flex-none z-50 flex justify-between items-center px-3 md:px-4"
        style={{ background: T.bgNav, borderBottom: `1px solid ${T.border}`, boxShadow: '0 1px 0 #00000030' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded flex items-center justify-center font-bold text-lg"
            style={{ background: T.accent, color: T.accentText, fontFamily: '"Cormorant Garamond", serif' }}
          >
            P
          </div>
          <span
            className="font-bold text-lg hidden lg:block tracking-wide"
            style={{ fontFamily: '"Cormorant Garamond", serif', color: T.text, letterSpacing: '0.02em' }}
          >
            STOREFLOW POS
          </span>

          {isAdmin && (
            <Link
              href="/products"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: T.bgSunken, color: T.textMid, border: `1px solid ${T.border}` }}
            >
              <i className="fas fa-box"></i> Manage Products
            </Link>
          )}

          {isAdmin && (
            <a
              href="/admin"
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: `${T.accent}1a`, color: T.accent, border: `1px solid ${T.accent}44` }}
            >
              <i className="fas fa-users-cog"></i> Staff
            </a>
          )}

          <div className="flex md:hidden p-1 rounded-lg ml-1" style={{ background: T.bgSunken, border: `1px solid ${T.border}` }}>
            <button
              onClick={() => setMobileView('products')}
              className="px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors"
              style={mobileView === 'products'
                ? { background: T.accent, color: T.accentText }
                : { color: T.textFaint }}
            >
              Items
            </button>
            <button
              onClick={() => setMobileView('cart')}
              className="px-3 py-1 rounded text-[10px] font-bold uppercase flex items-center transition-colors"
              style={mobileView === 'cart'
                ? { background: T.accent, color: T.accentText }
                : { color: T.textFaint }}
            >
              Cart {cartCount > 0 && <span className="w-1.5 h-1.5 ml-1 rounded-full inline-block" style={{ background: T.danger }}></span>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {queue.length > 0 && (
            <div
              className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold"
              style={{ background: '#d4a01722', color: '#d4a017', border: '1px solid #d4a01744' }}
              title={`${queue.length} orders pending sync`}
            >
              <i className={`fas fa-sync ${syncing ? 'fa-spin' : ''}`}></i>
              <span>{queue.length}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: '#4a9c6d', boxShadow: '0 0 6px #4a9c6dcc' }}></div>
            <span className="hidden md:inline text-xs" style={{ color: T.textMid }}>Online</span>
          </div>

          <UserDropdown />
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      {/* ✅ Added ref to calculate drag bounds */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">

        {/* CART */}
        <div
          className={`z-40 flex flex-col h-full ${mobileView === 'cart' ? 'absolute inset-0 w-full md:relative' : 'hidden md:flex relative'}`}
          style={{
            width: mobileView !== 'cart' ? `${cartWidth}px` : undefined,
            background: T.bgNav,
            boxShadow: '0 0 24px -8px #00000040',
          }}
        >
          <CartSidebar />
        </div>

        {/* ✅ DRAGGABLE DIVIDER */}
        {/* Visible only on desktop, hidden when cart is fullscreen on mobile */}
        <div
          onMouseDown={handleDragStart}
          className={`w-1.5 cursor-col-resize transition-colors flex-shrink-0 relative group ${mobileView === 'cart' ? 'hidden' : 'hidden md:block'}`}
          style={{ background: T.border }}
          onMouseEnter={(e) => (e.currentTarget.style.background = T.accent)}
          onMouseLeave={(e) => (e.currentTarget.style.background = T.border)}
        >
          {/* Visual dots in the middle of the divider */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full" style={{ background: T.textFaint }}></div>
            <div className="w-1 h-1 rounded-full" style={{ background: T.textFaint }}></div>
            <div className="w-1 h-1 rounded-full" style={{ background: T.textFaint }}></div>
          </div>
        </div>

        {/* PRODUCTS */}
        <div
          className={`flex-1 flex flex-col overflow-hidden w-full min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}
          style={{ background: T.bgShell }}
        >
          <ProductGrid />
        </div>
      </div>

      {/* MODALS */}
      <VariantModal />
      <ReceiptModal />
      <ProductCrudModal />
    </div>
  );
}