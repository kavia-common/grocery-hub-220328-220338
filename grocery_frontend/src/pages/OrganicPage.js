import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrganicProducts } from '../services/productsService';
import './address.css';

// PUBLIC_INTERFACE
export default function OrganicPage() {
  /** Organic Store page with tabs for categories and a sortable grid. */
  const navigate = useNavigate();
  const { tab } = useParams();
  const [items, setItems] = useState([]);
  const [sort, setSort] = useState('relevance');

  const normalizedTab = useMemo(() => {
    const t = (tab || 'fruits_veg').toLowerCase();
    if (['fruits_veg', 'grains_pulses', 'chemical_free'].includes(t)) return t;
    return 'fruits_veg';
  }, [tab]);

  useEffect(() => {
    async function load() {
      const data = await getOrganicProducts({ organicCategory: normalizedTab });
      setItems(data || []);
    }
    load();
  }, [normalizedTab]);

  const handleTabChange = (next) => {
    navigate(`/organic/${next}`);
  };

  const sortedItems = useMemo(() => {
    const list = [...items];
    switch (sort) {
      case 'price_low':
        return list.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return list.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'name':
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      default:
        return list;
    }
  }, [items, sort]);

  return (
    <div className="page organic-page">
      <div className="organic-hero" style={{ background: 'linear-gradient(90deg, #e6f4ea 0%, #ffffff 100%)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#2563EB' }}>Organic Store</h2>
        <p style={{ margin: '4px 0 0 0', color: '#111827' }}>Certified organic picks curated for you.</p>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => handleTabChange('fruits_veg')} className={`tab ${normalizedTab === 'fruits_veg' ? 'active' : ''}`}>Fruits & Vegetables</button>
        <button onClick={() => handleTabChange('grains_pulses')} className={`tab ${normalizedTab === 'grains_pulses' ? 'active' : ''}`}>Grains & Pulses</button>
        <button onClick={() => handleTabChange('chemical_free')} className={`tab ${normalizedTab === 'chemical_free' ? 'active' : ''}`}>Chemical-free Items</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#6B7280' }}>{items.length} items</div>
        <div>
          <label htmlFor="organic-sort" style={{ marginRight: 8 }}>Sort</label>
          <select id="organic-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="relevance">Relevance</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {sortedItems.map((p) => (
          <OrganicCard key={p.id} product={p} />
        ))}
        {sortedItems.length === 0 && (
          <div style={{ color: '#6B7280' }}>No products found for this category.</div>
        )}
      </div>
    </div>
  );
}

function OrganicCard({ product }) {
  const oBadge = product.isOrganic ? (
    <span style={{ backgroundColor: '#10B9811A', color: '#059669', border: '1px solid #10B981', fontSize: 12, padding: '2px 6px', borderRadius: 6, marginRight: 6 }}>
      Organic
    </span>
  ) : null;

  const cert = product.organicCert ? (
    <span style={{ color: '#065F46', fontSize: 12, marginLeft: 4 }}>
      {product.organicCert}
    </span>
  ) : null;

  const oos = (product.stock ?? 0) <= 0;

  return (
    <div className="card" style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: 12, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        {oBadge}{cert}
      </div>
      <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, background: '#f3f4f6' }} />
      <div style={{ marginTop: 8, fontWeight: 600 }}>{product.name}</div>
      <div style={{ color: '#6B7280', fontSize: 14, minHeight: 36 }}>{product.description}</div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#111827', fontWeight: 700 }}>₹{Number(product.price || 0).toFixed(2)}</div>
        {oos ? (
          <button className="btn-secondary" disabled title="Out of stock">Remind Me</button>
        ) : (
          <button className="btn-primary">Add to Cart</button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button className="btn-ghost">Quick Buy</button>
        <button className="btn-ghost">Wishlist</button>
        <button className="btn-ghost">Price Alert</button>
      </div>
    </div>
  );
}
