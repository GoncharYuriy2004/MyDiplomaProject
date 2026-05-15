import React, { useState, useEffect } from 'react';
import { Undo2, UserCheck, ClipboardPenLine, CheckCircle2, FileText, FileDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useItems } from '../../context/ItemsContext';
import { apiCreateTransaction, apiGetTransactions } from '../../utils/api';
import { downloadReturnActPDF } from '../../utils/pdfGenerator';

type ReturnEntry = {
    id: string;
    date: string;
    productName: string;
    sku?: string;
    unit?: string;
    quantity: number;
    returnedFrom: string;
};

const Returns = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { items, updateItem, refetch } = useItems();

    const [selectedProduct, setSelectedProduct] = useState('');
    const [quantity, setQuantity] = useState('');
    const [returnedFrom, setReturnedFrom] = useState('');
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentReturns, setRecentReturns] = useState<ReturnEntry[]>([]);

    useEffect(() => {
        apiGetTransactions({ type: 'in' }).then((txs: any[]) => {
            const returns = txs.filter(tx => tx.returned_from);
            setRecentReturns(returns.map(tx => ({
                id: `RET-${(tx._id ?? '').substring(0, 8).toUpperCase()}`,
                date: (tx.date ?? '').split('T')[0],
                productName: tx.item_name ?? 'Матеріал',
                sku: tx.sku,
                unit: tx.unit,
                quantity: tx.quantity ?? 0,
                returnedFrom: tx.returned_from ?? '',
            })));
        }).catch(() => {});
    }, []);

    const selectedProductData = items.find(p => p._id === selectedProduct);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const item = items.find(p => p._id === selectedProduct);
        if (!item) return;
        const qty = parseInt(quantity);
        if (!qty || qty < 1) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();

            // Return to stock: increment current_stock, reset status to available
            await updateItem(item._id, {
                current_stock: item.current_stock + qty,
                status: 'available',
                issued_to: null,
                issued_date: null,
            });

            await apiCreateTransaction({
                type: 'in',
                product_id: item._id,
                item_name: item.name,
                sku: item.sku,
                unit: item.unit,
                quantity: qty,
                date: now,
                user_id: user?._id || '',
                notes: notes || `Повернення від ${returnedFrom}`,
                returned_from: returnedFrom,
            });

            setRecentReturns(prev => [{
                id: `RET-${Math.floor(Math.random() * 9000) + 1000}`,
                date: now.split('T')[0],
                productName: item.name,
                sku: item.sku,
                unit: item.unit,
                quantity: qty,
                returnedFrom,
            }, ...prev]);

            await refetch();

            setSuccessMessage(`${qty} шт. "${item.name}" повернено на склад від ${returnedFrom}.`);
            setTimeout(() => setSuccessMessage(''), 5000);

            setSelectedProduct('');
            setQuantity('');
            setReturnedFrom('');
            setNotes('');
        } catch (err: any) {
            setSuccessMessage(`Помилка: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('returns.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('returns.subtitle')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-50 rounded-full flex items-center justify-center opacity-50 pointer-events-none">
                        <Undo2 size={64} className="text-teal-200" />
                    </div>

                    {successMessage && (
                        <div className="mb-5 p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-teal-600 mt-0.5 shrink-0" />
                            <p className="text-sm font-medium text-teal-800">{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('returns.field.item')}</label>
                            <select
                                required
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            >
                                <option value="" disabled>{t('returns.placeholder.item')}</option>
                                {items.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.name} (SKU: {p.sku}) — {p.current_stock} {p.unit} {t('returns.inStock')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('returns.field.quantity')}</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    disabled={!selectedProduct}
                                    className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                                    placeholder="e.g. 2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('returns.field.returnedFrom')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <UserCheck className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={returnedFrom}
                                        onChange={(e) => setReturnedFrom(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                                        placeholder={t('returns.placeholder.returnedFrom')}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('returns.field.notes')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none">
                                    <ClipboardPenLine className="h-4 w-4 text-slate-400" />
                                </div>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all min-h-[80px]"
                                    placeholder={t('returns.placeholder.notes')}
                                />
                            </div>
                        </div>

                        {selectedProductData && (
                            <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg text-sm text-teal-800 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-teal-500 shrink-0" />
                                <span>
                                    <strong>{selectedProductData.name}</strong> — {t('returns.currentStock')}: <strong>{selectedProductData.current_stock} {selectedProductData.unit}</strong>
                                </span>
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={!selectedProduct || isSubmitting}
                                className="px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 focus:ring-4 focus:ring-teal-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-600/20"
                            >
                                <Undo2 size={20} />
                                {isSubmitting ? 'Збереження...' : t('returns.btn.submit')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="w-full xl:w-80">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[400px]">
                    <div className="p-4 border-b border-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-teal-500" size={18} />
                            {t('returns.history.title')}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {recentReturns.length > 0 ? (
                            <div className="space-y-2">
                                {recentReturns.map(ret => (
                                    <div key={ret.id} className="p-3 bg-white border border-slate-100 rounded-lg hover:border-teal-200 transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded uppercase">{ret.id}</span>
                                            <span className="text-[10px] text-slate-400 italic font-mono">{ret.date}</span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">{ret.productName}</p>
                                        <p className="text-[10px] text-slate-500 mt-1 mb-2">
                                            {ret.quantity} шт. • Від: {ret.returnedFrom}
                                        </p>
                                        <button
                                            onClick={() => downloadReturnActPDF({ docId: ret.id, date: ret.date, itemName: ret.productName, sku: ret.sku, unit: ret.unit, quantity: ret.quantity, returnedFrom: ret.returnedFrom })}
                                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-teal-600 border border-teal-100 rounded-md hover:bg-teal-50 transition-colors"
                                        >
                                            <FileDown size={11} /> Завантажити акт
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 py-10 text-center">
                                <Undo2 size={40} className="mb-2" />
                                <p className="text-xs">{t('returns.history.empty')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Returns;
