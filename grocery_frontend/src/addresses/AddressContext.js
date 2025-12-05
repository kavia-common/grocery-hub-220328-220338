import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  listAddresses,
  createAddress,
  updateAddress,
  removeAddress,
  setDefaultAddress,
  getDefaultAddress,
  selectAddress as serviceSelectAddress,
  getSelectedAddressId,
} from '../services/addressesService';

// PUBLIC_INTERFACE
export const AddressContext = createContext({
  addresses: [],
  selectedAddress: null,
  loading: false,
  loadAddresses: async () => {},
  selectAddress: () => {},
  addAddress: async () => {},
  updateAddress: async () => {},
  deleteAddress: async () => {},
  setDefault: async () => {},
});

// PUBLIC_INTERFACE
export function useAddress() {
  /** Hook to access the AddressContext. */
  return useContext(AddressContext);
}

// PUBLIC_INTERFACE
export function AddressProvider({ children }) {
  /** Provides address data and actions to descendants. */
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  const syncSelection = useCallback((list) => {
    const selectedId = getSelectedAddressId();
    let nextSel = null;
    if (selectedId) {
      nextSel = list.find(a => a.id === selectedId) || null;
    }
    if (!nextSel) {
      nextSel = getDefaultAddress();
    }
    setSelectedAddress(nextSel);
  }, []);

  const loadAddresses = useCallback(async () => {
    setLoading(true);
    const list = await listAddresses();
    setAddresses(list);
    syncSelection(list);
    setLoading(false);
  }, [syncSelection]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const selectAddress = useCallback((id) => {
    const sel = serviceSelectAddress(id);
    if (sel) setSelectedAddress(sel);
  }, []);

  const addAddress = useCallback(async (addr) => {
    const created = await createAddress(addr);
    const list = await listAddresses();
    setAddresses(list);
    if (created?.isDefault) {
      setSelectedAddress(created);
    } else if (!selectedAddress) {
      setSelectedAddress(created);
    }
    return created;
  }, [selectedAddress]);

  const updateAddressFn = useCallback(async (id, changes) => {
    const updated = await updateAddress(id, changes);
    const list = await listAddresses();
    setAddresses(list);
    if (updated && (updated.isDefault || selectedAddress?.id === id)) {
      // refresh selection
      const current = list.find(a => a.id === (updated.isDefault ? updated.id : selectedAddress?.id));
      setSelectedAddress(current || null);
    }
    return updated;
  }, [selectedAddress]);

  const deleteAddress = useCallback(async (id) => {
    await removeAddress(id);
    const list = await listAddresses();
    setAddresses(list);
    // resync selection
    syncSelection(list);
  }, [syncSelection]);

  const setDefault = useCallback(async (id) => {
    const def = await setDefaultAddress(id);
    const list = await listAddresses();
    setAddresses(list);
    if (def) setSelectedAddress(def);
    return def;
  }, []);

  const value = useMemo(() => ({
    addresses,
    selectedAddress,
    loading,
    loadAddresses,
    selectAddress,
    addAddress,
    updateAddress: updateAddressFn,
    deleteAddress,
    setDefault,
  }), [addresses, selectedAddress, loading, loadAddresses, selectAddress, addAddress, updateAddressFn, deleteAddress, setDefault]);

  return (
    <AddressContext.Provider value={value}>
      {children}
    </AddressContext.Provider>
  );
}
