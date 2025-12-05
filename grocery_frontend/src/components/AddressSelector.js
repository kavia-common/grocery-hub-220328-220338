import React, { useMemo, useState } from 'react';
import { useAddress } from '../addresses/AddressContext';
import { FRIENDLY_LABELS } from '../services/addressesService';
import '../pages/address.css';

const primary = '#2563EB';
const secondary = '#F59E0B';

function validate(values) {
  const errors = {};
  if (!values.label) errors.label = 'Label is required';
  if (!values.name) errors.name = 'Name is required';
  if (!values.phone) errors.phone = 'Phone is required';
  if (!values.line1) errors.line1 = 'Address Line 1 is required';
  if (!values.city) errors.city = 'City is required';
  if (!values.state) errors.state = 'State is required';
  if (!values.zip) errors.zip = 'ZIP is required';
  return errors;
}

function QuickForm({ initial, onCancel, onSave }) {
  const [values, setValues] = useState(() => ({
    label: initial?.label || 'Home',
    name: initial?.name || '',
    phone: initial?.phone || '',
    line1: initial?.line1 || '',
    line2: initial?.line2 || '',
    city: initial?.city || '',
    state: initial?.state || '',
    zip: initial?.zip || '',
    isDefault: initial?.isDefault || false,
  }));
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValues(v => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = (e) => {
    e.preventDefault();
    const err = validate(values);
    setErrors(err);
    if (Object.keys(err).length === 0) onSave(values);
  };

  return (
    <form className="addr-form small" onSubmit={submit}>
      <div className="addr-grid">
        <div className="addr-field">
          <label className="addr-label">Label *</label>
          <select name="label" className="addr-input" value={values.label} onChange={onChange}>
            {FRIENDLY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.label && <div className="addr-err">{errors.label}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">Full Name *</label>
          <input className="addr-input" name="name" value={values.name} onChange={onChange} />
          {errors.name && <div className="addr-err">{errors.name}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">Phone *</label>
          <input className="addr-input" name="phone" value={values.phone} onChange={onChange} />
          {errors.phone && <div className="addr-err">{errors.phone}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">Address Line 1 *</label>
          <input className="addr-input" name="line1" value={values.line1} onChange={onChange} />
          {errors.line1 && <div className="addr-err">{errors.line1}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">Address Line 2</label>
          <input className="addr-input" name="line2" value={values.line2} onChange={onChange} />
        </div>
        <div className="addr-field">
          <label className="addr-label">City *</label>
          <input className="addr-input" name="city" value={values.city} onChange={onChange} />
          {errors.city && <div className="addr-err">{errors.city}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">State *</label>
          <input className="addr-input" name="state" value={values.state} onChange={onChange} />
          {errors.state && <div className="addr-err">{errors.state}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-label">ZIP *</label>
          <input className="addr-input" name="zip" value={values.zip} onChange={onChange} />
          {errors.zip && <div className="addr-err">{errors.zip}</div>}
        </div>
        <div className="addr-field">
          <label className="addr-check">
            <input type="checkbox" name="isDefault" checked={values.isDefault} onChange={onChange} />
            Set as default
          </label>
        </div>
      </div>
      <div className="addr-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary">Save</button>
      </div>
    </form>
  );
}

// PUBLIC_INTERFACE
export default function AddressSelector() {
  /** Address selector panel for checkout; switch, quick add, quick edit. */
  const { addresses, selectedAddress, selectAddress, addAddress, updateAddress } = useAddress();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('list'); // list | add | edit
  const [editing, setEditing] = useState(null);

  const label = useMemo(() => {
    if (!selectedAddress) return 'Select Address';
    return `${selectedAddress.label}: ${selectedAddress.name}`;
  }, [selectedAddress]);

  const startAdd = () => {
    setEditing(null);
    setMode('add');
    setOpen(true);
  };

  const startEdit = () => {
    if (!selectedAddress) return;
    setEditing(selectedAddress);
    setMode('edit');
    setOpen(true);
  };

  const onSave = async (values) => {
    if (mode === 'add') {
      const created = await addAddress(values);
      if (created) selectAddress(created.id);
    } else if (mode === 'edit' && editing) {
      await updateAddress(editing.id, values);
    }
    setMode('list');
    setEditing(null);
    setOpen(false);
  };

  return (
    <div className="addr-selector">
      <div className="addr-selector-header">
        <div className="addr-selector-title">Shipping Address</div>
        <div className="addr-selector-actions">
          <button className="btn-ghost" onClick={() => setOpen(!open)} aria-expanded={open}>
            {open ? 'Close' : 'Change'}
          </button>
          <button className="btn-primary subtle" onClick={startAdd}>Add</button>
          <button className="btn-ghost" onClick={startEdit} disabled={!selectedAddress}>Edit</button>
        </div>
      </div>
      <div className="addr-selected">
        {selectedAddress ? (
          <>
            <div className="addr-selected-line"><strong>{label}</strong></div>
            <div className="addr-selected-line">
              {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}
            </div>
            <div className="addr-selected-line small">{selectedAddress.phone}</div>
          </>
        ) : (
          <div className="addr-empty">No address selected.</div>
        )}
      </div>

      {open && mode === 'list' && (
        <div className="addr-dropdown">
          {addresses.map(a => (
            <button
              key={a.id}
              className={`addr-option ${selectedAddress?.id === a.id ? 'active' : ''}`}
              onClick={() => selectAddress(a.id)}
            >
              <div className="addr-option-top">
                <span className="addr-badge" style={{ background: a.isDefault ? secondary : '#e5e7eb', color: a.isDefault ? '#111827' : '#374151' }}>
                  {a.label}{a.isDefault ? ' • Default' : ''}
                </span>
                {selectedAddress?.id === a.id && <span className="addr-chip" style={{ background: primary, color: '#fff' }}>Selected</span>}
              </div>
              <div className="addr-option-body">
                <div className="addr-name">{a.name} • {a.phone}</div>
                <div className="addr-lines">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.zip}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (mode === 'add' || mode === 'edit') && (
        <div className="addr-modal">
          <div className="addr-modal-content">
            <div className="addr-modal-header">
              <div className="addr-modal-title">{mode === 'add' ? 'Add Address' : 'Edit Address'}</div>
              <button className="btn-ghost" onClick={() => { setOpen(false); setMode('list'); setEditing(null); }}>✕</button>
            </div>
            <QuickForm
              initial={editing}
              onCancel={() => { setOpen(false); setMode('list'); setEditing(null); }}
              onSave={onSave}
            />
          </div>
        </div>
      )}
    </div>
  );
}
