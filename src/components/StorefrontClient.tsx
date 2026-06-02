// components/StorefrontClient.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  ShoppingCart, Heart, User, Search, Menu, X, Star, 
  Truck, ShieldCheck, RefreshCw, ChevronRight, Package 
} from 'lucide-react';
import { Product, Category, CURRENCY } from '@/lib/types';

interface StorefrontCategory {
  id: string;
  name: string;
  slug?: string;
  image_url?: string;
  icon?: string;
  count?: number;
}

// Fallback data if DB is empty
const fallbackCategories: StorefrontCategory[] = [
  { id: '1', name: 'Electronics', icon: '💻', count: 120 },
  { id: '2', name: 'Fashion', icon: '👗', count: 85 },
  { id: '3', name: 'Home', icon: '🛋️', count: 64 },
];

export default function StorefrontClient({ 
  products, 
  categories 
}: { 
  products: Product[]; 
  categories: Category[] 
}) {
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ✅ Cast to StorefrontCategory so TypeScript recognizes `icon` and `count`
  const displayCategories: StorefrontCategory[] = categories.length > 0 
    ? categories as StorefrontCategory[] 
    : fallbackCategories;

  const toggleWishlist = (id: string | number) => {
    const stringId = String(id);
    setWishlist(prev => prev.includes(stringId) ? prev.filter(i => i !== stringId) : [...prev, stringId]);
  };

  const addToCart = () => {
    setCartCount(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">LUXE</span>
            </div>

            <div className="hidden md:flex flex-1 max-w-lg mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products, brands, categories..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-2 rounded-lg hover:bg-slate-100">
                <User className="w-5 h-5" />
                <span>Account</span>
              </button>
              
              <button className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors hover:bg-slate-100 rounded-lg">
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </button>

              <button className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors hover:bg-slate-100 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white p-4 space-y-3 animate-[slideDown_0.2s_ease-out]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl outline-none text-sm"
              />
            </div>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-700 p-2 w-full hover:bg-slate-50 rounded-lg">
              <User className="w-5 h-5" /> Account
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-slate-900 text-white">
        <Image 
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&q=80"
          alt="Hero background"
          fill
          className="object-cover opacity-30"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              New Collection 2024
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Elevate Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                Everyday Style
              </span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 max-w-lg">
              Discover curated collections tailored for the modern professional. Premium quality, timeless design.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-white text-slate-900 font-bold px-8 py-3.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-2 shadow-lg shadow-white/10">
                Shop Now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Truck, title: 'Free Shipping', desc: 'On orders over ₦50,000' },
              { icon: ShieldCheck, title: 'Secure Payment', desc: '100% protected' },
              { icon: RefreshCw, title: 'Easy Returns', desc: '30-day return policy' },
              { icon: Star, title: '24/7 Support', desc: 'Dedicated assistance' },
            ].map((val, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4">
                <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                  <val.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base text-slate-900">{val.title}</h4>
                  <p className="text-xs md:text-sm text-slate-500">{val.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Shop by Category</h2>
            <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {displayCategories.map((cat) => (
              <button key={cat.id} className="group bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-center gap-3 hover:border-slate-900 transition-all duration-300 hover:shadow-lg">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{cat.icon || '📦'}</span>
                <div className="text-center">
                  <h3 className="font-bold text-sm text-slate-900">{cat.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{cat.count ?? 0} items</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Featured Products</h2>
            <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Responsive Grid: 1 col on mobile -> 5 cols on ultra-wide */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {products.map((product) => (
              <div key={product.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 flex flex-col">
                
                {/* Image Area - Next.js Image used here for DB URLs */}
                <div className="relative aspect-square bg-slate-100 overflow-hidden">
                  {product.image_url ? (
                    <Image 
                      src={product.image_url}
                      alt={product.n}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package className="w-12 h-12" />
                    </div>
                  )}
                  
                  {product.badge && (
                    <span className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold rounded-full ${
                      product.badge === 'Sale' ? 'bg-rose-500 text-white' : 
                      product.badge === 'New' ? 'bg-emerald-500 text-white' : 
                      'bg-slate-900 text-white'
                    }`}>
                      {product.badge}
                    </span>
                  )}

                  <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <button 
                      onClick={() => toggleWishlist(product.id)}
                      className={`p-2 rounded-xl shadow-md transition-colors ${
                        wishlist.includes(String(product.id)) ? 'bg-rose-500 text-white' : 'bg-white text-slate-600 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${wishlist.includes(String(product.id)) ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                    <button 
                      onClick={addToCart}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>

                {/* Details Area */}
                <div className="p-4 flex-1 flex flex-col">
                  <span className="text-[10px] font-medium text-indigo-600 mb-1 uppercase tracking-wider">
                    {product.c || product.b || 'General'}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-2 line-clamp-2 leading-tight">{product.n}</h3>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.floor(product.rating ?? 0) ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-500 ml-1">({product.reviews ?? 0})</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2">
                    <span className="text-base font-extrabold text-slate-900">₦{CURRENCY.format(product.p)}</span>
                    {product.original_price && (
                      <span className="text-xs text-slate-400 line-through">₦{CURRENCY.format(product.original_price)}</span>
                    )}
                    {product.original_price && (
                      <span className="ml-auto text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-md">
                        -{Math.round((1 - product.p / product.original_price) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {products.length === 0 && (
             <div className="text-center py-16 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-4 text-slate-200" />
                <p className="font-medium">No products found in the database.</p>
             </div>
          )}
        </div>
      </section>

      <style jsx>{`
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}