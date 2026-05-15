import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Supplier } from '../data/mockData';
import {
  apiGetSuppliers,
  apiCreateSupplier,
  apiUpdateSupplier,
  apiDeleteSupplier,
} from '../utils/api';

interface SupplierContextType {
  suppliers:      Supplier[];
  loading:        boolean;
  error:          string | null;
  addSupplier:    (supplier: Omit<Supplier, '_id'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  refetch:        () => Promise<void>;
}

const SupplierContext = createContext<SupplierContextType | undefined>(undefined);

export const SupplierProvider = ({ children }: { children: ReactNode }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetSuppliers();
      setSuppliers(data as Supplier[]);
    } catch (err: any) {
      setError(err.message ?? 'Не вдалося завантажити постачальників');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const addSupplier = async (newData: Omit<Supplier, '_id'>) => {
    const created = await apiCreateSupplier(newData);
    setSuppliers(prev => [created as Supplier, ...prev]);
  };

  const updateSupplier = async (id: string, updatedData: Partial<Supplier>) => {
    const existing = suppliers.find(s => s._id === id);
    if (!existing) return;
    const merged = { ...existing, ...updatedData };
    const updated = await apiUpdateSupplier(id, merged);
    setSuppliers(prev => prev.map(s => s._id === id ? (updated as Supplier) : s));
  };

  const deleteSupplier = async (id: string) => {
    await apiDeleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s._id !== id));
  };

  return (
    <SupplierContext.Provider value={{ suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier, refetch: fetch }}>
      {children}
    </SupplierContext.Provider>
  );
};

export const useSuppliers = () => {
  const ctx = useContext(SupplierContext);
  if (!ctx) throw new Error('useSuppliers must be used within SupplierProvider');
  return ctx;
};
