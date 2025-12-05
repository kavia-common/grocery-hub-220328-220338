import React, { useState } from 'react';
import { createReturn } from '../services/returnsService';
import { useNotifications } from '../notifications/NotificationsContext';

/**
 * PUBLIC_INTERFACE
 * ReturnRequestModal - A modal/drawer allowing users to submit a return/refund for a specific order line item.
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - orderId: number|string
 * - item: order line item { id, product, quantity, price }
 * - onCreated?: (ret) => void
 */
export default function ReturnRequestModal({ isOpen, onClose, orderId, item, onCreated }) {
  const { notify } = useNotifications?.() || { notify: () => {} };
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]); // [{url, file, name}]
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    const currentCount = photos.length;
    const remaining = Math.max(0, 3 - currentCount);
    const selected = files.slice(0, remaining);

    const entries = [];
    for (const f of selected) {
      // For preview in mock mode, we can generate object URL here too
      const url = URL.createObjectURL(f);
      entries.push({ file: f, url, name: f.name });
    }
    setPhotos([...photos, ...entries]);
    e.target.value = null;
  };

  const removePhoto = (idx) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const validate = () => {
    if (!reason) {
      setError('Please select a reason.');
      return false;
    }
    if (reason === 'Damaged' && photos.length === 0) {
      setError('A photo is required for Damaged items.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const preparedPhotos = photos.map(p => ({ file: p.file, url: p.url, name: p.name }));
      const created = await createReturn({
        orderId,
        itemId: item?.id,
        reason,
        description,
        photos: preparedPhotos
      });

      // Notifications: creation
      notify && notify('Return request submitted', {
        type: 'info',
        description: `Return for ${item?.product?.name || 'item'} has been submitted.`,
      });

      // If instant refund (mock): status REFUNDED
      if (created?.status === 'REFUNDED') {
        notify && notify('Instant refund approved', {
          type: 'success',
          description: 'Your damaged item was instantly refunded.',
        });
      }

      onCreated && onCreated(created);
      onClose && onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to submit return. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const backdropStyle = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(17,24,39,0.5)',
    zIndex: 50
  };
  const modalStyle = {
    position: 'fixed',
    right: 0,
    top: 0,
    height: '100%',
    width: '100%',
    maxWidth: 520,
    background: '#ffffff',
    borderLeft: '1px solid #e5e7eb',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    borderRadius: '0',
    zIndex: 51,
    overflowY: 'auto'
  };
  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(180deg, rgba(37,99,235,0.08), transparent)',
  };
  const titleStyle = { margin: 0, color: '#111827' };
  const bodyStyle = { padding: 20 };
  const labelStyle = { display: 'block', marginBottom: 8, color: '#374151', fontWeight: 600 };
  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    outline: 'none',
  };
  const buttonPrimary = {
    background: '#2563EB',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
    boxShadow: '0 4px 10px rgba(37,99,235,0.3)'
  };
  const buttonSecondary = {
    background: '#F3F4F6',
    color: '#111827',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: '10px 14px',
    cursor: 'pointer',
  };
  const errorStyle = { color: '#EF4444', marginTop: 8 };

  return (
    <div aria-modal="true" role="dialog" aria-labelledby="return-modal-title">
      <div style={backdropStyle} onClick={onClose} aria-label="Close return request modal backdrop" />
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 id="return-modal-title" style={titleStyle}>Request Return / Refund</h2>
        </div>
        <form onSubmit={handleSubmit} style={bodyStyle}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="reason">Reason</label>
            <select
              aria-label="Select return reason"
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">Select reason</option>
              <option value="Damaged">Damaged</option>
              <option value="Wrong item">Wrong item</option>
              <option value="Missing">Missing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="description">Description (optional)</label>
            <textarea
              aria-label="Describe issue"
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Share details that help us resolve this faster"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="photos">Photos (up to 3)</label>
            <input
              aria-label="Upload proof photos"
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={onFileChange}
            />
            {reason === 'Damaged' && (
              <div style={{ color: '#F59E0B', marginTop: 6 }}>Photo required for Damaged items.</div>
            )}
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                {photos.map((p, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={p.url}
                      alt={`Return proof ${idx + 1}`}
                      style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                    />
                    <button
                      aria-label={`Remove photo ${idx + 1}`}
                      type="button"
                      onClick={() => removePhoto(idx)}
                      style={{
                        position: 'absolute', top: -8, right: -8,
                        background: '#EF4444', color: '#fff', border: 'none', borderRadius: 12, width: 24, height: 24, cursor: 'pointer'
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && <div role="alert" style={errorStyle}>{error}</div>}
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button aria-label="Submit return request" type="submit" style={buttonPrimary} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
            <button aria-label="Cancel return request" type="button" onClick={onClose} style={buttonSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
