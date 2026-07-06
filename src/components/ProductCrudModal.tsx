'use client';

import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { usePosStore } from '@/store/usePosStore';
import { supabase } from '@/lib/supabase';

/* ---------------------------------------------------------
   Token system
   A fine-jewelry-ledger feel: near-black card stock, a single
   warm brass accent, hairline rule dividers between field
   groups, and a live "price tag" preview that mirrors what a
   printed shelf tag would show as the merchant types.
--------------------------------------------------------- */
const DARK = {
  bgCard: '#121110', bgDeep: '#0a0908', bgSunken: '#1a1815',
  border: '#242119', borderSoft: '#1a1712',
  text: '#ece6d9', textMid: '#948c7c', textFaint: '#5c564a',
  accent: '#c9a24a', accentSoft: '#c9a24a22', accentText: '#0a0908',
  red: '#b5566f', redSoft: '#b5566f18',
};
const LIGHT = {
  bgCard: '#ffffff', bgDeep: '#f3ede1', bgSunken: '#faf7f0',
  border: '#e6ddc9', borderSoft: '#efe8d8',
  text: '#211d15', textMid: '#7a7160', textFaint: '#a89f8c',
  accent: '#96741f', accentSoft: '#96741f14', accentText: '#ffffff',
  red: '#c0392b', redSoft: '#c0392b14',
};

function fmtNaira(v: string | number) {
  const n = Number(v);
  if (!v || Number.isNaN(n)) return '₦0.00';
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Eyebrow({ children, T }: { children: any; T: any }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{ width: 10, height: 1.5, background: T.accent, display: 'inline-block' }} />
      <span style={{
        fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase',
        color: T.textMid, fontWeight: 600,
      }}>{children}</span>
    </div>
  );
}

