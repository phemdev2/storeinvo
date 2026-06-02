'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { usePosStore } from '@/store/usePosStore';
import { Product, CURRENCY, CartItem } from '@/lib/types';

const fmt = (n: number) => '₦' + CURRENCY.format(n);

const themes = {
  light: {
    bg: '#f9f7f4', bgCard: '#ffffff', bgDeep: '#f2ede6', bgInput: '#ffffff',
    header: 'rgba(249,247,244,0.95)', border: '#e4ddd3', borderMid: '#cfc8bc',
    text: '#1a1612', textMid: '#6b6356', textMute: '#b0a99e',
    accent: '#a07830', accentHover: '#b88c3a', accentText: '#ffffff',
    scrollTrack: '#f2ede6', scrollThumb: '#cfc8bc', overlay: 'rgba(26,22,18,0.5)',
    cardHoverBorder: '#b0a99e', inputBorder: '#cfc8bc', placeholderColor: '#b0a99e',
  },
  dark: {
    bg: '#0d0d0d', bgCard: '#141414', bgDeep: '#0a0a0a', bgInput: '#141414',
    header: 'rgba(13,13,13,0.95)', border: '#1e1e1e', borderMid: '#2e2e2e',
    text: '#e8e4dc', textMid: '#888880', textMute: '#444440',
    accent: '#c9a84c', accentHover: '#d4b45c', accentText: '#0d0d0d',
    scrollTrack: '#0d0d0d', scrollThumb: '#2e2e2e', overlay: 'rgba(0,0,0,0.7)',
    cardHoverBorder: '#2e2e2e', inputBorder: '#2e2e2e', placeholderColor: '#444',
  },
} as const;

type Theme = typeof themes.light | typeof themes.dark;

