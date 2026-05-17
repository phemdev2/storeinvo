'use client';

import { useEffect, useRef, useState } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import CartSidebar from './CartSidebar';
import ProductGrid from './ProductGrid';
import VariantModal from './VariantModal';
import ReceiptModal from './ReceiptModal';
import ProductCrudModal from './ProductCrudModal';
import UserDropdown from './UserDropdown';
import Link from 'next/link';

export default function POSLayout() {
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
    <div className="bg-slate-100 font-sans text-gray-800 h-[100dvh] overflow-hidden flex flex-col select-none">
      {/* TOP NAV */}
      <nav className="bg-slate-900 text-white h-14 md:h-12 flex-none z-50 shadow-md flex justify-between items-center px-3 md:px-4">
        {/* ... Nav Contents Unchanged ... */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center font-bold text-lg">P</div>
          <span className="font-bold text-lg hidden lg:block">STOREFLOW POS</span>

        {isAdmin && (
  <Link 
    href="/products" 
    className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 transition-all"
  >
    <i className="fas fa-box"></i> Manage Products
  </Link>
)}

          {isAdmin && (
            <a href="/admin" className="hidden md:flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-600 transition-all">
              <i className="fas fa-users-cog"></i> Staff
            </a>
          )}

          <div className="flex md:hidden bg-slate-800 p-1 rounded-lg ml-1">
            <button onClick={() => setMobileView('products')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${mobileView === 'products' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>Items</button>
            <button onClick={() => setMobileView('cart')} className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${mobileView === 'cart' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
              Cart {cartCount > 0 && <span className="w-1.5 h-1.5 ml-1 rounded-full bg-red-500 inline-block"></span>}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {queue.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold" title={`${queue.length} orders pending sync`}>
              
              <i className={`fas fa-sync ${syncing ? 'fa-spin' : ''}`}></i>
              <span>{queue.length}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></div>
            <span className="hidden md:inline text-gray-300 text-xs">Online</span>
          </div>

          <UserDropdown />
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      {/* ✅ Added ref to calculate drag bounds */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden relative">
        
        {/* CART */}
        <div 
          className={`bg-white shadow-xl z-40 flex flex-col h-full ${mobileView === 'cart' ? 'absolute inset-0 w-full md:relative' : 'hidden md:flex relative'}`}
          style={mobileView !== 'cart' ? { width: `${cartWidth}px` } : undefined}
        >
          <CartSidebar />
        </div>

        {/* ✅ DRAGGABLE DIVIDER */}
        {/* Visible only on desktop, hidden when cart is fullscreen on mobile */}
        <div 
          onMouseDown={handleDragStart}
          className={`w-1.5 bg-slate-200 hover:bg-purple-500 cursor-col-resize transition-colors flex-shrink-0 relative group ${mobileView === 'cart' ? 'hidden' : 'hidden md:block'}`}
        >
          {/* Visual dots in the middle of the divider */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
            <div className="w-1 h-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors"></div>
            <div className="w-1 h-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors"></div>
            <div className="w-1 h-1 rounded-full bg-slate-400 group-hover:bg-white transition-colors"></div>
          </div>
        </div>

        {/* PRODUCTS */}
        <div className={`flex-1 flex flex-col bg-slate-100 overflow-hidden w-full min-w-0 ${mobileView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
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