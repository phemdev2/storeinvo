'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';

interface Order {
  id: string;
  total: number;
  method: string;
  user_name: string;
  customer_name: string | null;
  created_at: string;
  order_items: { count: number }[];
}

interface RecentOrdersProps {
  onViewOrder?: (id: string) => void;
  limit?: number;
}

const formatter = new Intl.NumberFormat('en-NG', { minimumFractionDigits: 2 });

export default function RecentOrders({ onViewOrder, limit = 5 }: RecentOrdersProps) {
  const { activeBranchId } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => { setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches); }, []);

  const T = isDark? {
    bgCard: '#141414', border: '#1e1e1e', text: '#e8e4dc', textMid: '#888880', textMute: '#555550',
    accent: '#c9a84c', green: '#7c9a8c', blue: '#6b8caf', purple: '#8c7ca8', amber: '#a87c4f', bgHover: '#1a1a',
  } : {
    bgCard: '#ffffff', border: '#e4ddd3', text: '#1a1612', textMid: '#6b6356', textMute: '#b0a99e',
    accent: '#a07830', green: '#059669', blue: '#2563eb', purple: '#7c3aed', amber: '#d97706', bgHover: '#f9f7f4',
  };

  const PAYMENT_COLORS: Record<string, string> = {
    cash: T.green,
    pos: T.blue,
    bank: T.purple,
    transfer: T.purple,
    credit: T.amber,
  };

  useEffect(() => {
    if (!activeBranchId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
       .from('orders')
       .select('id, total, method, user_name, customer_name, created_at, order_items(count)')
       .eq('branch_id', activeBranchId)
       .order('created_at', { ascending: false })
       .limit(limit);

      setOrders((data as any) || []);
      setLoading(false);
    })();
  }, [activeBranchId, limit]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond", serif' }}>Recent Orders</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: T.bgHover, animation: 'pulse 1.5s infinite' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, width: '60%', background: T.bgHover, borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                <div style={{ height: 12, width: '40%', background: T.bgHover, borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, fontFamily: '"Cormorant Garamond", serif' }}>Recent Orders</h3>
        <span style={{ fontSize: 11, color: T.textMid, background: T.bgHover, padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>{orders.length}</span>
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {orders.length === 0? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 12px', borderRadius: 8, background: T.bgHover, display: 'grid', placeItems: 'center', color: T.textMute }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 0 01.293.707V19a2 0 01-2 2z"/></svg>
            </div>
            <p style={{ fontSize: 13, color: T.textMid, marginBottom: 4 }}>No orders yet</p>
            <p style={{ fontSize: 12, color: T.textMute }}>Orders will appear here</p>
          </div>
        ) : (
          orders.map((order, idx) => {
            const itemCount = order.order_items?.[0]?.count || 0;
            const methodColor = PAYMENT_COLORS[order.method?.toLowerCase()] || T.textMid;

            return (
              <div
                key={order.id}
                onClick={() => onViewOrder?.(order.id)}
                style={{
                  padding: '14px 20px',
                  borderBottom: idx < orders.length - 1? `1px solid ${T.border}` : 'none',
                  cursor: onViewOrder? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
                onMouseEnter={(e) => { if (onViewOrder) e.currentTarget.style.background = T.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Icon */}
                <div style={{ width: 36, height: 36, borderRadius: 6, background: `${methodColor}15`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <svg width="16" height="16" fill="none" stroke={methodColor} strokeWidth="2" viewBox="0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 0 00-2 2v6a2 0 002 2h2m2 4h10a2 0 002-2v-6a2 0 00-2-2H9a2 0 00-2 2v6a2 0 002 2zm7-5a2 2 0 11-4 0 2 0 014 0z" />
                  </svg>
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: 'monospace' }}>#{order.id.slice(0, 8)}</span>
                    <span style={{ fontSize: 11, color: T.textMute }}>·</span>
                    <span style={{ fontSize: 11, color: T.textMid }}>{formatTime(order.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: T.textMid }}>
                      {order.customer_name || 'Walk-in'} · {itemCount} {itemCount === 1? 'item' : 'items'}
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${methodColor}15`, color: methodColor, fontWeight: 500, textTransform: 'capitalize' }}>
                      {order.method}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.accent, fontFamily: '"Cormorant Garamond", serif' }}>
                    ₦{formatter.format(order.total)}
                  </div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
                    {order.user_name?.split(' ')[0] || '—'}
                  </div>
                </div>

                {/* Chevron */}
                {onViewOrder && (
                  <svg width="14" height="14" fill="none" stroke={T.textMute} strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0, opacity: 0.5 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            );
          })
        )}
      </div>

      {orders.length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${T.border}`, background: T.bgHover, textAlign: 'center' }}>
          <button
            onClick={() => {/* navigate to full orders page */}}
            style={{ background: 'none', border: 'none', color: T.accent, fontSize: 12, fontWeight: 500, cursor: 'pointer', letterSpacing: 0.3 }}
          >
            View all orders →
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}