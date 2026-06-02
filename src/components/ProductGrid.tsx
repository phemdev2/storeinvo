'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Product, CURRENCY } from '@/lib/types'; // 👈 Import Product from central types
import PricePromptModal from './PricePromptModal';

// --- Custom Hook for Responsive Breakpoints (Debounced) ---
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
    checkMobile(); // Initial check
    
    let timeout: NodeJS.Timeout;
    const debouncedCheck = () => {
      clearTimeout(timeout);
      timeout = setTimeout(checkMobile, 150); // Debounce resize event
    };

    window.addEventListener('resize', debouncedCheck);
    return () => {
      window.removeEventListener('resize', debouncedCheck);
      clearTimeout(timeout);
    };
  }, [breakpoint]);

  return isMobile;
}

// --- Main Component ---
export default function ProductGrid() {
  const products = usePosStore((s) => s.products);
  const search = usePosStore((s) => s.search);
  const limit = usePosStore((s) => s.limit);
  const setSearch = usePosStore((s) => s.setSearch);
  const setMobileView = usePosStore((s) => s.setMobileView);
  const openVariantModal = usePosStore((s) => s.openVariantModal);
  const addToCart = usePosStore((s) => s.addToCart);
  const openCrudModal = usePosStore((s) => s.openCrudModal);

  const isAdmin = useAuthStore((s) => s.profile?.role === 'admin');
  const isMobile = useIsMobile();

  const [priceModal, setPriceModal] = useState<{ show: boolean; product: Product | null }>({
    show: false,
    product: null,
  });

  // Capped stock value for progress bar visualization
  // Using a fixed cap (e.g., 50) prevents items with huge stock from making low-stock items look completely empty
  const STOCK_VISUAL_CAP = 50;

  // Memoize filtering and limiting for performance
  const visibleProducts = useMemo(() => {
    const s = search.toLowerCase().trim();
    const filtered = s
      ? products.filter((p) => 
          p.n.toLowerCase().includes(s) || 
          (p.b && p.b.toLowerCase().includes(s)) // Fixed: case-insensitive barcode search
        )
      : products;
    return filtered.slice(0, limit);
  }, [products, search, limit]);

  const handleProductClick = useCallback((p: Product) => {
    if (p.v && p.v.length > 0) {
      // Has variants -> open variant selection modal
      openVariantModal(p);
    } else if (p.is_var) {
      // Variable price, no variants -> prompt for custom price
      setPriceModal({ show: true, product: p });
    } else {
      // Standard product -> add directly to cart instantly
      addToCart(p, { ...p, q: 1 });
      if (isMobile) setMobileView('cart');
    }
  }, [addToCart, isMobile, openVariantModal, setMobileView]);

  const handlePriceConfirm = useCallback((price: number) => {
    if (!priceModal.product) return;
    addToCart(priceModal.product, { ...priceModal.product, p: price, q: 1 });
    setPriceModal({ show: false, product: null });
    if (isMobile) setMobileView('cart');
  }, [priceModal.product, addToCart, isMobile, setMobileView]);

  return (
    <>
      {/* Search Bar */}
      <div className="bg-white p-3 border-b shadow-sm flex items-center gap-3 sticky top-0 z-30">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-8 py-3 bg-gray-100 border-2 border-transparent focus:bg-white focus:border-purple-500 rounded-xl text-sm outline-none transition-colors"
            placeholder="Search products or scan barcode..."
            autoComplete="off"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 p-2 transition-colors"
              aria-label="Clear search"
            >
              <i className="fas fa-times-circle"></i>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 pb-24 md:pb-4">
        {visibleProducts.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-16">
            <i className="fas fa-box-open text-5xl mb-4 text-gray-300" />
            <p className="text-sm font-medium">
              {search ? 'No products match your search' : 'No products available'}
            </p>
          </div>
        ) : (
          // Grid Layout - Highly responsive across all breakpoints
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2 md:gap-3">
            {visibleProducts.map((p) => (
              <div key={p.id} className="relative group">
                {/* Main Card Button */}
                <button
                  onClick={() => handleProductClick(p)}
                  className="w-full flex flex-col justify-between bg-white rounded-xl p-3 md:p-4 border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 active:scale-[0.97] md:hover:shadow-lg md:hover:border-purple-200 text-left h-[130px] md:h-[150px] touch-manipulation md:hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-1"
                >
                  {/* Top: Price + Variant Badge */}
                  <div className="flex justify-between items-start w-full mb-1">
                    <span className="font-bold text-sm md:text-base text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md tracking-tight w-fit flex items-center gap-1.5">
                      {p.is_var ? (
                        <>
                          <i className="fas fa-pencil-alt text-[9px] text-orange-500"></i>
                          <span className="text-orange-600">₦{CURRENCY.format(p.p)}</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-tag text-[9px] opacity-50"></i>
                          ₦{CURRENCY.format(p.p)}
                        </>
                      )}
                    </span>
                    {p.v && p.v.length > 0 && (
                      <span className="flex items-center justify-center bg-emerald-50 p-1 rounded text-emerald-500">
                        <i className="fas fa-layer-group text-[10px]"></i>
                      </span>
                    )}
                  </div>

                  {/* Middle: Name + Barcode */}
                  <div className="flex-1 flex flex-col justify-center my-1 overflow-hidden">
                    <h3 className="font-semibold text-[13px] text-gray-700 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {p.n}
                    </h3>
                    {p.b && (
                      <div className="text-[10px] text-gray-400 font-mono mt-1 truncate">
                        <i className="fas fa-barcode mr-1"></i>{p.b}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Stock Bar */}
                  <div className="w-full flex items-center gap-1.5 mt-auto">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          p.s <= 0 ? 'bg-gray-300' : p.s <= 5 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (Math.max(p.s, 0) / STOCK_VISUAL_CAP) * 100)}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-[10px] font-bold min-w-[24px] text-right tabular-nums ${
                        p.s <= 0 ? 'text-red-500' : p.s <= 5 ? 'text-orange-500' : 'text-gray-400'
                      }`}
                    >
                      {p.s <= 0 ? 'Out' : p.s}
                    </span>
                  </div>
                </button>

                {/* Floating Edit Button (Admin only) */}
                {/* Visible on mobile via opacity, opacity-hover on desktop */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the parent button underneath
                      openCrudModal(p);
                    }}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur p-1.5 rounded-md text-gray-400 hover:text-purple-600 md:opacity-0 md:group-hover:opacity-100 transition-all shadow-sm border border-gray-200 z-10 focus:opacity-100"
                    title="Edit Product"
                    aria-label={`Edit ${p.n}`}
                  >
                    <i className="fas fa-pen text-[10px] pointer-events-none"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Price Prompt Modal (Only used for variable-priced items without variants) */}
      <PricePromptModal
        show={priceModal.show}
        onClose={() => setPriceModal({ show: false, product: null })}
        productName={priceModal.product?.n || ''}
        defaultPrice={priceModal.product?.p || 0}
        onConfirm={handlePriceConfirm}
      />
    </>
  );
}