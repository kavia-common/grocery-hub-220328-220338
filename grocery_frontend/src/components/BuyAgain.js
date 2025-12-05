import React, { useEffect, useState, useCallback } from 'react';
import { getFrequentItems } from '../services/orderService';
import api from '../api';
import { useNotifications } from '../notifications/NotificationsContext';

/**
 * PUBLIC_INTERFACE
 * BuyAgain component: shows frequently/recently purchased products with CTA to add again or quick buy.
 */
export default function BuyAgain({ limit = 8, onQuickBuy }) {
  const [items, setItems] = useState([]);
  const { pushNotification } = useNotifications?.() || { pushNotification: () => {} };

  useEffect(() => {
    getFrequentItems(limit).then(setItems).catch(() => setItems([]));
  }, [limit]);

  const addAgain = useCallback(async (product) => {
    const stockQty = typeof product.stock === 'number' ? product.stock : (product.stockQty ?? 0);
    const isInStock = product.isInStock ?? stockQty > 0;
    if (!isInStock) {
      pushNotification?.({ type: 'warning', message: 'Item is out of stock. You can set a reminder.' });
      return;
    }
    try {
      await api.post('/api/cart', { product_id: product.id, quantity: 1 });
      pushNotification?.({ type: 'success', message: `Added ${product.name} to your cart` });
    } catch {
      pushNotification?.({ type: 'error', message: 'Failed to add item to cart' });
    }
  }, [pushNotification]);

  const handleQuickBuy = useCallback(async (product) => {
    const stockQty = typeof product.stock === 'number' ? product.stock : (product.stockQty ?? 0);
    const isInStock = product.isInStock ?? stockQty > 0;
    if (!isInStock) {
      pushNotification?.({ type: 'warning', message: 'Item is out of stock. You can set a reminder.' });
      return;
    }
    if (onQuickBuy) {
      onQuickBuy(product);
      return;
    }
    // default: add and navigate hint
    try {
      await api.post('/api/cart', { product_id: product.id, quantity: 1 });
      pushNotification?.({ type: 'success', message: `Quick added ${product.name}. Proceed to checkout from cart.` });
    } catch {
      pushNotification?.({ type: 'error', message: 'Quick buy failed' });
    }
  }, [onQuickBuy, pushNotification]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section style={{ margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ color: '#2563EB', margin: 0 }}>Buy Again</h3>
        <a href="/buy-again" style={{ color: '#F59E0B', fontSize: 14, textDecoration: 'none' }}>See all</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginTop: 12 }}>
        {items.map(({ product, totalQuantity }) => {
          const isInStock = product.isInStock ?? (typeof product.stock === 'number' ? product.stock > 0 : (product.stockQty ?? 0) > 0);
          return (
            <div key={product.id} className="card" style={{ padding: 12, borderTop: '3px solid #2563EB' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{product.name}</div>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
                Purchased {totalQuantity} time{totalQuantity > 1 ? 's' : ''}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  disabled={!isInStock}
                  onClick={() => addAgain(product)}
                  style={{
                    background: '#2563EB',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: isInStock ? 'pointer' : 'not-allowed'
                  }}
                >
                  Add again
                </button>
                <button
                  disabled={!isInStock}
                  onClick={() => handleQuickBuy(product)}
                  style={{
                    background: '#F59E0B',
                    color: '#111827',
                    border: 'none',
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: isInStock ? 'pointer' : 'not-allowed'
                  }}
                >
                  Quick Buy
                </button>
              </div>
              {!isInStock && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                  Out of stock — <span style={{ color: '#F59E0B', cursor: 'pointer' }}>Remind me</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