function ProductDetail({
  product, T, onBack, onAdd, cartCount, onViewCart
}: {
  product: Product & { images?: string[] };
  T: Theme;
  onBack: () => void;
  onAdd: (p: Product) => void;
  cartCount: number;
  onViewCart: () => void;
}) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => { setActiveImage(null); }, [product.id]);

  const extraImgs = product.images ?? [];
  const allImgs = [product.image_url, ...extraImgs].filter(Boolean) as string[];
  const displayImg = activeImage ?? allImgs[0] ?? null;

  return (
    <div className="nm-animate">
      <button onClick={onBack} aria-label="Back to products" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: T.accent, cursor: 'pointer', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '48px' }}>
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Products
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2px', background: T.border }}>
        <div style={{ background: T.bgDeep, display: 'flex', flexDirection: 'column', minHeight: '520px' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', minHeight: '400px', overflow: 'hidden' }}>
            {displayImg ? (
              <img key={displayImg} src={displayImg} alt={product.n} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} style={{ width: '80%', height: '80%', objectFit: 'contain', animation: 'nmImgFade 0.25s ease' }} />
            ) : (
              <span className="nm-serif" style={{ fontSize: '120px', fontWeight: 300, color: T.accent, opacity: 0.2 }}>{product.n.charAt(0)}</span>
            )}
            <div style={{ position: 'absolute', top: '24px', left: '24px' }}><span className="nm-tag" style={{ color: T.accent }}>{product.c || product.b || 'General'}</span></div>
            {allImgs.length > 1 && <div style={{ position: 'absolute', bottom: '16px', right: '16px', fontSize: '10px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase' }}>{allImgs.indexOf(displayImg ?? '') + 1} / {allImgs.length}</div>}
          </div>
          {allImgs.length > 1 && (
            <div style={{ display: 'flex', gap: '2px', padding: '2px', background: T.border, overflowX: 'auto', flexShrink: 0 }}>
              {allImgs.map((url, idx) => {
                const isActive = (activeImage ?? allImgs[0]) === url;
                return (
                  <button key={idx} onClick={() => setActiveImage(url)} aria-label={`View image ${idx+1}`} style={{ flexShrink: 0, width: '80px', height: '80px', background: T.bgCard, border: 'none', padding: '0', cursor: 'pointer', position: 'relative', overflow: 'hidden', outline: isActive ? `2px solid ${T.accent}` : 'none', outlineOffset: '-2px', opacity: isActive ? 1 : 0.55 }}>
                    <img src={url} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div style={{ background: T.bgCard, padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 className="nm-serif" style={{ fontSize: '42px', fontWeight: 300, color: T.text, lineHeight: 1.1, marginBottom: '24px' }}>{product.n}</h2>
          <div style={{ height: '1px', background: T.border, marginBottom: '24px' }} />
          <div className="nm-serif" style={{ fontSize: '48px', color: T.accent, fontWeight: 400, marginBottom: '24px' }}>{fmt(product.p)}</div>
          <p style={{ fontSize: '14px', color: T.textMid, lineHeight: 1.8, marginBottom: '32px', fontWeight: 300 }}>Premium product. Available stock: <span style={{ color: T.text }}>{product.s} units</span>.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => onAdd(product)} style={{ background: T.accent, color: T.accentText, border: 'none', padding: '13px 28px', fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Add to Cart</button>
            <button onClick={onViewCart} style={{ background: 'none', color: T.text, border: `1px solid ${T.borderMid}`, padding: '12px 28px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>View Cart ({cartCount})</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NovaMartStorefront() {
  const router = useRouter();
  const { user, isLoading, branches, activeBranchId, fetchProfile, setActiveBranch } = useAuthStore();
  const { products, fetchProducts, addToCart, modItem, clearCart, sessions, activeTab } = usePosStore();

  const [isDark, setIsDark] = useState(false);
  const T = isDark ? themes.dark : themes.light;

  const [section, setSection] = useState<'home' | 'products' | 'categories' | 'deals' | 'contact' | 'details'>('home');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState('');

  const searchRef = useRef<HTMLInputElement>(null);

  const cartItems = useMemo(() => Object.values(sessions[activeTab]?.items ?? {}), [sessions, activeTab]);
  const cartCount = useMemo(() => cartItems.reduce((a, i) => a + i.qty, 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((a, i) => a + i.p * i.qty, 0), [cartItems]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { if (user && branches[0] && !activeBranchId) setActiveBranch(branches[0].id); }, [user, branches, activeBranchId, setActiveBranch]);
  useEffect(() => { if (activeBranchId) fetchProducts(activeBranchId); }, [activeBranchId, fetchProducts]);
  useEffect(() => { if (!isLoading && !user) router.push('/login'); }, [user, isLoading, router]);

  // theme persist
  useEffect(() => {
    const saved = localStorage.getItem('nm-theme');
    if (saved) setIsDark(saved === 'dark');
    else setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => { localStorage.setItem('nm-theme', isDark ? 'dark' : 'light'); }, [isDark]);

  // escape handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCartOpen(false); setMobileMenu(false); setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50); }, [searchOpen]);

  const categories = useMemo(() => Array.from(new Set(products.map(p => p.c || p.b).filter(Boolean) as string[])), [products]);
  const filtered = useMemo(() => {
    let list = products;
    if (category) list = list.filter(p => (p.c || p.b) === category);
    if (query) list = list.filter(p => (p.n ?? '').toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [products, category, query]);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); }, []);
  const handleAdd = useCallback((p: Product) => { addToCart(p); showToast(`${p.n} added`); }, [addToCart, showToast]);
  const showDetails = useCallback((p: Product) => { setSelectedProduct(p); setSection('details'); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  // ✅ FIX: Use CartItem type and correct variant lookup (p.v instead of p.variants)
  const decreaseQty = useCallback((item: CartItem) => modItem(`${item.id}_${item.vid ?? 'base'}`, -1), [modItem]);
  const increaseQty = useCallback((item: CartItem) => {
    const product = products.find(p => p.id === item.id);
    // Use .v instead of .variants, and safely compare string/number IDs
    const variant = product?.v?.find((v) => String(v.id) === String(item.vid));
    if (product) addToCart(product, variant);
  }, [products, addToCart]);
  const removeItem = useCallback((item: CartItem) => modItem(`${item.id}_${item.vid ?? 'base'}`, -item.qty), [modItem]);

  const accentColors = useMemo(() => [T.accent, '#a87c4f', '#7c9a8c', '#8c7ca8', '#a84c6b'], [T.accent]);

  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: T.bg }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '2px', height: '48px', background: `linear-gradient(to bottom, transparent, ${T.accent})`, animation: 'nmPulse 1.4s ease-in-out infinite' }} />
        <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '13px', letterSpacing: '4px', color: T.textMid, textTransform: 'uppercase' }}>Loading</span>
      </div>
    </div>
  );
  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: '"DM Sans", sans-serif', WebkitFontSmoothing: 'antialiased', transition: 'background 0.3s, color 0.3s' }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.scrollTrack}; }
        ::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 2px; }
        @keyframes nmSlideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
       .nm-animate { animation: nmSlideUp 0.35s ease both; }
        @keyframes nmDrawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
       .nm-drawer { animation: nmDrawerIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes nmToastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
       .nm-toast { animation: nmToastIn 0.25s ease both; }
        @keyframes nmPulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes nmImgFade { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
       .nm-serif { font-family: "Cormorant Garamond", serif; }
       .nm-tag { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; padding: 4px 10px; border: 1px solid currentColor; }
        @media (min-width: 640px) {.nm-sm-show { display: block!important; } }
        @media (max-width: 768px) {.nm-desktop-nav { display: none!important; }.nm-main { padding-bottom: calc(80px + env(safe-area-inset-bottom))!important; } }
        @media (min-width: 769px) {.nm-mobile-btn { display: none!important; }.nm-bottom-nav { display: none!important; } }
      `}</style>

      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: T.header, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
            <button onClick={() => setSection('home')} aria-label="Home" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '32px', height: '32px', borderTop: `2px solid ${T.accent}`, borderLeft: `2px solid ${T.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '18px', fontWeight: 600, color: T.accent, lineHeight: 1 }}>N</span>
              </div>
              <div style={{ display: 'none' }} className="nm-sm-show">
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontSize: '20px', fontWeight: 600, color: T.text, letterSpacing: '1px', lineHeight: 1 }}>NovaMart</div>
                <div style={{ fontSize: '9px', letterSpacing: '3px', color: T.textMute, textTransform: 'uppercase', marginTop: '2px' }}>by Storeflow</div>
              </div>
            </button>

            <nav style={{ display: 'flex', alignItems: 'center', gap: '4px' }} className="nm-desktop-nav">
              {(['home', 'products', 'categories', 'deals', 'contact'] as const).map(s => (
                <button key={s} onClick={() => setSection(s)} style={{ fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase', fontWeight: 400, padding: '8px 16px', borderRadius: '2px', color: section === s ? T.accent : T.textMid, background: 'none', border: 'none', cursor: 'pointer' }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={() => setSearchOpen(!searchOpen)} aria-label="Search" style={{ background: 'none', border: `1px solid ${T.border}`, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.textMid, borderRadius: '2px' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
              <button onClick={() => setCartOpen(true)} aria-label="Cart" style={{ background: 'none', border: `1px solid ${T.border}`, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.textMid, borderRadius: '2px', position: 'relative' }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                {cartCount > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', width: '18px', height: '18px', background: T.accent, color: T.accentText, fontSize: '10px', fontWeight: 500, display: 'grid', placeItems: 'center', borderRadius: '1px' }}>{cartCount}</span>}
              </button>
              <button onClick={() => setIsDark(d => !d)} aria-label="Toggle theme" style={{ background: 'none', border: `1px solid ${T.border}`, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.textMid, borderRadius: '2px' }}>
                {isDark ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
              </button>
              <button onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu" style={{ background: 'none', border: `1px solid ${T.border}`, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.textMid, borderRadius: '2px' }} className="nm-mobile-btn">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">{mobileMenu ? <path d="M18 6L6 18M6 6l12 12"/> : <><path d="M4 6h16M4 12h16M4 18h16"/></>}</svg>
              </button>
            </div>
          </div>
        </div>

        {mobileMenu && (
          <div style={{ background: T.bg, borderTop: `1px solid ${T.border}`, padding: '16px 24px 24px' }}>
            {(['home', 'products', 'categories', 'deals', 'contact'] as const).map(s => (
              <button key={s} onClick={() => { setSection(s); setMobileMenu(false); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 0', borderBottom: `1px solid ${T.border}`, background: 'none', border: 'none', borderBottomStyle: 'solid', fontSize: '11px', letterSpacing: '2.5px', textTransform: 'uppercase', color: section === s ? T.accent : T.textMid, cursor: 'pointer' }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {searchOpen && (
          <div style={{ borderTop: `1px solid ${T.border}`, padding: '12px 24px', background: T.bg }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '12px' }}>
              <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" style={{ background: T.bgInput, border: `1px solid ${T.inputBorder}`, color: T.text, padding: '12px 16px', fontFamily: '"DM Sans", sans-serif', fontSize: '14px', outline: 'none', width: '100%' }} />
              <button onClick={() => { setQuery(''); setCategory(''); }} style={{ background: 'none', color: T.text, border: `1px solid ${T.borderMid}`, padding: '12px 28px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
        )}
      </header>

      <main className="nm-main" style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {section === 'home' && (
          <div className="nm-animate">
            <div style={{ borderBottom: `1px solid ${T.border}`, paddingBottom: '80px', marginBottom: '80px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '40px', alignItems: 'end' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                    <div style={{ width: '32px', height: '1px', background: T.accent }} />
                    <span style={{ fontSize: '11px', letterSpacing: '3px', color: T.accent, textTransform: 'uppercase' }}>New Season</span>
                  </div>
                  <h1 className="nm-serif" style={{ fontSize: 'clamp(52px, 8vw, 96px)', fontWeight: 300, lineHeight: 0.9, color: T.text, letterSpacing: '-1px' }}>Shop<br /><em style={{ fontStyle: 'italic', color: T.accent }}>Curated</em><br />Selections</h1>
                  <p style={{ marginTop: '28px', color: T.textMid, fontSize: '15px', lineHeight: 1.7, maxWidth: '420px', fontWeight: 300 }}>Discover {products.length}+ exceptional products. Curated for quality, delivered with care.</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '40px', flexWrap: 'wrap' }}>
                    <button onClick={() => setSection('products')} style={{ background: T.accent, color: T.accentText, border: 'none', padding: '13px 28px', fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Shop Now</button>
                    <button onClick={() => setSection('categories')} style={{ background: 'none', color: T.text, border: `1px solid ${T.borderMid}`, padding: '12px 28px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Categories</button>
                  </div>
                </div>
              </div>
            </div>
            {products.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '32px' }}>
                  <h2 className="nm-serif" style={{ fontSize: '32px', fontWeight: 300, color: T.text }}>Best Sellers</h2>
                  <button onClick={() => setSection('products')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', letterSpacing: '2px', color: T.accent, textTransform: 'uppercase' }}>View all →</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1px', background: T.border }}>
                  {products.slice(0, 4).map((p, i) => (
                    <div key={p.id} onClick={() => showDetails(p)} style={{ background: T.bgCard, cursor: 'pointer' }}>
                      <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: T.bgDeep }}>
                        {p.image_url ? <img src={p.image_url} alt={p.n} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} style={{ width: '85%', height: '85%', objectFit: 'contain' }} /> : <span className="nm-serif" style={{ fontSize: '56px', fontWeight: 300, color: accentColors[i % accentColors.length], opacity: 0.4 }}>{p.n.charAt(0)}</span>}
                        <div style={{ position: 'absolute', top: '16px', right: '16px' }}><span className="nm-tag" style={{ color: accentColors[i % accentColors.length] }}>{p.c || p.b || 'General'}</span></div>
                      </div>
                      <div style={{ padding: '20px' }}>
                        <div style={{ fontSize: '13px', color: T.text, fontWeight: 400, marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.n}</div>
                        <div className="nm-serif" style={{ fontSize: '20px', color: T.accent, fontWeight: 400 }}>{fmt(p.p)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {section === 'categories' && (
          <div className="nm-animate">
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{ width: '24px', height: '1px', background: T.accent }} />
                <span style={{ fontSize: '11px', letterSpacing: '3px', color: T.accent, textTransform: 'uppercase' }}>Browse</span>
              </div>
              <h2 className="nm-serif" style={{ fontSize: '48px', fontWeight: 300, color: T.text }}>Categories</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1px', background: T.border }}>
              {categories.map((c, i) => (
                <button key={c} onClick={() => { setCategory(c); setSection('products'); }} style={{ background: T.bgCard, border: 'none', cursor: 'pointer', padding: '40px 32px', textAlign: 'left' }} onMouseEnter={e => (e.currentTarget.style.background = T.bgDeep)} onMouseLeave={e => (e.currentTarget.style.background = T.bgCard)}>
                  <div style={{ width: '40px', height: '40px', border: `1px solid ${accentColors[i % accentColors.length]}`, display: 'grid', placeItems: 'center', marginBottom: '24px' }}>
                    <span style={{ color: accentColors[i % accentColors.length], fontSize: '18px', fontFamily: '"Cormorant Garamond", serif', fontWeight: 600 }}>{c.charAt(0)}</span>
                  </div>
                  <div style={{ fontSize: '15px', color: T.text, marginBottom: '8px', fontWeight: 400 }}>{c}</div>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase' }}>{products.filter(p => (p.c || p.b) === c).length} products →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'products' && (
          <div className="nm-animate">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
                  <div style={{ width: '24px', height: '1px', background: T.accent }} />
                  <span style={{ fontSize: '11px', letterSpacing: '3px', color: T.accent, textTransform: 'uppercase' }}>Collection</span>
                </div>
                <h2 className="nm-serif" style={{ fontSize: '42px', fontWeight: 300, color: T.text, lineHeight: 1 }}>{category || 'All Products'}</h2>
                <p style={{ fontSize: '13px', color: T.textMid, marginTop: '6px', letterSpacing: '0.5px' }}>{filtered.length} items</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setCategory('')} style={{ background: !category ? T.accent : 'none', color: !category ? T.accentText : T.textMid, border: `1px solid ${!category ? T.accent : T.border}`, padding: '6px 16px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>All</button>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{ background: category === c ? T.accent : 'none', color: category === c ? T.accentText : T.textMid, border: `1px solid ${category === c ? T.accent : T.border}`, padding: '6px 16px', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1px', background: T.border }}>
              {filtered.map((p, i) => (
                <div key={p.id} style={{ background: T.bgCard, overflow: 'hidden' }}>
                  <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: T.bgDeep, cursor: 'pointer' }} onClick={() => showDetails(p)}>
                    {p.image_url ? <img src={p.image_url} alt={p.n} onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} style={{ width: '85%', height: '85%', objectFit: 'contain' }} /> : <span className="nm-serif" style={{ fontSize: '72px', fontWeight: 300, color: accentColors[i % accentColors.length], opacity: 0.25 }}>{p.n.charAt(0)}</span>}
                    <div style={{ position: 'absolute', top: '16px', left: '16px' }}><span className="nm-tag" style={{ color: accentColors[i % accentColors.length] }}>{p.c || p.b || 'General'}</span></div>
                  </div>
                  <div style={{ padding: '20px' }}>
                    <div style={{ marginBottom: '16px', cursor: 'pointer' }} onClick={() => showDetails(p)}>
                      <div style={{ fontSize: '14px', color: T.text, marginBottom: '6px', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.n}</div>
                      <div className="nm-serif" style={{ fontSize: '22px', color: T.accent, fontWeight: 400 }}>{fmt(p.p)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleAdd(p)} style={{ flex: 1, background: T.accent, color: T.accentText, border: 'none', padding: '10px 12px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500 }}>Add to Cart</button>
                      <button onClick={() => showDetails(p)} style={{ background: 'none', color: T.text, border: `1px solid ${T.borderMid}`, padding: '10px 16px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>View</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '80px 0', color: T.textMute }}>
                <div className="nm-serif" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>∅</div>
                <p style={{ fontSize: '13px', letterSpacing: '2px', textTransform: 'uppercase' }}>No products found</p>
              </div>
            )}
          </div>
        )}

        {section === 'details' && selectedProduct && (
          <ProductDetail product={selectedProduct as any} T={T} onBack={() => setSection('products')} onAdd={handleAdd} cartCount={cartCount} onViewCart={() => setCartOpen(true)} />
        )}

        {section === 'deals' && (
          <div className="nm-animate">
            <div style={{ border: `1px solid ${T.border}`, padding: '80px 48px', textAlign: 'center', background: T.bgCard }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
                <span style={{ fontSize: '11px', letterSpacing: '3px', color: T.accent, textTransform: 'uppercase' }}>Limited Time</span>
                <div style={{ flex: 1, height: '1px', background: T.border }} />
              </div>
              <h2 className="nm-serif" style={{ fontSize: '56px', fontWeight: 300, color: T.text, marginBottom: '16px' }}>Weekend Sale</h2>
              <p style={{ fontSize: '15px', color: T.textMid, maxWidth: '480px', margin: '0 auto 40px', fontWeight: 300, lineHeight: 1.7 }}>Exclusive offers on select items. Available for a limited time only.</p>
              <button onClick={() => setSection('products')} style={{ background: T.accent, color: T.accentText, border: 'none', padding: '13px 28px', fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Explore Products</button>
            </div>
          </div>
        )}

        {section === 'contact' && (
          <div className="nm-animate" style={{ maxWidth: '560px' }}>
            <div style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <div style={{ width: '24px', height: '1px', background: T.accent }} />
                <span style={{ fontSize: '11px', letterSpacing: '3px', color: T.accent, textTransform: 'uppercase' }}>Get in Touch</span>
              </div>
              <h2 className="nm-serif" style={{ fontSize: '42px', fontWeight: 300, color: T.text }}>Contact</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ background: T.bgCard, padding: '28px', borderLeft: `2px solid ${T.accent}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase', marginBottom: '8px' }}>Support</div>
                <div style={{ fontSize: '15px', color: T.text }}>Contact your store administrator for assistance with orders, returns, or product queries.</div>
              </div>
              <div style={{ background: T.bgCard, padding: '28px', borderLeft: `2px solid ${T.border}` }}>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase', marginBottom: '8px' }}>Hours</div>
                <div style={{ fontSize: '15px', color: T.text }}>Monday – Friday, 9am – 6pm</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
          <div onClick={() => setCartOpen(false)} style={{ position: 'absolute', inset: 0, background: T.overlay }} />
          <div className="nm-drawer" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '100%', maxWidth: '420px', background: T.bgCard, borderLeft: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="nm-serif" style={{ fontSize: '24px', fontWeight: 300, color: T.text }}>Your Cart</div>
                <div style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase', marginTop: '4px' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {cartItems.length > 0 && <button onClick={clearCart} style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textMid, padding: '6px 14px', fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Clear all</button>}
                <button onClick={() => setCartOpen(false)} aria-label="Close cart" style={{ background: 'none', border: `1px solid ${T.border}`, width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.textMid }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              {cartItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: T.textMute }}>
                  <div className="nm-serif" style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.5 }}>∅</div>
                  <p style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' }}>Your cart is empty</p>
                </div>
              ) : cartItems.map(item => (
                <div key={`${item.id}_${item.vid}`} style={{ display: 'flex', gap: '14px', padding: '14px 0', borderBottom: `1px solid ${T.border}`, alignItems: 'center' }}>
                  <div style={{ width: '60px', height: '60px', background: T.bgDeep, display: 'grid', placeItems: 'center', flexShrink: 0 }}><span className="nm-serif" style={{ fontSize: '24px', color: T.accent, opacity: 0.5, fontWeight: 300 }}>{item.n.charAt(0)}</span></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: T.text, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>{item.n}</div>
                    <div className="nm-serif" style={{ fontSize: '16px', color: T.accent }}>{fmt(item.p * item.qty)}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${T.border}` }}>
                      <button onClick={() => decreaseQty(item)} aria-label="Decrease" style={{ width: '32px', height: '32px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, display: 'grid', placeItems: 'center', fontSize: '16px', fontFamily: 'monospace' }}>−</button>
                      <span style={{ width: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 500, color: T.text, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, lineHeight: '32px', display: 'block' }}>{item.qty}</span>
                      <button onClick={() => increaseQty(item)} aria-label="Increase" style={{ width: '32px', height: '32px', background: 'none', border: 'none', cursor: 'pointer', color: T.textMid, display: 'grid', placeItems: 'center', fontSize: '16px', fontFamily: 'monospace' }}>+</button>
                    </div>
                    <button onClick={() => removeItem(item)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: T.textMute }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
            {cartItems.length > 0 && (
              <div style={{ padding: '20px 24px', borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                  <span style={{ fontSize: '11px', letterSpacing: '2px', color: T.textMid, textTransform: 'uppercase' }}>Total</span>
                  <span className="nm-serif" style={{ fontSize: '28px', color: T.text, fontWeight: 300 }}>{fmt(cartTotal)}</span>
                </div>
                <button onClick={() => { showToast('Checkout coming soon!'); setCartOpen(false); }} style={{ background: T.accent, color: T.accentText, border: 'none', width: '100%', padding: '16px', fontSize: '11px', fontWeight: 500, letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer' }}>Proceed to Checkout</button>
              </div>
            )}
          </div>
        </div>
      )}

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60, background: T.header, backdropFilter: 'blur(16px)', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'stretch', paddingBottom: 'env(safe-area-inset-bottom)' }} className="nm-bottom-nav">
        {[
          { id: 'home', label: 'Home', icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/> },
          { id: 'products', label: 'Shop', icon: <><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/></> },
          { id: 'categories', label: 'Browse', icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
          { id: 'cart', label: 'Cart', icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>, badge: cartCount },
          { id: 'contact', label: 'More', icon: <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></> },
        ].map(item => {
          const isCart = item.id === 'cart';
          const isActive = isCart ? cartOpen : section === item.id;
          return (
            <button key={item.id} onClick={() => isCart ? setCartOpen(true) : setSection(item.id as any)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: isActive ? T.accent : T.textMid, transition: 'color 0.2s', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: isActive ? '24px' : '0px', height: '2px', background: T.accent, transition: 'width 0.25s ease' }} />
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{item.icon}</svg>
              <span style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 400, lineHeight: 1 }}>{item.label}</span>
              {isCart && (item.badge ?? 0) > 0 && <span style={{ position: 'absolute', top: '8px', right: 'calc(50% - 18px)', minWidth: '16px', height: '16px', padding: '0 4px', background: T.accent, color: T.accentText, fontSize: '9px', fontWeight: 500, display: 'grid', placeItems: 'center', borderRadius: '1px', lineHeight: 1 }}>{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      {toast && <div className="nm-toast" style={{ position: 'fixed', bottom: 'calc(68px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)', background: T.bgCard, border: `1px solid ${T.accent}`, color: T.text, padding: '12px 24px', fontSize: '12px', letterSpacing: '1.5px', zIndex: 200, whiteSpace: 'nowrap' }}>{toast}</div>}
    </div>
  );
}