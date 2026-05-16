import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CartItem, CartSession, Order, DatabaseProduct } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './useAuthStore';

interface POSState {
  // UI State
  mobileView: 'products' | 'cart';
  search: string;
  limit: number;
  variantModalProduct: Product | null;
  crudModalOpen: boolean;
  editingProduct: Product | null;
  isLoadingProducts: boolean;
  productsError: string | null;

  // Data State
  products: Product[];

  // Cart State
  sessions: Record<string, CartSession>;
  activeTab: string;

  // Receipt & Queue State
  currentReceipt: Order | null;
  queue: Order[];
  syncing: boolean;

  // UI Actions
  setMobileView: (view: 'products' | 'cart') => void;
  setSearch: (s: string) => void;
  openVariantModal: (product: Product) => void;
  closeVariantModal: () => void;
  openCrudModal: (product?: Product) => void;
  closeCrudModal: () => void;

  // Data Actions
  fetchProducts: (branchId: string) => Promise<void>;

  // Cart Tab Actions
  switchTab: (id: string) => void;
  createTab: () => void;
  closeTab: (id: string) => void;

  // Cart Item Actions
  addToCart: (p: Product, v?: Product['v'][0], overridePrice?: number) => void;
  modItem: (key: string, n: number) => void;
  clearCart: () => void;
  applyDiscount: (val: number, type: 'fixed' | 'percent') => void;
  updateItemPrice: (tabId: string, itemKey: string, newPrice: number) => void;

  // Receipt & Queue Actions
  closeReceipt: () => void;
  processPayment: (method: string, customerName?: string, customerPhone?: string) => void;
  processQueue: () => Promise<void>;
  refundByInvoice: (invoiceId: string) => Promise<string | null>;
}

