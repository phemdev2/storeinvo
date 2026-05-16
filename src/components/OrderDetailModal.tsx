'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  variant_id: number | null;
}

interface Order {
  id: string;
  total: number;
  method: string;
  user_name: string;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  branch_id: string;
  order_items: OrderItem[];
}

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
}

const PAYMENT_BADGE: Record<string, string> = {
  cash:   'bg-emerald-100 text-emerald-700',
  pos:    'bg-blue-100 text-blue-700',
  bank:   'bg-purple-100 text-purple-700',
  credit: 'bg-orange-100 text-orange-700',
};

const formatter = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

export default function OrderDetailModal({ orderId, onClose }: OrderDetailModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch order whenever orderId changes
  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      setOrder(null);

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single();

      if (error || !data) {
        setError('Order not found.');
      } else {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!orderId) return null;

  const handlePrint = () => {
    if (!order) return;
    const contents = document.getElementById('modal-print-area')?.innerHTML;
    if (!contents) return;
    const win = window.open('', '', 'height=600,width=400');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.id}</title>
          <style>
            body { font-family: 'Courier New', monospace; width: 80mm; margin: 0 auto; font-size: 12px; color: #000; }
            .line { border-bottom: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
          </style>
        </head>
        <body>${contents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const methodKey = order?.method?.toLowerCase() ?? '';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-none">
          <div className="flex items-center gap-2">
            <i className="fas fa-receipt text-gray-500"></i>
            <h2 className="font-black text-gray-800 text-base">
              {order ? `Order · ${order.id}` : 'Order Details'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {order && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
              >
                <i className="fas fa-print"></i> Print
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <p className="text-sm">Loading order...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-red-400">
              <i className="fas fa-exclamation-circle text-2xl mb-2"></i>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Order Content */}
          {!loading && order && (
            <>
              {/* Status Bar */}
              <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-2.5 flex items-center gap-2">
                <i className="fas fa-check-circle text-emerald-500 text-sm"></i>
                <span className="font-bold text-emerald-700 text-sm">Order Complete</span>
              </div>

              {/* Meta Info */}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Order ID</p>
                  <p className="font-mono font-bold text-gray-700 text-xs break-all">{order.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Date</p>
                  <p className="text-xs font-medium text-gray-700">
                    {new Date(order.created_at).toLocaleString('en-NG')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Payment</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[methodKey] || 'bg-gray-100 text-gray-600'}`}>
                    {order.method}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Cashier</p>
                  <p className="text-xs font-medium text-gray-700">{order.user_name || '—'}</p>
                </div>
                {order.customer_name && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                    <p className="text-xs font-medium text-gray-700">{order.customer_name}</p>
                  </div>
                )}
                {order.customer_phone && (
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <p className="text-xs font-medium text-gray-700">{order.customer_phone}</p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div className="p-5">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items</h3>
                <div className="space-y-1">
                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-dashed border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{item.product_name}</p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} × ₦{formatter.format(item.price)}
                        </p>
                      </div>
                      <p className="font-bold text-gray-800 text-sm">
                        ₦{formatter.format(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between flex-none">
                <span className="font-bold text-gray-600">Total</span>
                <span className="text-2xl font-black text-gray-900">
                  ₦{formatter.format(order.total)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Hidden Print Area */}
        {order && (
          <div id="modal-print-area" className="hidden">
            <div className="text-center mb-2">
              <div className="font-bold text-base uppercase">My Store</div>
              <div style={{ fontSize: 10 }}>123 Main Street, Lagos</div>
              <div style={{ fontSize: 10 }}>Tel: 08012345678</div>
            </div>
            <div className="line"></div>
            <div style={{ fontSize: 10, marginBottom: 4 }}>
              {new Date(order.created_at).toLocaleString('en-NG')} · {order.id}
            </div>
            <div style={{ fontSize: 10, marginBottom: 8 }}>
              Method: {order.method} · Cashier: {order.user_name}
            </div>
            <div className="line"></div>
            {order.order_items.map((item) => (
              <div key={item.id} style={{ marginBottom: 6 }}>
                <div className="row font-bold">
                  <span>{item.product_name}</span>
                  <span>₦{formatter.format(item.price * item.quantity)}</span>
                </div>
                <div style={{ fontSize: 10, color: '#666' }}>
                  {item.quantity} x ₦{formatter.format(item.price)}
                </div>
              </div>
            ))}
            <div className="line"></div>
            <div className="row font-bold" style={{ fontSize: 16, marginTop: 8 }}>
              <span>TOTAL</span><span>₦{formatter.format(order.total)}</span>
            </div>
            {order.customer_name && (
              <div style={{ marginTop: 10, padding: 8, border: '1px dashed #000' }}>
                <div className="font-bold">CREDIT SALE</div>
                <div>Customer: {order.customer_name}</div>
                <div>Phone: {order.customer_phone}</div>
              </div>
            )}
            <div className="text-center" style={{ marginTop: 16, fontSize: 10 }}>
              Thank you for your patronage!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}