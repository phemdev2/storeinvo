'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { usePosStore } from '@/store/usePosStore';
import { useCompanyStore } from '@/store/useCompanyStore';
import { useAuthStore } from '@/store/useAuthStore';
import { CURRENCY } from '@/lib/types';

export default function ReceiptModal() {
  const receipt = usePosStore((s) => s.currentReceipt);
  const closeReceipt = usePosStore((s) => s.closeReceipt);
  const setMobileView = usePosStore((s) => s.setMobileView);
  const profile = useAuthStore((s) => s.profile);
  const company = useCompanyStore((s) => s.company);
  const fetchCompany = useCompanyStore((s) => s.fetchCompany);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch company data when modal opens
  useEffect(() => {
    if (receipt && profile?.company_id && !company) {
      fetchCompany(profile.company_id);
    }
  }, [receipt, profile?.company_id, company, fetchCompany]);

  // Focus close button + escape handler (single effect)
  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeReceipt();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeReceipt]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  }, []);

  const handlePrint = () => {
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) return;

    const win = window.open('', '_blank', 'height=600,width=400');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups for this site to print receipts.');
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Print Receipt</title>
        <style>
          body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; font-size: 12px; color: #000; padding: 8px; }
          .rcpt-line { border-bottom: 1px dashed #000; margin: 8px 0; }
          .rcpt-row { display: flex; justify-content: space-between; }
          .rcpt-center { text-align: center; }
          .rcpt-bold { font-weight: bold; }
          .rcpt-sm { font-size: 10px; }
          .rcpt-credit { margin-top: 10px; padding: 8px; border: 1px dashed #000; background: #fff8f0; }
        </style>
      </head>
      <body>${printArea.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.onload = () => { win.print(); win.close(); };
  };

  const handleNewSale = useCallback(() => {
    closeReceipt();
    setMobileView('products');
  }, [closeReceipt, setMobileView]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => { if (e.target === e.currentTarget) closeReceipt(); },
    [closeReceipt]
  );

  const storeInfo = useMemo(() => ({
    name: company?.name || 'My Store',
    address: company?.address || '',
    phone: company?.phone || '',
    footer: company?.receipt_footer || '',
  }), [company]);

  if (!receipt) return null;

  const isCredit = receipt.method === 'CREDIT' && receipt.customer_name;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Payment receipt"
        onKeyDown={handleKeyDown}
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col h-[85vh] animate-fade-in overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-emerald-50">
          <h3 className="flex items-center gap-2 font-bold text-emerald-700">
            <i className="fas fa-check-circle" aria-hidden="true" /> Payment Complete
          </h3>
          <button
            ref={closeButtonRef}
            onClick={closeReceipt}
            aria-label="Close receipt"
            className="flex items-center justify-center w-8 h-8 text-gray-400 rounded-full hover:bg-emerald-100 hover:text-gray-600"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* Receipt Paper */}
        <div className="flex justify-center flex-1 p-4 overflow-y-auto bg-gray-200">
          <div id="receipt-print-area" className="w-full p-4 text-[12px] leading-relaxed text-gray-800 font-mono bg-white shadow-md">
            <div className="mb-2 text-center">
              <div className="text-base font-bold uppercase tracking-wide">{storeInfo.name}</div>
              {storeInfo.address && <div className="mt-1 text-[10px] text-gray-500">{storeInfo.address}</div>}
              {storeInfo.phone && <div className="text-[10px] text-gray-500">Tel: {storeInfo.phone}</div>}
            </div>

            <DashedLine />

            <div className="flex justify-between mb-1 text-[10px] text-gray-500">
              <span>{receipt.date}</span>
              <span>Order: {receipt.id}</span>
            </div>
            <div className="mb-2 text-[10px] text-gray-500">
              Method: {receipt.method.toUpperCase()}
            </div>

            <DashedLine />

            <div className="my-2 space-y-2">
              {receipt.items.map((item, i) => (
                <ReceiptItem key={i} item={item} />
              ))}
            </div>

            <DashedLine />

            <div className="flex justify-between mt-2 text-lg font-bold">
              <span>TOTAL</span>
              <span>₦{CURRENCY.format(receipt.total)}</span>
            </div>

            {isCredit && (
              <div className="mt-4 p-2 text-[10px] border border-dashed border-gray-800 bg-amber-50">
                <p className="mb-1 font-bold text-gray-900">CREDIT SALE DETAILS</p>
                <p>Customer: {receipt.customer_name}</p>
                {receipt.customer_phone && <p>Phone: {receipt.customer_phone}</p>}
              </div>
            )}

            <div className="mt-4 text-center text-[10px] text-gray-500">
              <p>Cashier: {receipt.user_name}</p>
              {storeInfo.footer && <p className="mt-1 italic">{storeInfo.footer}</p>}
              <p className="mt-2 font-bold text-gray-700">Thank you for your patronage!</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 p-4 pb-6 border-t bg-white md:pb-4">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-3 font-bold text-white bg-slate-800 rounded-lg shadow-lg active:scale-95 transition-transform"
          >
            <i className="fas fa-print" aria-hidden="true" /> Print
          </button>
          <button
            onClick={handleNewSale}
            className="py-3 font-bold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg active:scale-95 transition-transform"
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function DashedLine() {
  return <div className="my-2 border-b border-dashed border-gray-400" />;
}

function ReceiptItem({ item }: { item: { n: string; p: number; qty: number; v_name?: string } }) {
  return (
    <div>
      <div className="flex justify-between font-bold">
        <span className="flex-1 pr-2">{item.n}</span>
        <span>₦{CURRENCY.format(item.p * item.qty)}</span>
      </div>
      {item.v_name && <div className="pl-2 text-[10px] text-gray-500">({item.v_name})</div>}
      <div className="text-[10px] text-gray-500">
        {item.qty} x ₦{CURRENCY.format(item.p)}
      </div>
    </div>
  );
}