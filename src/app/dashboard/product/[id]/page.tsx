'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { Product, ProductVariant, CURRENCY } from '@/lib/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₦' + CURRENCY.format(n);
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
          {/* Image Skeleton */}
          <div className="aspect-square rounded-3xl bg-[#E5E5E0] mb-6 lg:mb-0" />
          {/* Details Skeleton */}
          <div className="space-y-6">
            <div className="h-4 bg-[#E5E5E0] rounded-full w-1/4" />
            <div className="h-8 bg-[#E5E5E0] rounded-lg w-3/4" />
            <div className="h-6 bg-[#E5E5E0] rounded-lg w-1/4" />
            <div className="h-12 bg-[#E5E5E0] rounded-2xl w-full mt-8" />
            <div className="space-y-3 pt-6 border-t border-[#E5E5E0]">
              <div className="h-4 bg-[#E5E5E0] rounded-full w-full" />
              <div className="h-4 bg-[#E5E5E0] rounded-full w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { products, fetchProducts, addToCart } = usePosStore();
  const { activeBranchId } = useAuthStore();

  // Fetch product: try from store first, else fetch from DB for deep-links
  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      let found = products.find((p) => String(p.id) === productId);

      if (!found && activeBranchId) {
        // Fetch all if not in store (or just fetch single product in real app)
        await fetchProducts(activeBranchId);
        found = usePosStore.getState().products.find((p) => String(p.id) === productId);
      } 
      
      // Fallback direct DB fetch if still not found (handles deep links without branch context)
      if (!found) {
        const { data, error: dbError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
          
        if (dbError || !data) {
          setError('Product not found or unavailable');
        } else {
          found = data as Product;
        }
      }

      if (found) {
        setProduct(found);
        if (found.is_var && found.v && found.v.length > 0) {
          setSelectedVariant(found.v[0]);
        }
      }
      setIsLoading(false);
    };

    loadProduct();
  }, [productId, products, activeBranchId, fetchProducts]);

  // Derived State
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return selectedVariant?.p || product.p;
  }, [product, selectedVariant]);

  const currentStock = useMemo(() => {
    if (!product) return 0;
    return selectedVariant?.s !== undefined ? selectedVariant.s : product.s;
  }, [product, selectedVariant]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((p) => p.b === product.b && p.id !== product.id).slice(0, 4);
  }, [products, product]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(product, selectedVariant, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (isLoading) return <ProductDetailSkeleton />;
  
  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center gap-4 p-4">
        <div className="w-20 h-20 rounded-full bg-[#FFF5F2] flex items-center justify-center mb-2">
          <i className="fas fa-exclamation-triangle text-[#E8553A] text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Product Not Found</h2>
        <p className="text-[#6B7280] text-sm text-center">{error || "The product you are looking for does not exist or has been removed."}</p>
        <button onClick={() => router.push('/')} className="mt-4 px-6 py-3 bg-[#E8553A] text-white rounded-2xl font-semibold text-sm hover:bg-[#D14E2D] transition-colors shadow-md shadow-[#E8553A]/20">
          Back to Store
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Inject LUXE Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── TOP NAV ── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-[#E5E5E0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl hover:bg-[#F0F0EC] flex items-center justify-center transition-colors">
              <i className="fas fa-arrow-left text-[#1A1A2E]" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-[#E8553A] flex items-center justify-center shadow-md shadow-[#E8553A]/20">
              <span className="text-white font-black text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>S</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#1A1A2E] text-white rounded-xl text-sm font-semibold hover:bg-[#2D2D42] transition-colors shadow-md" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <i className="fas fa-store text-xs mr-1.5" /> Store
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
          
          {/* Image Gallery / Placeholder */}
          <div className="mb-8 lg:mb-0 anim-fade-up">
            <div className="aspect-square rounded-3xl bg-[#F0F0EC] border border-[#E5E5E0] flex items-center justify-center relative overflow-hidden group shadow-xl">
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center text-6xl font-bold text-[#E5E5E0] select-none transition-transform duration-500 group-hover:scale-110" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {product.n.charAt(0).toUpperCase()}
              </div>
              {product.s === 0 && !product.is_var && (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-xs uppercase tracking-widest text-[#6B7280] font-semibold bg-white px-4 py-2 rounded-full border border-[#E5E5E0]">Out of Stock</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="anim-fade-up" style={{ animationDelay: '150ms' }}>
            <div className="flex flex-col gap-4">
              {product.b && (
                <span className="text-xs uppercase tracking-widest text-[#E8553A] font-semibold">{product.b}</span>
              )}
              
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1A1A2E] leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {product.n}
              </h1>

              <div className="flex items-center gap-4 mt-1">
                <span className="text-3xl font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{fmt(currentPrice)}</span>
                {selectedVariant?.p && selectedVariant.p !== product.p && (
                  <span className="text-lg line-through text-[#6B7280]">{fmt(product.p)}</span>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mt-2">
                <div className={`w-2.5 h-2.5 rounded-full ${currentStock > 0 ? 'bg-[#2DD4A8]' : 'bg-[#E8553A]'}`} />
                <span className={`text-sm font-medium ${currentStock > 0 ? 'text-[#2DD4A8]' : 'text-[#E8553A]'}`}>
                  {currentStock > 0 ? `${currentStock} In Stock` : 'Out of Stock'}
                </span>
              </div>

              {/* Variant Selection */}
              {product.is_var && product.v && product.v.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Variants</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.v.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                          selectedVariant?.id === variant.id
                            ? 'bg-[#1A1A2E] text-white border-[#1A1A2E] shadow-md'
                            : 'bg-white text-[#1A1A2E] border-[#E5E5E0] hover:border-[#1A1A2E]'
                        }`}
                      >
                        {variant.n}
                        {variant.p ? ` - ${fmt(variant.p)}` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity & Add to Cart */}
              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-[#FAFAF8] border border-[#E5E5E0] rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                      className="w-12 h-12 flex items-center justify-center text-[#1A1A2E] hover:bg-[#F0F0EC] transition-colors text-lg font-bold"
                    >−</button>
                    <span className="w-12 text-center text-[#1A1A2E] font-semibold border-l border-r border-[#E5E5E0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{quantity}</span>
                    <button 
                      onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} 
                      disabled={quantity >= currentStock}
                      className="w-12 h-12 flex items-center justify-center text-[#1A1A2E] hover:bg-[#F0F0EC] transition-colors text-lg font-bold disabled:text-[#E5E5E0] disabled:cursor-not-allowed"
                    >+</button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={currentStock === 0}
                  className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] shadow-xl flex items-center justify-center gap-3 ${
                    currentStock === 0
                      ? 'bg-[#F0F0EC] text-[#6B7280] cursor-not-allowed shadow-none'
                      : addedToCart 
                        ? 'bg-[#2DD4A8] text-white shadow-[#2DD4A8]/30'
                        : 'bg-[#E8553A] text-white hover:bg-[#D14E2D] shadow-[#E8553A]/30'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {currentStock === 0 ? (
                    'Out of Stock'
                  ) : addedToCart ? (
                    <><i className="fas fa-check" /> Added to Cart</>
                  ) : (
                    <><i className="fas fa-shopping-bag" /> Add to Cart · {fmt(currentPrice * quantity)}</>
                  )}
                </button>
              </div>

              {/* Description / Details */}
              <div className="mt-8 pt-8 border-t border-[#E5E5E0] space-y-4">
                <h3 className="text-sm font-semibold text-[#1A1A2E] uppercase tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Details</h3>
                <p className="text-[#6B7280] leading-relaxed">
                  This is a premium quality {product.n.toLowerCase()}. Carefully curated for the best experience, ensuring durability and style. Perfect for everyday use or special occasions.
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-[#FAFAF8] p-4 rounded-2xl border border-[#E5E5E0]">
                    <p className="text-xs text-[#6B7280] mb-1">SKU</p>
                    <p className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{product.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="bg-[#FAFAF8] p-4 rounded-2xl border border-[#E5E5E0]">
                    <p className="text-xs text-[#6B7280] mb-1">Category</p>
                    <p className="text-sm font-semibold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{product.b || 'General'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 mb-12">
            <h2 className="text-2xl font-bold text-[#1A1A2E] mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>You Might Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {relatedProducts.map((p) => (
                <div key={p.id} onClick={() => router.push(`/product/${p.id}`)} className="group bg-white rounded-2xl border border-[#E5E5E0] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col">
                  <div className="aspect-square bg-[#F0F0EC] flex items-center justify-center relative overflow-hidden">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-xl font-bold text-[#E5E5E0] group-hover:scale-110 transition-transform" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      {p.n.charAt(0)}
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <p className="text-sm font-semibold text-[#1A1A2E] line-clamp-2 leading-tight">{p.n}</p>
                    <div className="mt-auto pt-2">
                      <span className="text-base font-bold text-[#1A1A2E]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{fmt(p.p)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Animations CSS */}
      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-fade-up { animation: fadeInUp 0.6s ease both; }
      `}</style>
    </div>
  );
}