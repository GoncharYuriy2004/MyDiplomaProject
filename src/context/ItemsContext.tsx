import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Product } from '../data/mockData';
import { apiGetItems, apiUpdateItem, apiCreateItem, apiDeleteItem } from '../utils/api';

interface ItemsContextType {
  items:       Product[];
  loading:     boolean;
  error:       string | null;
  refetch:     () => Promise<void>;
  updateItem:  (id: string, data: Partial<Product>) => Promise<void>;
  createItem:  (data: Omit<Product, '_id'>) => Promise<void>;
  deleteItem:  (id: string) => Promise<void>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

export const ItemsProvider = ({ children }: { children: ReactNode }) => {
  const [items,   setItems]   = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetItems();
      setItems(data as Product[]);
    } catch (err: any) {
      setError(err.message ?? 'Не вдалося завантажити товари');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const updateItem = async (id: string, data: Partial<Product>) => {
    const existing = items.find(i => i._id === id);
    if (!existing) throw new Error('Товар не знайдено у локальному стані. Оновіть сторінку.');
    const merged = { ...existing, ...data };
    const updated = await apiUpdateItem(id, merged);
    setItems(prev => prev.map(i => i._id === id ? (updated as Product) : i));
  };

  const createItem = async (data: Omit<Product, '_id'>) => {
    const created = await apiCreateItem(data);
    setItems(prev => [created as Product, ...prev]);
  };

  const deleteItem = async (id: string) => {
    await apiDeleteItem(id);
    setItems(prev => prev.filter(i => i._id !== id));
  };

  return (
    <ItemsContext.Provider value={{ items, loading, error, refetch: fetch, updateItem, createItem, deleteItem }}>
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const ctx = useContext(ItemsContext);
  if (!ctx) throw new Error('useItems must be used within ItemsProvider');
  return ctx;
};
