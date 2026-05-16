'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
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

const PAYMENT_BADGE: Record<string, string> = {
  cash:   'bg-emerald-100 text-emerald-700',
  pos:    'bg-blue-100 text-blue-700',
  bank:   'bg-purple-100 text-purple-700',
  credit: 'bg-orange-100 text-orange-700',
};

const formatter = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, fetchProfile } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('Order not found.');
      } else {
        setOrder(data);
      }
      setLoading(false);
    };
    fetchOrder();
  }, [id]);

  const handlePrint = () => {
    const contents = document.getElementById('print-area')?.innerHTML;
    if (!contents) return;
    const win = window.open('', '', 'height=600,width=400');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt - ${id}</title>
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

  // ── Guards ──────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <i className="fas fa-spinner fa-spin text-2xl mb-2 block"></i>
        <p className="text-sm">Loading order...</p>
      </div>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center text-red-400">
        <i className="fas fa-exclamation-circle text-2xl mb-2 block"></i>
        <p className="text-sm mb-3">{error || 'Order not found.'}</p>
        <button onClick={() => router.back()} className="text-xs bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition">
          Go Back
        </button>
      </div>
    </div>
  );

  const subtotal = order.order_items.reduce((a, i) => a + i.price * i.quantity, 0);
  const methodKey = order.method?.toLowerCase();

  // ── Render ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition font-medium"
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold transition shadow"
          >
            <i className="fas fa-print"></i> Print Receipt
          </button>
        </div>

        {/* Order Card */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {/* Status Bar */}
          <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-3 flex items-center gap-2">
            <i className="fas fa-check-circle text-emerald-500"></i>
            <span className="font-bold text-emerald-700 text-sm">Order Complete</span>
          </div>

          {/* Meta Info */}
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 border-b">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Order ID</p>
              <p className="font-mono font-bold text-gray-700 text-sm">{order.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Date</p>
              <p className="text-sm font-medium text-gray-700">
                {new Date(order.created_at).toLocaleString('en-NG')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Payment Method</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PAYMENT_BADGE[methodKey] || 'bg-gray-100 text-gray-600'}`}>
                {order.method}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cashier</p>
              <p className="text-sm font-medium text-gray-700">{order.user_name || '—'}</p>
            </div>
            {order.customer_name && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Customer</p>
                <p className="text-sm font-medium text-gray-700">{order.customer_name}</p>
              </div>
            )}
            {order.customer_phone && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                <p className="text-sm font-medium text-gray-700">{order.customer_phone}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="p-5">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Items</h3>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-dashed border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{item.product_name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} × ₦{formatter.format(item.price)}</p>
                  </div>
                  <p className="font-bold text-gray-800">₦{formatter.format(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between">
            <span className="font-bold text-gray-600">Total</span>
            <span className="text-2xl font-black text-gray-900">₦{formatter.format(order.total)}</span>
          </div>
        </div>

        {/* Hidden Print Area */}
        <div id="print-area" className="hidden">
          <div className="text-center mb-2">
            <div className="font-bold text-base uppercase">My Store</div>
            <div style={{ fontSize: 10 }}>123 Main Street, Lagos</div>
            <div style={{ fontSize: 10 }}>Tel: 08012345678</div>
          </div>
          <div className="line"></div>
          <div style={{ fontSize: 10, marginBottom: 4 }}>{new Date(order.created_at).toLocaleString('en-NG')} · {order.id}</div>
          <div style={{ fontSize: 10, marginBottom: 8 }}>Method: {order.method} · Cashier: {order.user_name}</div>
          <div className="line"></div>
          {order.order_items.map((item) => (
            <div key={item.id} style={{ marginBottom: 6 }}>
              <div className="row font-bold"><span>{item.product_name}</span><span>₦{formatter.format(item.price * item.quantity)}</span></div>
              <div style={{ fontSize: 10, color: '#666' }}>{item.quantity} x ₦{formatter.format(item.price)}</div>
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
          <div className="text-center" style={{ marginTop: 16, fontSize: 10 }}>Thank you for your patronage!</div>
        </div>

      </div>
    </div>
  );
}