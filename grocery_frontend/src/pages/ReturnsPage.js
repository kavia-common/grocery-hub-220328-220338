import React, { useEffect, useState } from 'react';
import { listReturns } from '../services/returnsService';
import { Link } from 'react-router-dom';

export default function ReturnsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await listReturns();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const statusColor = (s) => {
    switch (s) {
      case 'REQUESTED': return '#2563EB';
      case 'APPROVED': return '#F59E0B';
      case 'REFUNDED': return '#16A34A';
      case 'REJECTED': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Returns & Refunds</h1>
        <p style={{ color: '#6B7280' }}>Track your return requests and refund status.</p>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          You have no return requests yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {items.map((r) => (
            <div key={r.id} style={{
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>Return #{r.id}</div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: `${statusColor(r.status)}15`,
                  color: statusColor(r.status),
                  fontWeight: 600,
                  fontSize: 12
                }}>
                  {r.status}
                </div>
              </div>
              <div style={{ color: '#6B7280', fontSize: 14, marginBottom: 8 }}>
                Order #{r.orderId} · Item #{r.itemId} · {new Date(r.createdAt).toLocaleString()}
              </div>
              {r.reason && <div style={{ marginBottom: 8 }}><strong>Reason:</strong> {r.reason}</div>}
              {r.description && <div style={{ marginBottom: 8, color: '#374151' }}>{r.description}</div>}
              {Array.isArray(r.photos) && r.photos.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {r.photos.map((p, idx) => (
                    <img
                      key={idx}
                      src={p.url}
                      alt={`Proof ${idx + 1} for return ${r.id}`}
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #e5e7eb' }}
                    />
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link to={`/orders/${r.orderId}`} aria-label={`View order ${r.orderId}`} style={{ color: '#2563EB' }}>
                  View Order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