export const usePosStore = create<POSState>()(
  persist(
    (set, get) => ({
      // ==========================================
      // DEFAULT STATE
      // ==========================================
      mobileView: 'products',
      search: '',
      limit: 24,
      variantModalProduct: null,
      crudModalOpen: false,
      editingProduct: null,
      isLoadingProducts: true,
      productsError: null,

      products: [],

      sessions: { t1: { number: 1, items: {}, discount: 0, discountType: 'fixed' } },
      activeTab: 't1',

      currentReceipt: null,
      queue: [],
      syncing: false,

      // ==========================================
      // UI ACTIONS
      // ==========================================
      setMobileView: (view) => set({ mobileView: view }),
      setSearch: (s) => set({ search: s, limit: 24 }),

      openVariantModal: (product) => set({ variantModalProduct: product }),
      closeVariantModal: () => set({ variantModalProduct: null }),

      openCrudModal: (product) => set({ crudModalOpen: true, editingProduct: product || null }),
      closeCrudModal: () => set({ crudModalOpen: false, editingProduct: null }),

      // ==========================================
      // DATA ACTIONS (SUPABASE)
      // ==========================================
      fetchProducts: async (branchId: string) => {
        if (!branchId) return;
        set({ isLoadingProducts: true, productsError: null });

        let allProducts: any[] = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        try {
          while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;

            const { data, error } = await supabase
              .from('products')
              .select(`
                id,
                name,
                barcode,
                price,
                stock,
                cost,
                is_variable_price,
                variants (
                  id,
                  variant_name,
                  price
                )
              `)
              .eq('branch_id', branchId)
              .order('name', { ascending: true })
              .range(from, to);

            if (error) throw error;

            if (data && data.length > 0) {
              allProducts = [...allProducts, ...data];
              if (data.length < pageSize) {
                hasMore = false;
              } else {
                page++;
              }
            } else {
              hasMore = false;
            }
          }

          const mappedData: Product[] = allProducts.map((item: any) => ({
            id: item.id,
            n: item.name,
            b: item.barcode,
            p: item.price,
            s: item.stock,
            cost: item.cost || 0,
            is_var: item.is_variable_price || (item.variants?.length > 0),
            v: item.variants?.map((variant: any) => ({
              id: variant.id,
              n: variant.variant_name,
              p: variant.price,
            })) || [],
          }));

          set({ products: mappedData, isLoadingProducts: false, productsError: null });

        } catch (error: any) {
          console.error('Supabase fetch error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          set({
            isLoadingProducts: false,
            productsError: error.message || 'Failed to load products',
          });
        }
      },

      // ==========================================
      // CART TAB ACTIONS
      // ==========================================
      switchTab: (id) => set({ activeTab: id }),

      createTab: () => {
        const state = get();
        const id = 't' + Date.now();
        const maxNumber = Object.values(state.sessions).reduce((max, s) => Math.max(max, s.number), 0);
        set({
          sessions: {
            ...state.sessions,
            [id]: { number: maxNumber + 1, items: {}, discount: 0, discountType: 'fixed' },
          },
          activeTab: id,
        });
      },

      closeTab: (id) => {
        const state = get();
        const newSessions = { ...state.sessions };
        delete newSessions[id];
        if (Object.keys(newSessions).length === 0) {
          newSessions['t1'] = { number: 1, items: {}, discount: 0, discountType: 'fixed' };
        }
        set({ sessions: newSessions, activeTab: Object.keys(newSessions)[0] });
      },

      // ==========================================
      // CART ITEM ACTIONS
      // ==========================================
      addToCart: (p, v = undefined, overridePrice = undefined) => {
        const state = get();
        const vid = v ? v.id : 'base';
        const key = `${p.id}_${vid}`;
        const items = { ...state.sessions[state.activeTab].items };
        const finalPrice = overridePrice || (v ? v.p : p.p);

        if (items[key]) {
          items[key].qty += 1;
        } else {
          items[key] = {
            id: p.id, n: p.n, b: p.b, p: finalPrice,
            v_name: v ? v.n : null, vid: v ? String(v.id) : null, qty: 1,
          };
        }

        if (items[key].qty === 0) delete items[key];
        set({
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...state.sessions[state.activeTab], items },
          },
          search: '',
        });
      },

      modItem: (key, n) => {
        const state = get();
        const items = { ...state.sessions[state.activeTab].items };
        if (items[key]) {
          items[key].qty += n;
          if (items[key].qty === 0) delete items[key];
        }
        set({
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...state.sessions[state.activeTab], items },
          },
        });
      },

      clearCart: () => {
        const state = get();
        if (!confirm('Clear cart?')) return;
        set({
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...state.sessions[state.activeTab], items: {}, discount: 0 },
          },
        });
      },

      applyDiscount: (val, type) => {
        const state = get();
        set({
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...state.sessions[state.activeTab], discount: val, discountType: type },
          },
        });
      },

      updateItemPrice: (tabId, itemKey, newPrice) => {
        set((state) => {
          const session = state.sessions[tabId];
          if (!session?.items[itemKey]) return state;
          return {
            sessions: {
              ...state.sessions,
              [tabId]: {
                ...session,
                items: {
                  ...session.items,
                  [itemKey]: { ...session.items[itemKey], p: newPrice },
                },
              },
            },
          };
        });
      },

      // ==========================================
      // RECEIPT & QUEUE ACTIONS
      // ==========================================
      closeReceipt: () => set({ currentReceipt: null }),

      processPayment: (method, customerName, customerPhone) => {
        const state = get();
        const session = state.sessions[state.activeTab];
        const items = Object.values(session.items);
        if (items.length === 0) return;

        const rawSubtotal = items.reduce((a, i) => a + i.p * i.qty, 0);
        const discountAmt =
          session.discountType === 'percent'
            ? rawSubtotal * ((session.discount || 0) / 100)
            : session.discount || 0;
        const total = Math.round((rawSubtotal - discountAmt + Number.EPSILON) * 100) / 100;

        const newOrder: Order = {
          id: 'ORD-' + Math.floor(Date.now() / 1000),
          date: new Date().toLocaleString('en-NG'),
          method: method.toUpperCase(),
          items,
          total,
          raw_total: total,
          user_name: useAuthStore.getState().profile?.full_name || 'Unknown Cashier',
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
        };

        const newProducts = state.products.map((p) => {
          const cartItem = items.find((i) => i.id === p.id);
          return cartItem ? { ...p, s: p.s - cartItem.qty } : p;
        });

        set({
          products: newProducts,
          queue: [...state.queue, newOrder],
          currentReceipt: newOrder,
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...session, items: {}, discount: 0 },
          },
          mobileView: 'cart',
        });
      },

      processQueue: async () => {
        const state = get();
        if (state.queue.length === 0 || state.syncing) return;

        const { data: { user } } = await supabase.auth.getUser();
        const branchId = useAuthStore.getState().activeBranchId;
        const companyId = useAuthStore.getState().profile?.company_id;

        set({ syncing: true });
        const orderToSync = state.queue[0];

        if (!user || !companyId || !branchId) {
          console.error('[Supabase] Sync failed: Missing auth context.');
          set({ syncing: false });
          return;
        }

        try {
          const { data: orderRes, error: orderErr } = await supabase
            .from('orders')
            .insert({
              id: orderToSync.id,
              company_id: companyId,
              branch_id: branchId,
              user_id: user.id,
              total: orderToSync.total,
              method: orderToSync.method,
              user_name: orderToSync.user_name,
              customer_name: orderToSync.customer_name,
              customer_phone: orderToSync.customer_phone,
            })
            .select('id')
            .single();

          if (orderErr) throw new Error(orderErr.message || JSON.stringify(orderErr));

          const itemsToInsert = orderToSync.items.map((item) => ({
            order_id: orderRes.id,
            product_id: item.id,
            variant_id:
              item.vid && item.vid !== 'base' && !isNaN(Number(item.vid))
                ? Number(item.vid)
                : null,
            product_name: item.n,
            quantity: item.qty,
            price: item.p,
          }));

          const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
          if (itemsErr) throw new Error(itemsErr.message || JSON.stringify(itemsErr));

          usePosStore.setState({ queue: usePosStore.getState().queue.slice(1) });
          console.log(`[Supabase] Order ${orderToSync.id} synced.`);

        } catch (error: any) {
          const msg = error.message || JSON.stringify(error);
          if (msg.includes('duplicate key') || msg.includes('409')) {
            console.warn(`[Supabase] Order ${orderToSync.id} already synced. Removing.`);
            usePosStore.setState({ queue: usePosStore.getState().queue.slice(1) });
          } else {
            console.error(`[Supabase] Sync failed for ${orderToSync.id}:`, msg);
          }
        } finally {
          set({ syncing: false });
        }
      },

      refundByInvoice: async (invoiceId: string) => {
        if (!invoiceId.trim()) return 'Please enter an Invoice ID';
        let finalId = invoiceId.trim();
        if (!finalId.startsWith('ORD-')) finalId = 'ORD-' + finalId;

        const { data: order, error } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', finalId)
          .single();

        if (error || !order) return 'Invoice not found in this branch.';
        if (!order.order_items?.length) return 'Invoice has no items.';

        const state = get();
        const items = { ...state.sessions[state.activeTab].items };

        order.order_items.forEach((item: any) => {
          const vid = item.variant_id || 'base';
          const key = `${item.product_id}_${vid}`;
          if (items[key]) {
            items[key].qty -= item.quantity;
          } else {
            items[key] = {
              id: item.product_id, n: item.product_name, b: '', p: item.price,
              v_name: null, vid: item.variant_id ? String(item.variant_id) : null,
              qty: -item.quantity,
            };
          }
          if (items[key].qty === 0) delete items[key];
        });

        set({
          sessions: {
            ...state.sessions,
            [state.activeTab]: { ...state.sessions[state.activeTab], items },
          },
          mobileView: 'cart',
        });

        return null;
      },
    }),
    {
  name: 'pos-cart-storage',
  partialize: (state) => ({
    sessions: state.sessions,
    activeTab: state.activeTab,
    queue: state.queue,
    products: state.products,
  }),
}
  )
);