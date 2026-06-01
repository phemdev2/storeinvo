'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/lib/supabase';

interface VariantRow {
  id: number | string;
  n: string;
  q: number;
  p: string;
}

interface ProductWithMeta {
  id: string;
  n: string;
  b?: string;
  p?: number;
  s?: number;
  cost?: number;
  is_var?: boolean;
  v?: { id: number | string; n: string; q?: number; p?: number | string }[];
  category?: string | null;
  image_url?: string | null;
}

const CURRENCY = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

// ── Pack Calculator ────────────────────────────────────
function PackCalculator({ onApply }: { onApply: (variants: VariantRow[]) => void }) {
  const [packCost, setPackCost] = useState('');
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [markup, setMarkup] = useState('0');
  const [open, setOpen] = useState(false);

  const packNum = parseFloat(packCost) || 0;
  const unitsNum = parseInt(unitsPerPack) || 0;
  const markupPct = parseFloat(markup) || 0;
  const unitCost = unitsNum > 0? packNum / unitsNum : 0;
  const halfPackUnits = Math.floor(unitsNum / 2);
  const withMarkup = (cost: number) => cost * (1 + markupPct / 100);
  const unitPrice = withMarkup(unitCost);
  const halfPackPrice = withMarkup(unitCost * halfPackUnits);
  const fullPackPrice = withMarkup(packNum);
  const canApply = packNum > 0 && unitsNum >= 2;

  const handleApply = () => {
    const ts = Date.now();
    const newVariants: VariantRow[] = [
      { id: `new-${ts}-1`, n: 'Unit (1 pc)', q: 1, p: unitPrice.toFixed(2) },
    ];
    if (halfPackUnits >= 1) {
      newVariants.push({
        id: `new-${ts}-2`,
        n: `Half Pack (${halfPackUnits} pcs)`,
        q: halfPackUnits,
        p: halfPackPrice.toFixed(2),
      });
    }
    newVariants.push({
      id: `new-${ts}-3`,
      n: `Full Pack (${unitsNum} pcs)`,
      q: unitsNum,
      p: fullPackPrice.toFixed(2),
    });
    onApply(newVariants);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
      <button type="button" onClick={() => setOpen((o) =>!o)} className="w-full flex items-center justify-between px-3.5 py-2.5 text-left">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-400 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-calculator text-white text-xs" />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-800">Pack Price Calculator</p>
            <p className="text- text-amber-600">Auto-generate unit, half-pack & full-pack variants</p>
          </div>
        </div>
        <i className={`fas fa-chevron-${open? 'up' : 'down'} text-amber-500 text-xs`} />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-amber-200 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text- font-bold text-amber-700 uppercase mb-1">Pack Cost (₦)</label>
              <input type="number" min="0" value={packCost} onChange={(e) => setPackCost(e.target.value)} placeholder="e.g. 1000" className="w-full border border-amber-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-400 transition" />
            </div>
            <div>
              <label className="block text- font-bold text-amber-700 uppercase mb-1">Units / Pack</label>
              <input type="number" min="2" value={unitsPerPack} onChange={(e) => setUnitsPerPack(e.target.value)} placeholder="e.g. 12" className="w-full border border-amber-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-400 transition" />
            </div>
            <div>
              <label className="block text- font-bold text-amber-700 uppercase mb-1">Markup %</label>
              <input type="number" min="0" value={markup} onChange={(e) => setMarkup(e.target.value)} placeholder="0" className="w-full border border-amber-200 rounded-lg px-2.5 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-amber-400 transition" />
            </div>
          </div>

          {canApply && (
            <div className="bg-white rounded-xl border border-amber-200 divide-y divide-amber-100 overflow-hidden">
              {[
                { label: 'Unit (1 pc)', price: unitPrice, qty: 1 },
               ...(halfPackUnits >= 1? [{ label: `Half Pack (${halfPackUnits} pcs)`, price: halfPackPrice, qty: halfPackUnits }] : []),
                { label: `Full Pack (${unitsNum} pcs)`, price: fullPackPrice, qty: unitsNum },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{row.label}</p>
                    <p className="text- text-slate-400">Cost: ₦{CURRENCY.format((packNum / unitsNum) * row.qty)}{markupPct > 0 && <span className="text-emerald-600 ml-1">+{markupPct}%</span>}</p>
                  </div>
                  <span className="text-sm font-bold text-[#0d1f3c]">₦{CURRENCY.format(row.price)}</span>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={handleApply} disabled={!canApply} className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-wand-magic-sparkles text-" />Apply variants to product
          </button>
        </div>
      )}
    </div>
  );
}

// ── Image Uploader ─────────────────────────────────────
function ImageUploader({ currentUrl, onUploaded }: { currentUrl: string | null; onUploaded: (url: string | null) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return; }

    setError(''); setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    const ext = file.name.split('.').pop();
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

    if (upErr) {
      console.error('Upload error:', upErr);
      setPreview(currentUrl); setError(`Upload failed: ${upErr.message}`); setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    setPreview(data.publicUrl); onUploaded(data.publicUrl); setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file) handleFile(file); };
  const handleRemove = async () => {
    if (currentUrl) {
      try {
        const url = new URL(currentUrl);
        const pathMatch = url.pathname.split('/product-images/');
        if (pathMatch.length > 1) await supabase.storage.from('product-images').remove([decodeURIComponent(pathMatch[1])]);
      } catch (e) { console.error('Failed to delete image', e); }
    }
    setPreview(null); onUploaded(null); if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Product Image</label>
      {preview? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-36 flex items-center justify-center">
          <img src={preview} alt="Product" className="h-full w-full object-contain" />
          {uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><i className="fas fa-spinner fa-spin text-[#0d1f3c] text-xl" /></div>}
          {!uploading && (
            <div className="absolute top-2 right-2 flex gap-1">
              <button type="button" onClick={() => fileRef.current?.click()} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-[#0d1f3c] shadow-sm"><i className="fas fa-pen text-" /></button>
              <button type="button" onClick={handleRemove} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-500 shadow-sm"><i className="fas fa-trash-can text-" /></button>
            </div>
          )}
        </div>
      ) : (
        <div onClick={() => fileRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="h-36 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-[#0d1f3c]/30 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2">
          {uploading? <><i className="fas fa-spinner fa-spin text-[#0d1f3c] text-xl" /><span className="text-xs text-slate-400">Uploading…</span></> : <><div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center"><i className="fas fa-cloud-arrow-up text-slate-400 text-base" /></div><p className="text-xs font-semibold text-slate-500">Click or drag an image here</p><p className="text- text-slate-400">PNG, JPG, WEBP — max 5 MB</p></>}
        </div>
      )}
      {error && <p className="text-red-500 text- mt-1">{error}</p>}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────
export default function ProductCrudModal() {
  const crudModalOpen = usePosStore((s) => s.crudModalOpen);
  const editingProduct = usePosStore((s) => s.editingProduct) as ProductWithMeta | null;
  const closeCrudModal = usePosStore((s) => s.closeCrudModal);
  const fetchProducts = usePosStore((s) => s.fetchProducts);
  const companyId = useAuthStore((s) => s.profile?.company_id);
  const branchId = useAuthStore((s) => s.activeBranchId);

  const isEditing =!!editingProduct;
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [isVariable, setIsVariable] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'variants'>('details');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = useCallback(() => setIsDirty(true), []);
  const nextId = useRef(1);
  const uid = () => `new-${Date.now()}-${nextId.current++}`;

  useEffect(() => {
    if (!crudModalOpen) return;
    if (editingProduct) {
      setName(editingProduct.n || ''); setBarcode(editingProduct.b || ''); setPrice(editingProduct.p!= null? String(editingProduct.p) : '');
      setCost(editingProduct.cost!= null? String(editingProduct.cost) : ''); setStock(editingProduct.s!= null? String(editingProduct.s) : '');
      setCategory(editingProduct.category || ''); setIsVariable(editingProduct.is_var || false); setImageUrl(editingProduct.image_url || null);
      setVariants(editingProduct.v?.length? editingProduct.v.map((v) => ({ id: v.id, n: v.n || '', q: v.q || 1, p: v.p!= null? String(v.p) : '' })) : [{ id: uid(), n: '', q: 1, p: '' }]);
    } else {
      setName(''); setBarcode(''); setPrice(''); setCost(''); setStock(''); setCategory(''); setIsVariable(false); setImageUrl(null); setVariants([{ id: uid(), n: '', q: 1, p: '' }]);
    }
    setActiveTab('details'); setValidationError(null); setIsDirty(false);
  }, [editingProduct, crudModalOpen]);

  useEffect(() => {
    if (!crudModalOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleEsc);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = originalOverflow; };
  }, [crudModalOpen]);

  const handleClose = useCallback(() => { if (isDirty &&!confirm('Discard unsaved changes?')) return; closeCrudModal(); }, [isDirty, closeCrudModal]);
  const handleVariantChange = (id: number | string, field: string, value: string | number) => { setVariants((v) => v.map((r) => (r.id === id? {...r, [field]: value } : r))); markDirty(); };
  const addVariantRow = () => { setVariants((v) => [...v, { id: uid(), n: '', q: 1, p: '' }]); markDirty(); };
  const removeVariantRow = (id: number | string) => { setVariants((v) => v.filter((r) => r.id!== id)); markDirty(); };
  const applyCalculatedVariants = (rows: VariantRow[]) => { setVariants(rows); setIsVariable(true); setActiveTab('variants'); markDirty(); };

  const handleDeleteProduct = async () => {
    if (!editingProduct ||!confirm(`Delete "${editingProduct.n}" permanently?`)) return;
    setDeleting(true);
    if (!branchId) { alert('No branch selected.'); setDeleting(false); return; }
    await supabase.from('variants').delete().eq('product_id', editingProduct.id);
    if (editingProduct.image_url) {
      try { const url = new URL(editingProduct.image_url); const pathMatch = url.pathname.split('/product-images/'); if (pathMatch.length > 1) await supabase.storage.from('product-images').remove([decodeURIComponent(pathMatch[1])]); } catch (e) { console.error(e); }
    }
    const { error } = await supabase.from('products').delete().eq('id', editingProduct.id);
    if (!error) { await fetchProducts(branchId); closeCrudModal(); } else alert('Failed to delete: ' + error.message);
    setDeleting(false);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Product name is required.';
    if (isVariable) {
      const validVariants = variants.filter((v) => v.n.trim() && v.p);
      if (validVariants.length === 0) return 'Variable-price products need at least one variant with a name and price.';
      const names = validVariants.map((v) => v.n.trim().toLowerCase());
      if (names.length!== new Set(names).size) return 'Variant names must be unique.';
      if (validVariants.some((v) => parseFloat(v.p) <= 0)) return 'All variant prices must be greater than zero.';
    } else {
      const parsedPrice = parseFloat(price);
      if (!price || isNaN(parsedPrice) || parsedPrice <= 0) return 'Base price must be greater than zero.';
    }
    return null;
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const validationMsg = validate();
    if (validationMsg) { setValidationError(validationMsg); if (validationMsg.toLowerCase().includes('variant')) setActiveTab('variants'); return; }
    setValidationError(null); setSaving(true);
    if (!companyId ||!branchId) { alert('Company or branch info missing.'); setSaving(false); return; }

    const productId = editingProduct?.id;
    const previousVariants = editingProduct?.v;
    const parsedPrice = isVariable? 0 : parseFloat(price);
    const parsedCost = cost!== ''? parseFloat(cost) : null;
    const parsedStock = parseInt(stock) || 0;
    const productData = { company_id: companyId, branch_id: branchId, name: name.trim(), barcode: barcode.trim() || null, price: isNaN(parsedPrice)? 0 : parsedPrice, cost: parsedCost!= null &&!isNaN(parsedCost)? parsedCost : 0, stock: isNaN(parsedStock)? 0 : parsedStock, category: category.trim() || null, is_variable_price: isVariable, image_url: imageUrl };

    try {
      let savedProductId = productId;
      if (isEditing && savedProductId) {
        const { error } = await supabase.from('products').update(productData).eq('id', savedProductId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('products').insert(productData).select('id').single();
        if (error) throw error;
        savedProductId = data.id;
      }

      const validVariants = variants.filter((v) => v.n.trim() && v.p);
      if (isEditing && previousVariants) {
        const existingDbIds = previousVariants.map((v) => v.id);
        const currentDbIds = validVariants.filter((v) => typeof v.id === 'number').map((v) => v.id);
        const toDeleteIds = existingDbIds.filter((id) =>!currentDbIds.includes(id));
        if (toDeleteIds.length > 0) await supabase.from('variants').delete().in('id', toDeleteIds);
        const toUpdate = validVariants.filter((v) => typeof v.id === 'number');
        const toInsert = validVariants.filter((v) => typeof v.id === 'string');
        if (toUpdate.length > 0) await supabase.from('variants').upsert(toUpdate.map((v) => ({ id: v.id, product_id: savedProductId, variant_name: v.n.trim(), unit_qty: v.q, price: parseFloat(v.p) || 0 })), { onConflict: 'id' });
        if (toInsert.length > 0) await supabase.from('variants').insert(toInsert.map((v) => ({ product_id: savedProductId, variant_name: v.n.trim(), unit_qty: v.q, price: parseFloat(v.p) || 0 })));
      } else {
        if (validVariants.length > 0) await supabase.from('variants').insert(validVariants.map((v) => ({ product_id: savedProductId, variant_name: v.n.trim(), unit_qty: v.q, price: parseFloat(v.p) || 0 })));
      }

      await fetchProducts(branchId); closeCrudModal();
    } catch (err: any) { alert('Save failed: ' + err.message); } finally { setSaving(false); }
  };

  if (!crudModalOpen) return null;
  const filledVariants = variants.filter((v) => v.n.trim() && v.p);
  const parsedPriceNum = parseFloat(price); const parsedCostNum = parseFloat(cost);
  const profitMargin =!isVariable &&!isNaN(parsedPriceNum) &&!isNaN(parsedCostNum) && parsedPriceNum > 0 && parsedCostNum > 0? ((parsedPriceNum - parsedCostNum) / parsedPriceNum) * 100 : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h- flex flex-col animate-[crudSlideUp_0.2s_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0d1f3c] rounded-lg flex items-center justify-center flex-shrink-0"><i className={`fas ${isEditing? 'fa-pen' : 'fa-plus'} text-white text-xs`} /></div>
            <div><h3 className="font-bold text-[#0d1f3c] text-sm leading-tight">{isEditing? 'Edit Product' : 'Add New Product'}</h3>{isEditing && <p className="text- text-slate-400 truncate max-w-">{editingProduct?.n}</p>}</div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && <button type="button" onClick={handleDeleteProduct} disabled={deleting} className="text-xs text-red-500 hover:bg-red-50 font-semibold px-2.5 py-1.5 rounded-lg border-red-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"><i className="fas fa-trash-can text-" />{deleting? 'Deleting…' : 'Delete'}</button>}
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><i className="fas fa-times text-sm" /></button>
          </div>
        </div>

        {validationError && <div className="mx-5 mt-3 flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold px-3 py-2.5 rounded-xl"><i className="fas fa-circle-exclamation flex-shrink-0" />{validationError}</div>}

        <div className="flex border-b border-slate-100 px-5">
          {(['details', 'variants'] as const).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`py-3 px-1 mr-6 text-xs font-semibold border-b-2 transition-colors capitalize flex items-center gap-1 ${activeTab === tab? 'border-[#0d1f3c] text-[#0d1f3c]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {tab}{tab === 'variants' && filledVariants.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {activeTab === 'details' && (
              <>
                <ImageUploader currentUrl={imageUrl} onUploaded={(url) => { setImageUrl(url); markDirty(); }} />
                <div>
                  <label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Product Name <span className="text-red-400">*</span></label>
                  <input type="text" required value={name} onChange={(e) => { setName(e.target.value); markDirty(); }} placeholder="e.g. Coca-Cola" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Category</label><input type="text" value={category} onChange={(e) => { setCategory(e.target.value); markDirty(); }} placeholder="e.g. Beverages" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" /></div>
                  <div><label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Barcode</label><input type="text" value={barcode} onChange={(e) => { setBarcode(e.target.value); markDirty(); }} placeholder="Optional" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Price (₦) {!isVariable && <span className="text-red-400">*</span>}</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₦</span><input type="number" step="0.01" min="0" value={price} onChange={(e) => { setPrice(e.target.value); markDirty(); }} disabled={isVariable} placeholder="0.00" className={`w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm font-bold text-[#0d1f3c] outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition ${isVariable? 'opacity-40 cursor-not-allowed bg-slate-50' : ''}`} /></div></div>
                  <div><label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cost (₦)</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₦</span><input type="number" step="0.01" min="0" value={cost} onChange={(e) => { setCost(e.target.value); markDirty(); }} placeholder="0.00" className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" /></div></div>
                  <div><label className="block text- font-bold text-slate-500 uppercase tracking-widest mb-1.5">Stock</label><input type="number" min="0" value={stock} onChange={(e) => { setStock(e.target.value); markDirty(); }} placeholder="0" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" /></div>
                </div>
                {profitMargin!== null && <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold ${profitMargin >= 30? 'bg-emerald-50 border-emerald-200 text-emerald-700' : profitMargin >= 10? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-red-50 border-red-200 text-red-600'}`}><i className={`fas ${profitMargin >= 30? 'fa-circle-check' : profitMargin >= 10? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}`} /><span>Margin: {profitMargin.toFixed(1)}% · Profit: ₦{CURRENCY.format(parsedPriceNum - parsedCostNum)} per unit</span></div>}
                <div className="flex items-center gap-3 cursor-pointer select-none bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                  <div><p className="text-xs font-bold text-amber-800">Variable Price</p><p className="text- text-amber-600">Multiple price options</p></div>
                  <button type="button" onClick={() => { setIsVariable((v) =>!v); markDirty(); }} className={`ml-auto relative inline-flex items-center rounded-full transition-colors flex-shrink-0 w-10 h-5 ${isVariable? 'bg-amber-500' : 'bg-slate-200'}`}><span className={`inline-block bg-white rounded-full shadow transition-transform w-4 h-4 ${isVariable? 'translate-x-5' : 'translate-x-0.5'}`} /></button>
                </div>
              </>
            )}
            {activeTab === 'variants' && (
              <>
                <PackCalculator onApply={applyCalculatedVariants} />
                <div>
                  <div className="flex items-center justify-between mb-2"><label className="text- font-bold text-slate-500 uppercase tracking-widest">Options / Variants</label><button type="button" onClick={addVariantRow} className="text-xs font-semibold text-[#0d1f3c] hover:underline flex items-center gap-1"><i className="fas fa-plus text-" /> Add row</button></div>
                  <div className="space-y-2">
                    {variants.map((v, idx) => (
                      <div key={v.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                        <span className="text- font-bold text-slate-300 w-4 text-center">{idx + 1}</span>
                        <input type="text" placeholder="Name (e.g. Large)" value={v.n} onChange={(e) => handleVariantChange(v.id, 'n', e.target.value)} className="flex-1 border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" />
                        <input type="number" min="1" title="Qty" value={v.q || ''} onChange={(e) => handleVariantChange(v.id, 'q', e.target.value? parseInt(e.target.value) || 1 : 1)} className="w-14 border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 text-center" />
                        <div className="relative w-24"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text- font-bold">₦</span><input type="number" min="0" step="0.01" placeholder="0" value={v.p} onChange={(e) => handleVariantChange(v.id, 'p', e.target.value)} className="w-full border border-slate-200 rounded-lg pl-5 pr-2 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-[#0d1f3c]/20 focus:border-[#0d1f3c] transition" /></div>
                        {variants.length > 1 && <button type="button" onClick={() => removeVariantRow(v.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"><i className="fas fa-xmark text-xs" /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-slate-100 flex gap-3 z-10">
            <button type="button" onClick={handleClose} className="flex-1 border border-slate-200 text-slate-600 font-semibold py-3 rounded-xl text-sm hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-[#0d1f3c] hover:bg-[#1a3660] text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50">{saving? <><i className="fas fa-spinner fa-spin text-xs" /> Saving…</> : <><i className={`fas ${isEditing? 'fa-check' : 'fa-plus'} text-xs`} />{isEditing? 'Save Changes' : 'Create Product'}</>}</button>
          </div>
        </form>
      </div>
      <style jsx>{`@keyframes crudSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}