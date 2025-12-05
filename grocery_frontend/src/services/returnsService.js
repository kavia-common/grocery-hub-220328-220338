//
// Returns Service - mock-first with optional backend fallback
// Uses localStorage to persist return requests and supports optional backend endpoints at /api/returns
//

const STORAGE_KEY = 'ghub_returns_v1';

// Helper to read/write localStorage
function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeLocal(returnsList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(returnsList));
  } catch {
    // ignore quota exceed
  }
}

function generateId() {
  return `ret_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getApiBase() {
  // Try to detect backend URL; if not available, use mock mode
  const base = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE || '';
  return base;
}

async function tryBackend(method, url, body, headers = {}) {
  const base = getApiBase();
  if (!base) return { ok: false, status: 0 };
  try {
    const resp = await fetch(`${base}${url}`, {
      method,
      headers,
      body,
      credentials: 'include',
    });
    return resp;
  } catch {
    return { ok: false, status: 0 };
  }
}

// PUBLIC_INTERFACE
export async function uploadProof(orderId, itemId, file) {
  /** Upload proof image for a return request. In mock mode, returns a blob URL for preview.
   * If backend available, POST multipart to /api/returns/proof and return URL from backend.
   */
  if (!(file instanceof Blob)) {
    throw new Error('Invalid file');
  }
  const base = getApiBase();
  if (!base) {
    // Mock: create a local object URL for preview only
    const url = URL.createObjectURL(file);
    return { url, storage: 'blob' };
  }

  // Backend fallback - multipart
  const form = new FormData();
  form.append('orderId', orderId);
  form.append('itemId', itemId);
  form.append('file', file);

  const resp = await tryBackend('POST', '/api/returns/proof', form);
  if (resp.ok) {
    const data = await resp.json().catch(() => ({}));
    // Expecting {url: string}
    return { url: data.url, storage: 'remote' };
  }

  // Fallback to mock URL if backend fails
  const url = URL.createObjectURL(file);
  return { url, storage: 'blob' };
}

// PUBLIC_INTERFACE
export async function createReturn({ orderId, itemId, reason, description, photos = [] }) {
  /** Create a return request. In mock mode, stores in localStorage.
   * If reason === 'Damaged' and at least one photo, auto-approve and mark refunded.
   */
  const now = new Date().toISOString();
  const base = getApiBase();
  // Attempt backend first if available
  if (base) {
    try {
      const hasFiles = photos?.some(p => p?.file instanceof Blob);
      if (hasFiles) {
        const form = new FormData();
        form.append('orderId', orderId);
        form.append('itemId', itemId);
        form.append('reason', reason);
        if (description) form.append('description', description);
        photos.forEach((p, idx) => {
          if (p?.file instanceof Blob) form.append('photos', p.file, p.file.name || `photo_${idx}.jpg`);
        });
        const resp = await tryBackend('POST', '/api/returns', form);
        if (resp.ok) {
          const created = await resp.json();
          return created;
        }
      } else {
        const payload = { orderId, itemId, reason, description, photos };
        const resp = await tryBackend('POST', '/api/returns', JSON.stringify(payload), {
          'Content-Type': 'application/json',
        });
        if (resp.ok) {
          const created = await resp.json();
          return created;
        }
      }
    } catch {
      // fall through to mock
    }
  }

  // Mock flow
  // Convert photos entries: if they carry a file, create URL; else pass as given
  const photoEntries = [];
  for (const p of photos || []) {
    if (p?.file instanceof Blob) {
      const { url } = await uploadProof(orderId, itemId, p.file);
      photoEntries.push({ url, name: p.file.name || 'photo.jpg', type: p.file.type || 'image/jpeg' });
    } else if (p?.url) {
      photoEntries.push({ url: p.url, name: p.name || 'photo.jpg', type: p.type || 'image/jpeg' });
    }
  }

  const returnsList = readLocal();
  const id = generateId();
  let status = 'REQUESTED';
  let approvedAt = null;
  let refundedAt = null;

  // Instant approval/refund for Damaged with photo proof
  if (reason === 'Damaged' && photoEntries.length > 0) {
    status = 'REFUNDED';
    approvedAt = now;
    refundedAt = now;
  }

  const entry = {
    id,
    orderId,
    itemId,
    reason,
    description: description || '',
    status, // REQUESTED | APPROVED | REFUNDED | REJECTED
    createdAt: now,
    updatedAt: now,
    approvedAt,
    refundedAt,
    photos: photoEntries,
  };
  writeLocal([entry, ...returnsList]);
  return entry;
}

// PUBLIC_INTERFACE
export async function listReturns() {
  /** List returns - backend first, fallback to local. */
  const base = getApiBase();
  if (base) {
    try {
      const resp = await tryBackend('GET', '/api/returns');
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // ignore
    }
  }
  return readLocal();
}

// PUBLIC_INTERFACE
export async function getReturnById(id) {
  /** Get a single return by id - backend first, fallback to local. */
  const base = getApiBase();
  if (base) {
    try {
      const resp = await tryBackend('GET', `/api/returns/${id}`);
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // ignore
    }
  }
  const all = readLocal();
  return all.find(r => r.id === id) || null;
}

// PUBLIC_INTERFACE
export async function approveInstantRefund(id) {
  /** Mock-mode helper: approve and mark refunded a return request */
  const base = getApiBase();
  if (base) {
    // try backend approve endpoint
    const resp = await tryBackend('POST', `/api/returns/${id}/approve`);
    if (resp.ok) {
      const data = await resp.json();
      return data;
    }
  }
  const now = new Date().toISOString();
  const all = readLocal();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) {
    const r = all[idx];
    const updated = {
      ...r,
      status: 'REFUNDED',
      approvedAt: r.approvedAt || now,
      refundedAt: now,
      updatedAt: now,
    };
    all[idx] = updated;
    writeLocal(all);
    return updated;
  }
  return null;
}
