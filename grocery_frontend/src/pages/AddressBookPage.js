import React, { useMemo, useState } from 'react';
import { useAddress } from '../addresses/AddressContext';
import { FRIENDLY_LABELS } from '../services/addressesService';
import './address.css';

const secondary = '#F59E0B';

function Field({ label, required, children }) {
  return (
    <div className="addr-field">
      <label className="addr-label">
        {label} {required ? <span className="addr-req">*</span> : null}
      </label>
      {children}
    </div>
  );
}

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

function AddressForm({ initial, onCancel, onSave }) {
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

  const onSubmit = (e) => {
    e.preventDefault();
    const err = validate(values);
    setErrors(err);
    if (Object.keys(err).length === 0) {
      onSave(values);
    }
  };

  return (
    <form className="addr-form" onSubmit={onSubmit}>
      <div className="addr-grid">
        <Field label="Label" required>
          <select name="label" className="addr-input" value={values.label} onChange={onChange}>
            {FRIENDLY_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          {errors.label && <div className="addr-err">{errors.label}</div>}
        </Field>
        <Field label="Full Name" required>
          <input className="addr-input" name="name" value={values.name} onChange={onChange} placeholder="John Doe" />
          {errors.name && <div className="addr-err">{errors.name}</div>}
        </Field>
        <Field label="Phone" required>
          <input className="addr-input" name="phone" value={values.phone} onChange={onChange} placeholder="(555) 123-4567" />
          {errors.phone && <div className="addr-err">{errors.phone}</div>}
        </Field>
        <Field label="Address Line 1" required>
          <input className="addr-input" name="line1" value={values.line1} onChange={onChange} placeholder="123 Main St" />
          {errors.line1 && <div className="addr-err">{errors.line1}</div>}
        </Field>
        <Field label="Address Line 2">
          <input className="addr-input" name="line2" value={values.line2} onChange={onChange} placeholder="Apt, suite, etc." />
        </Field>
        <Field label="City" required>
          <input className="addr-input" name="city" value={values.city} onChange={onChange} placeholder="Seattle" />
          {errors.city && <div className="addr-err">{errors.city}</div>}
        </Field>
        <Field label="State" required>
          <input className="addr-input" name="state" value={values.state} onChange={onChange} placeholder="WA" />
          {errors.state && <div className="addr-err">{errors.state}</div>}
        </Field>
        <Field label="ZIP" required>
          <input className="addr-input" name="zip" value={values.zip} onChange={onChange} placeholder="98101" />
          {errors.zip && <div className="addr-err">{errors.zip}</div>}
        </Field>
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

function AddressCard({ a, onEdit, onDelete, onSetDefault }) {
  return (
    <div className="addr-card">
      <div className="addr-row">
        <span className="addr-badge" style={{ background: a.isDefault ? secondary : '#e5e7eb', color: a.isDefault ? '#111827' : '#374151' }}>
          {a.label}{a.isDefault ? ' • Default' : ''}
        </span>
      </div>
      <div className="addr-info">
        <div className="addr-name">{a.name} <span className="addr-phone">• {a.phone}</span></div>
        <div className="addr-lines">
          {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.zip}
        </div>
      </div>
      <div className="addr-actions">
        <button className="btn-ghost" onClick={() => onEdit(a)}>Edit</button>
        <button className="btn-ghost danger" onClick={() => onDelete(a.id)}>Delete</button>
        {!a.isDefault && <button className="btn-primary subtle" onClick={() => onSetDefault(a.id)}>Set Default</button>}
      </div>
    </div>
  );
}

// PUBLIC_INTERFACE
export default function AddressBookPage() {
  /** Address book manager page. */
  const { addresses, addAddress, updateAddress, deleteAddress, setDefault } = useAddress();
  const [mode, setMode] = useState('list'); // 'list' | 'add' | 'edit'
  const [editing, setEditing] = useState(null);

  const title = useMemo(() => {
    if (mode === 'add') return 'Add New Address';
    if (mode === 'edit') return 'Edit Address';
    return 'Your Addresses';
  }, [mode]);

  const startAdd = () => {
    setEditing(null);
    setMode('add');
  };

  const startEdit = (a) => {
    setEditing(a);
    setMode('edit');
  };

  const doSave = async (values) => {
    if (mode === 'add') {
      await addAddress(values);
    } else if (mode === 'edit' && editing) {
      await updateAddress(editing.id, values);
    }
    setMode('list');
    setEditing(null);
  };

  const onDelete = async (id) => {
    // basic confirm
    // eslint-disable-next-line no-alert
    if (window.confirm('Delete this address?')) {
      await deleteAddress(id);
    }
  };

  return (
    <div className="addr-page">
      <div className="addr-header">
        <h1 className="addr-title">{title}</h1>
        {mode === 'list' && (
          <button className="btn-primary" onClick={startAdd}>Add New</button>
        )}
      </div>

      {mode === 'list' && (
        <div className="addr-list">
          {addresses.map(a => (
            <AddressCard
              key={a.id}
              a={a}
              onEdit={startEdit}
              onDelete={onDelete}
              onSetDefault={setDefault}
            />
          ))}
          {addresses.length === 0 && (
            <div className="addr-empty">No addresses yet. Click "Add New" to create one.</div>
          )}
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <AddressForm
          initial={editing}
          onCancel={() => { setMode('list'); setEditing(null); }}
          onSave={doSave}
        />
      )}
    </div>
  );
}
