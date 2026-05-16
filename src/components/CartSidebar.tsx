'use client';
import { useState } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useAuthStore } from '@/store/useAuthStore';
import { CURRENCY } from '@/lib/types';
import RefundModal from './RefundModal';
import CreditModal from './CreditModal';

export default function CartSidebar() {
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [editablePrices, setEditablePrices] = useState<Record<string, string>>({});

  const sessions = usePosStore((s) => s.sessions);
  const activeTab = usePosStore((s) => s.activeTab);
  const switchTab = usePosStore((s) => s.switchTab);
  const createTab = usePosStore((s) => s.createTab);
  const closeTab = usePosStore((s) => s.closeTab);
  const modItem = usePosStore((s) => s.modItem);
  const clearCart = usePosStore((s) => s.clearCart);
  const processPayment = usePosStore((s) => s.processPayment);
  const updateItemPrice = usePosStore((s) => s.updateItemPrice);

  const profile = useAuthStore((s) => s.profile);
  const isAdmin = (profile?.role || '').toLowerCase() === 'admin';

  const handleReturnClick = () => {
    if (!isAdmin) return alert('Access Denied: Only administrators can perform returns.');
    setShowRefundModal(true);
  };

  const handleCreditClick = () => {
    if (!isAdmin) return alert('Access Denied: Only administrators can process credit sales.');
    setShowCreditModal(true);
  };

  const currentSession = sessions[activeTab];
  const items = Object.entries(currentSession?.items || {});
  const count = items.length;

  const rawSubtotal = items.reduce((sum, [key, item]) => {
    let finalPrice = item.p;
    if (item.p <= 0 && editablePrices[key]) {
      const parsed = parseFloat(editablePrices[key]);
      if (!isNaN(parsed) && parsed > 0) finalPrice = parsed;
    }
    return sum + finalPrice * item.qty;
  }, 0);

  let discountAmt = 0;
  if (currentSession?.discountType === 'percent') {
    discountAmt = rawSubtotal * ((currentSession?.discount || 0) / 100);
  } else {
    discountAmt = currentSession?.discount || 0;
  }
  const totalVal = Math.round((rawSubtotal - discountAmt + Number.EPSILON) * 100) / 100;

  const handlePriceBlur = (key: string) => {
    const parsed = parseFloat(editablePrices[key] || '0');
    if (!isNaN(parsed) && parsed > 0) {
      updateItemPrice(activeTab, key, parsed);
    } else {
      setEditablePrices((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
  };

  return (
    <>
      {/* ── Tabs ── */}
      <div className="flex bg-gray-50 border-b overflow-x-auto h-11 flex-none items-end px-1">
        {Object.entries(sessions).map(([id, session]) => (
          <div
            key={id}
            onClick={() => switchTab(id)}
            className={`px-4 py-2 flex items-center gap-2 min-w-[80px] cursor-pointer text-xs font-bold border-r select-none rounded-t-lg mx-0.5 -mb-px border-t border-l transition-colors ${
              activeTab === id
                ? 'bg-white text-purple-700 border-b-white border-t-purple-500 z-10'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span>Order {session.number}</span>
            {Object.keys(sessions).length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                className="text-gray-400 hover:text-red-500 leading-none"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={createTab}
          className="px-3 py-2 text-purple-500 hover:text-purple-700 font-bold flex items-center gap-1 text-xs hover:bg-purple-50 rounded-t-lg transition-colors whitespace-nowrap"
        >
          <i className="fas fa-plus text-[10px]"></i> New
        </button>
      </div>

      {/* ── Action Buttons ── */}
      <div className="p-2 bg-white border-b flex-none grid grid-cols-2 gap-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-custom-item'))}
          className="flex items-center justify-center gap-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-2.5 rounded-lg text-xs font-bold border border-indigo-200 transition-colors"
        >
          <i className="fas fa-pen text-[10px]"></i> Misc
        </button>
        <button
          onClick={handleReturnClick}
          className="flex items-center justify-center gap-1.5 bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-2.5 rounded-lg text-xs font-bold border border-gray-200 transition-colors"
        >
          <i className="fas fa-undo text-[10px]"></i> Return
        </button>
        <button
          onClick={clearCart}
          disabled={count === 0}
          className="col-span-2 flex items-center justify-center gap-1.5 bg-white text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2.5 rounded-lg text-xs font-bold border border-red-200 transition-colors"
        >
          <i className="fas fa-trash-alt text-[10px]"></i> Clear Cart
        </button>
      </div>

      {/* ── Cart Items ── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50">
        {count === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 select-none py-16">
            <i className="fas fa-cash-register text-gray-300 text-5xl mb-4"></i>
            <p className="text-sm font-medium mb-5">Cart is empty</p>
            <button
              onClick={createTab}
              className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-purple-700 shadow-lg active:scale-95 transition-all"
            >
              <i className="fas fa-plus"></i> Start New Order
            </button>
          </div>
        )}

        {items.map(([key, item]) => (
          <div
            key={key}
            className={`bg-white p-3 rounded-xl shadow-sm border flex items-center gap-3 ${
              item.qty < 0 ? 'border-l-4 border-l-red-400 border-gray-100' : 'border-gray-100'
            }`}
          >
            {/* Left Side: Name & details */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800 leading-tight truncate">{item.n}</p>
              <div className="flex items-center flex-wrap gap-1 mt-0.5">
                {item.v_name && (
                  <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] border border-indigo-100 font-semibold">
                    {item.v_name}
                  </span>
                )}
                <span className="text-[11px] text-gray-400">
                  {Math.abs(item.qty)} × {item.p <= 0 ? 'Custom' : `₦${CURRENCY.format(item.p)}`}
                </span>
              </div>
            </div>

            {/* ✅ Right Side: HORIZONTAL Layout (Fixes hidden buttons) */}
            <div className="flex items-center gap-3 shrink-0">
              
              {/* Quantity Controls */}
              <div className="flex items-center rounded-lg overflow-hidden border border-gray-200">
                <button
                  onClick={() => modItem(key, -1)}
                  className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 font-bold text-sm transition-colors border-r border-gray-200"
                >
                  −
                </button>
                <span className="w-8 h-8 flex items-center justify-center text-sm font-bold text-gray-800 bg-white select-none">
                  {Math.abs(item.qty)}
                </span>
                <button
                  onClick={() => modItem(key, 1)}
                  className="w-8 h-8 flex items-center justify-center bg-green-50 hover:bg-green-100 text-green-600 font-bold text-sm transition-colors border-l border-gray-200"
                >
                  +
                </button>
              </div>

              {/* Price / Custom Input */}
              {item.p <= 0 ? (
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">₦</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={editablePrices[key] || ''}
                    onChange={(e) => setEditablePrices((prev) => ({ ...prev, [key]: e.target.value }))}
                    onBlur={() => handlePriceBlur(key)}
                    className="w-20 px-2 py-1 border border-dashed border-purple-300 rounded text-sm text-right font-bold focus:border-solid focus:border-purple-500 outline-none bg-purple-50"
                  />
                </div>
              ) : (
                <span className="font-bold text-gray-900 text-sm whitespace-nowrap min-w-[70px] text-right">
                  ₦{CURRENCY.format(item.p * item.qty)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer: Totals & Payment ── */}
      <div className="p-4 bg-white border-t flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-6 md:pb-4">
        <div className="space-y-1 mb-3 text-xs">
          <div className="flex justify-between text-gray-500">
            <span>Subtotal</span>
            <span>₦{CURRENCY.format(rawSubtotal)}</span>
          </div>
          <div
            onClick={() => window.dispatchEvent(new CustomEvent('open-discount'))}
            className="flex justify-between text-emerald-600 cursor-pointer hover:bg-emerald-50 rounded px-1 -mx-1 transition-colors"
          >
            <span className="flex items-center gap-1"><i className="fas fa-tag"></i> Discount</span>
            <span>-₦{CURRENCY.format(discountAmt)}</span>
          </div>
        </div>

        <div className="flex justify-between items-end mb-4 pt-2 border-t border-dashed">
          <span className="text-xs text-gray-500 font-bold uppercase">
            {totalVal < 0 ? 'Total Refund' : 'Total Payable'}
          </span>
          <span className={`text-3xl font-black tracking-tight ${totalVal < 0 ? 'text-red-600' : 'text-gray-900'}`}>
            ₦{CURRENCY.format(totalVal)}
          </span>
        </div>

        {/* Payment Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => processPayment('cash')}
            disabled={count === 0}
            className="flex flex-col items-center justify-center gap-0.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs py-3 shadow active:scale-95 transition-all"
          >
            <i className="fas fa-money-bill text-sm"></i>
            <span>Cash</span>
            <span className="text-[9px] opacity-60">F8</span>
          </button>
          <button
            onClick={() => processPayment('pos')}
            disabled={count === 0}
            className="flex flex-col items-center justify-center gap-0.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs py-3 shadow active:scale-95 transition-all"
          >
            <i className="fas fa-credit-card text-sm"></i>
            <span>POS</span>
            <span className="text-[9px] opacity-60">F9</span>
          </button>
          <button
            onClick={() => processPayment('bank')}
            disabled={count === 0}
            className="flex flex-col items-center justify-center gap-0.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs py-3 shadow active:scale-95 transition-all"
          >
            <i className="fas fa-university text-sm"></i>
            <span>Trans</span>
            <span className="text-[9px] opacity-60">F10</span>
          </button>
          <button
            onClick={handleCreditClick}
            disabled={count === 0}
            className="flex flex-col items-center justify-center gap-0.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs py-3 shadow active:scale-95 transition-all"
          >
            <i className="fas fa-user text-sm"></i>
            <span>Credit</span>
            <span className="text-[9px] opacity-60">—</span>
          </button>
        </div>
      </div>

      <RefundModal show={showRefundModal} onClose={() => setShowRefundModal(false)} />
      <CreditModal show={showCreditModal} onClose={() => setShowCreditModal(false)} />
    </>
  );
}