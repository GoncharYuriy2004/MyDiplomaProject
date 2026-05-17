import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Document } from '../data/mockData';
import { apiGetDocuments, apiCreateDocument, apiApproveDocument, apiRejectDocument, apiDeleteDocument } from '../utils/api';

interface DocumentsContextType {
  documents:       Document[];
  loading:         boolean;
  error:           string | null;
  refetch:         () => Promise<void>;
  createDocument:  (data: Omit<Document, '_id'>) => Promise<void>;
  approveDocument: (id: string) => Promise<void>;
  removeDocument:  (id: string) => Promise<void>;
  deleteDocument:  (id: string) => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider = ({ children }: { children: ReactNode }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetDocuments();
      setDocuments(data as Document[]);
    } catch (err: any) {
      setError(err.message ?? 'Не вдалося завантажити документи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    // Refetch whenever the manager switches back to this tab (worker may have created docs meanwhile)
    const onVisible = () => { if (document.visibilityState === 'visible') fetch(); };
    document.addEventListener('visibilitychange', onVisible);
    // Also poll every 30 s so the list stays fresh without any user action
    const timer = setInterval(fetch, 30_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  const createDocument = async (data: Omit<Document, '_id'>) => {
    const created = await apiCreateDocument(data);
    setDocuments(prev => [created as Document, ...prev]);
  };

  const approveDocument = async (id: string) => {
    await apiApproveDocument(id);
    setDocuments(prev => prev.map(d => d._id === id ? { ...d, status: 'approved' as const } : d));
  };

  const removeDocument = async (id: string) => {
    await apiRejectDocument(id);
    setDocuments(prev => prev.map(d => d._id === id ? { ...d, status: 'rejected' as const } : d));
  };

  const deleteDocument = async (id: string) => {
    await apiDeleteDocument(id);
    setDocuments(prev => prev.filter(d => d._id !== id));
  };

  return (
    <DocumentsContext.Provider value={{ documents, loading, error, refetch: fetch, createDocument, approveDocument, removeDocument, deleteDocument }}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = () => {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
};
