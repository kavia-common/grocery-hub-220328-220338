//
// AddressesService - manages user addresses using localStorage with optional backend fallback
// Ocean Professional theme friendly defaults and ESLint-compliant, no external deps.
//

const STORAGE_KEY = 'ghub_addresses';
const SELECTED_KEY = 'ghub_selected_address_id';
const API_BASE =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_BASE ||
  ''; // optional; if provided and supports /api/addresses

// Pre-seed friendly labels
export const FRIENDLY_LABELS = ['Home', 'Office', 'Friend'];

// Helpers
function uuid() {
  // Simple UUID v4 style
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-mixed-operators
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.error('Failed to parse addresses from localStorage', e);
    return [];
  }
}

function writeLocal(addresses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch (e) {
    console.error('Failed to write addresses to localStorage', e);
  }
}

function readSelectedId() {
  try {
    return localStorage.getItem(SELECTED_KEY) || null;
  } catch (e) {
    return null;
  }
}

function writeSelectedId(id) {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id);
    else localStorage.removeItem(SELECTED_KEY);
  } catch (e) {
    // ignore
  }
}

// PUBLIC_INTERFACE
export async function listAddresses() {
  /** Return addresses from localStorage; if empty attempt backend fallback once. */
  let items = readLocal();
  if (!items || items.length === 0) {
    // seed with empty array, then try fallback
    items = [];
    writeLocal(items);
    // Backend fallback is optional and best-effort
    if (API_BASE) {
      try {
        const resp = await fetch(`${API_BASE}/api/addresses`, { credentials: 'include' });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data)) {
            items = data.map(normalizeFromBackend);
            writeLocal(items);
          }
        }
      } catch (e) {
        // ignore network errors, stay mock-first
      }
    }
    // If still empty, pre-seed with friendly labels placeholders for quick UX
    if (items.length === 0) {
      items = FRIENDLY_LABELS.map((label, idx) => ({
        id: uuid(),
        label,
        name: '',
        phone: '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        zip: '',
        isDefault: idx === 0, // Home default
      }));
      writeLocal(items);
      const def = items.find(a => a.isDefault);
      if (def) writeSelectedId(def.id);
    }
  }
  return items;
}

function normalizeFromBackend(a) {
  // Attempt to map backend fields to our model
  return {
    id: a.id?.toString?.() || uuid(),
    label: a.label || a.type || 'Home',
    name: a.name || '',
    phone: a.phone || '',
    line1: a.line1 || a.address_line1 || a.address || '',
    line2: a.line2 || a.address_line2 || '',
    city: a.city || '',
    state: a.state || '',
    zip: a.zip || a.postal_code || '',
    isDefault: Boolean(a.is_default || a.isDefault),
  };
}

// PUBLIC_INTERFACE
export async function getAddress(id) {
  /** Get an address by id from local. */
  const items = readLocal() || [];
  return items.find(a => a.id === id) || null;
}

// PUBLIC_INTERFACE
export async function createAddress(addr) {
  /** Create a new address and persist to localStorage. */
  const items = readLocal() || [];
  const newItem = {
    id: uuid(),
    label: addr.label || 'Home',
    name: addr.name || '',
    phone: addr.phone || '',
    line1: addr.line1 || '',
    line2: addr.line2 || '',
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.zip || '',
    isDefault: Boolean(addr.isDefault),
  };
  if (newItem.isDefault) {
    items.forEach(a => {
      // only one default
      // eslint-disable-next-line no-param-reassign
      a.isDefault = false;
    });
  }
  items.push(newItem);
  writeLocal(items);
  if (newItem.isDefault) writeSelectedId(newItem.id);
  return newItem;
}

// PUBLIC_INTERFACE
export async function updateAddress(id, changes) {
  /** Update an existing address by id. */
  const items = readLocal() || [];
  const idx = items.findIndex(a => a.id === id);
  if (idx === -1) return null;

  const updated = { ...items[idx], ...changes };
  if (changes.isDefault) {
    items.forEach((a, i) => {
      // eslint-disable-next-line no-param-reassign
      items[i] = { ...a, isDefault: a.id === id };
    });
    writeSelectedId(id);
  }
  items[idx] = updated;
  writeLocal(items);
  return updated;
}

// PUBLIC_INTERFACE
export async function removeAddress(id) {
  /** Remove an address by id. Also clears selected if it was selected. */
  const items = readLocal() || [];
  const next = items.filter(a => a.id !== id);
  writeLocal(next);
  if (readSelectedId() === id) {
    // select default if any; otherwise clear
    const def = next.find(a => a.isDefault);
    writeSelectedId(def ? def.id : (next[0]?.id || null));
  }
  return true;
}

// PUBLIC_INTERFACE
export async function setDefaultAddress(id) {
  /** Set a single default address and persist selection id. */
  const items = readLocal() || [];
  let found = null;
  const mapped = items.map(a => {
    const isDef = a.id === id;
    if (isDef) found = { ...a, isDefault: true };
    return { ...a, isDefault: isDef };
  });
  writeLocal(mapped);
  writeSelectedId(id);
  return found;
}

// PUBLIC_INTERFACE
export function getDefaultAddress() {
  /** Return selected address if present else default address else null. */
  const items = readLocal() || [];
  const selectedId = readSelectedId();
  if (selectedId) {
    const sel = items.find(a => a.id === selectedId);
    if (sel) return sel;
  }
  return items.find(a => a.isDefault) || items[0] || null;
}

// PUBLIC_INTERFACE
export function selectAddress(id) {
  /** Persist selection by id; does not change isDefault flag. */
  const items = readLocal() || [];
  const match = items.find(a => a.id === id);
  if (match) writeSelectedId(id);
  return match || null;
}

// PUBLIC_INTERFACE
export function getSelectedAddressId() {
  /** Return the currently selected address id. */
  return readSelectedId();
}