function Field({ label, req = false, T, children }: { label: string; req?: boolean; T: any; children: any }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: T.textMid, marginBottom: 6, letterSpacing: '0.01em' }}>
        {label}{req && <span style={{ color: T.accent }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = (T: any) => ({
  width: '100%', padding: '11px 12px', background: T.bgSunken,
  border: `1px solid ${T.border}`, borderRadius: 7, color: T.text,
  fontSize: 14.5, outline: 'none', fontFamily: 'inherit',
  transition: 'border-color .15s ease, box-shadow .15s ease',
});

export default function ProductCrudModal() {
  const { activeBranchId, profile } = useAuthStore();
  const companyId = profile?.company_id;
  const {
    crudModalOpen,
    editingProduct,
    closeCrudModal,
    fetchProducts,
  } = usePosStore();

  const [isDark, setIsDark] = useState(true);
  useEffect(() => setIsDark(localStorage.getItem('nm-theme') !== 'light'), []);
  const T = useMemo(() => (isDark ? DARK : LIGHT), [isDark]);

  const [form, setForm] = useState({
    name: '', category: '', price: '', stock: '', barcode: '', image_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [imgBroken, setImgBroken] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingProduct) {
      setForm({
        name: editingProduct.n || '',
        category: editingProduct.c || '',
        price: String(editingProduct.p ?? ''),
        stock: String(editingProduct.s ?? ''),
        barcode: editingProduct.b || '',
        image_url: editingProduct.image_url || '',
      });
    } else {
      setForm({ name: '', category: '', price: '', stock: '', barcode: '', image_url: '' });
    }
    setErr('');
    setImgBroken(false);
  }, [editingProduct, crudModalOpen]);

  useEffect(() => {
    if (crudModalOpen) {
      const t = setTimeout(() => nameInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [crudModalOpen]);

  if (!crudModalOpen) return null;

  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return setErr('Product name is required');
    if (!activeBranchId) return setErr('No active branch — select one to continue');
    if (!companyId) return setErr('No company on your profile — cannot save');

    setSaving(true);
    setErr('');

    // company_id is required by the products RLS policy — omitting it
    // is what was causing the "row-level security policy" error here.
    const payload = {
      company_id: companyId,
      branch_id: activeBranchId,
      name: form.name.trim(),
      category: form.category.trim() || null,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      barcode: form.barcode.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    try {
      let res;
      if (editingProduct?.id) {
        res = await supabase.from('products').update(payload).eq('id', editingProduct.id);
      } else {
        res = await supabase.from('products').insert(payload).select().single();
      }
      if (res.error) throw res.error;

      await fetchProducts(activeBranchId);
      closeCrudModal();
    } catch (e: any) {
      setErr(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const stockLow = Number(form.stock) > 0 && Number(form.stock) <= 5;
  const stockOut = form.stock !== '' && Number(form.stock) === 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'end center' }}>
      <div
        onClick={closeCrudModal}
        style={{ position: 'absolute', inset: 0, background: '#050403cc', backdropFilter: 'blur(5px)' }}
      />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 540, maxHeight: '94vh',
        background: T.bgCard, borderTop: `1px solid ${T.border}`,
        borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -24px 60px -20px #00000080', animation: 'nm-sheet-in .28s cubic-bezier(.2,.8,.2,1)',
      }}>
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
        </div>

        {/* header */}
        <div style={{
          padding: '12px 20px 16px', borderBottom: `1px solid ${T.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h3 style={{
              fontSize: 21, fontWeight: 600, fontFamily: '"Cormorant Garamond", serif',
              color: T.text, margin: 0, letterSpacing: '0.01em',
            }}>
              {editingProduct ? 'Edit Product' : 'New Product'}
            </h3>
            <p style={{ fontSize: 12, color: T.textFaint, margin: '3px 0 0' }}>
              {editingProduct ? 'Update details for this item' : 'Add an item to this branch\u2019s catalogue'}
            </p>
          </div>
          <button
            onClick={closeCrudModal}
            aria-label="Close"
            style={{
              background: 'none', border: `1px solid ${T.border}`, borderRadius: 7,
              width: 30, height: 30, fontSize: 16, color: T.textMid, cursor: 'pointer',
              display: 'grid', placeItems: 'center', lineHeight: 1,
            }}
          >×</button>
        </div>

        <div style={{ padding: '18px 20px 4px', overflowY: 'auto', display: 'grid', gap: 22 }}>

          {/* Live tag preview */}
          <div>
            <Eyebrow T={T}>Tag preview</Eyebrow>
            <div style={{
              display: 'flex', gap: 14, alignItems: 'center',
              padding: '14px 16px', background: T.bgDeep, border: `1px dashed ${T.border}`,
              borderRadius: 10,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: T.bgSunken, border: `1px solid ${T.border}`,
                display: 'grid', placeItems: 'center',
              }}>
                {form.image_url && !imgBroken ? (
                  <img
                    src={form.image_url}
                    alt=""
                    onError={() => setImgBroken(true)}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: 18, color: T.textFaint, fontFamily: '"Cormorant Garamond", serif' }}>
                    {form.name.trim()?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontFamily: '"Cormorant Garamond", serif', fontSize: 17, color: T.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {form.name.trim() || 'Unnamed product'}
                </div>
                <div style={{ fontSize: 11.5, color: T.textFaint, marginTop: 1 }}>
                  {form.category.trim() || 'No category'}
                  {form.barcode.trim() ? ` · ${form.barcode.trim()}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontVariantNumeric: 'tabular-nums', fontSize: 16, fontWeight: 600, color: T.accent,
                }}>
                  {fmtNaira(form.price)}
                </div>
                <div style={{
                  fontSize: 10.5, marginTop: 2,
                  color: stockOut ? T.red : stockLow ? T.accent : T.textFaint,
                }}>
                  {stockOut ? 'Out of stock' : stockLow ? `${form.stock} left — low` : `${form.stock || 0} in stock`}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <Eyebrow T={T}>Details</Eyebrow>
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Product name" req T={T}>
                <input ref={nameInputRef} type="text" value={form.name} onChange={set('name')} style={inputStyle(T)} />
              </Field>
              <Field label="Category" T={T}>
                <input type="text" value={form.category} onChange={set('category')} style={inputStyle(T)} placeholder="e.g. Beverages" />
              </Field>
            </div>
          </div>

          {/* Pricing & stock */}
          <div>
            <Eyebrow T={T}>Pricing & stock</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Price (₦)" T={T}>
                <input type="number" inputMode="decimal" value={form.price} onChange={set('price')} style={inputStyle(T)} placeholder="0.00" />
              </Field>
              <Field label="Stock quantity" T={T}>
                <input type="number" inputMode="numeric" value={form.stock} onChange={set('stock')} style={inputStyle(T)} placeholder="0" />
              </Field>
            </div>
          </div>

          {/* Identifiers */}
          <div>
            <Eyebrow T={T}>Identifiers</Eyebrow>
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Barcode (optional)" T={T}>
                <input type="text" value={form.barcode} onChange={set('barcode')} style={inputStyle(T)} />
              </Field>
              <Field label="Image URL (optional)" T={T}>
                <input type="text" value={form.image_url} onChange={(e) => { setImgBroken(false); set('image_url')(e); }} style={inputStyle(T)} placeholder="https://…" />
              </Field>
            </div>
          </div>

          {err && (
            <div style={{
              padding: '10px 12px', background: T.redSoft, border: `1px solid ${T.red}44`,
              borderRadius: 8, color: T.red, fontSize: 13,
            }}>
              {err}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 20px', borderTop: `1px solid ${T.border}`,
          display: 'flex', gap: 10, justifyContent: 'flex-end',
        }}>
          <button
            onClick={closeCrudModal}
            disabled={saving}
            style={{
              padding: '10px 16px', background: 'none', border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.textMid, cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 20px', background: T.accent, color: T.accentText, border: 'none',
              borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14,
              opacity: saving ? 0.7 : 1, letterSpacing: '0.01em',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving && (
              <span style={{
                width: 13, height: 13, borderRadius: '50%',
                border: `2px solid ${T.accentText}55`, borderTopColor: T.accentText,
                animation: 'nm-spin .7s linear infinite', display: 'inline-block',
              }} />
            )}
            {saving ? 'Saving…' : editingProduct ? 'Update product' : 'Create product'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes nm-sheet-in { from { opacity:0; transform: translateY(16px) } to { opacity:1; transform: translateY(0) } }
        @keyframes nm-spin { to { transform: rotate(360deg) } }
        input:focus { border-color: ${T.accent} !important; box-shadow: 0 0 0 3px ${T.accentSoft}; }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}