import React, { useState, useEffect } from 'react';
import { Ban, FileWarning, ArrowRight, FileText, Search, CheckCircle2, FileDown, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useItems } from '../../context/ItemsContext';
import { apiCreateTransaction, apiCreateDocument, apiGetDocuments } from '../../utils/api';
import { downloadWriteoffActPDF } from '../../utils/pdfGenerator';
import { translateItemName, translateUnit } from '../../utils/translateItem';

type WriteOffDoc = {
    id: string;
    date: string;
    itemName: string;
    sku?: string;
    unit?: string;
    unitPrice?: number;
    quantity: number;
    reason: string;
    status: string;
};

const WriteOffs = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { items, updateItem, refetch } = useItems();

    const [selectedProduct, setSelectedProduct] = useState('');
    const [itemSearch, setItemSearch]           = useState('');
    const [itemDropOpen, setItemDropOpen]       = useState(false);
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentDocs, setRecentDocs] = useState<WriteOffDoc[]>([]);

    useEffect(() => {
        apiGetDocuments({ type: 'act_writeoff' }).then((docs: any[]) => {
            setRecentDocs(docs.map(d => ({
                id: (d._id ?? '').substring(0, 8),
                date: (d.created_at ?? '').split('T')[0],
                itemName: d.item_name ?? 'Material',
                sku: d.sku,
                unit: d.unit,
                unitPrice: d.unit_price,
                quantity: d.quantity ?? 1,
                reason: d.reason ?? '',
                status: d.status ?? 'pending',
            })));
        }).catch(() => {});
    }, []);

    const selectedProductData = items.find(p => p._id === selectedProduct);

    const filteredItems = items.filter(p =>
        !itemSearch ||
        p.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(itemSearch.toLowerCase())
    );

    const filteredDocs = recentDocs.filter(doc =>
        doc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductData) return;
        const qty = parseInt(quantity);
        if (!qty || qty < 1) return;

        setIsSubmitting(true);
        try {
            const now = new Date().toISOString();
            const newStock = selectedProductData.current_stock - qty;

            // Update item: decrement stock, mark written_off if all gone
            await updateItem(selectedProductData._id, {
                current_stock: newStock < 0 ? 0 : newStock,
                status: newStock <= 0 ? 'written_off' : 'available',
                writeoff_date: now,
                written_off_by: user?._id || '',
                writeoff_reason: reason,
            });

            // Create transaction
            await apiCreateTransaction({
                type: 'write_off',
                product_id: selectedProductData._id,
                quantity: qty,
                date: now,
                user_id: user?._id || '',
                notes: reason,
            });

            // Create write-off act document (pending manager approval)
            const doc = await apiCreateDocument({
                type: 'act_writeoff',
                status: 'pending',
                created_at: now,
                created_by: user?._id || '',
                item_id: selectedProductData._id,
                item_name: selectedProductData.name,
                sku: selectedProductData.sku,
                unit: selectedProductData.unit,
                unit_price: selectedProductData.unit_price,
                quantity: qty,
                reason,
            });

            setRecentDocs(prev => [{
                id: (doc._id ?? '').substring(0, 8),
                date: now.split('T')[0],
                itemName: selectedProductData.name,
                sku: selectedProductData.sku,
                unit: selectedProductData.unit,
                unitPrice: selectedProductData.unit_price,
                quantity: qty,
                reason,
                status: 'pending',
            }, ...prev]);

            await refetch();

            setSuccessMessage(`${qty} шт. "${selectedProductData.name}" списано. Акт очікує підтвердження менеджера.`);
            setTimeout(() => setSuccessMessage(''), 6000);

            setSelectedProduct('');
            setItemSearch('');
            setQuantity('');
            setReason('');
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
                    <h2 className="text-xl font-bold text-slate-800">{t('writeoffs.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('writeoffs.subtitle')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-50 rounded-full flex items-center justify-center opacity-50 pointer-events-none">
                        <Ban size={64} className="text-orange-200" />
                    </div>

                    {successMessage && (
                        <div className="mb-5 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                            <p className="text-sm font-medium text-orange-800">{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex items-start gap-3 text-orange-800 text-sm mb-6">
                            <FileWarning size={18} className="shrink-0 mt-0.5 text-orange-500" />
                            <p>{t('writeoffs.warning')}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('writeoffs.field.item')}</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={itemSearch}
                                    onChange={e => { setItemSearch(e.target.value); setSelectedProduct(''); setItemDropOpen(true); }}
                                    onFocus={() => setItemDropOpen(true)}
                                    onBlur={() => setTimeout(() => setItemDropOpen(false), 150)}
                                    placeholder={t('writeoffs.placeholder.item')}
                                    className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                                {selectedProduct && (
                                    <button type="button"
                                        onMouseDown={() => { setSelectedProduct(''); setItemSearch(''); setItemDropOpen(true); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <XCircle size={15} />
                                    </button>
                                )}
                                {itemDropOpen && (
                                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                        {filteredItems.length === 0 ? (
                                            <p className="text-xs text-slate-400 text-center py-4">Нічого не знайдено</p>
                                        ) : filteredItems.map(p => (
                                            <button key={p._id} type="button"
                                                onMouseDown={() => {
                                                    setSelectedProduct(p._id);
                                                    setItemSearch(`${translateItemName(p.name, language)} (${p.sku})`);
                                                    setItemDropOpen(false);
                                                }}
                                                disabled={p.current_stock === 0}
                                                className={`w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between gap-2 ${p.current_stock === 0 ? 'opacity-40' : ''}`}>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">{translateItemName(p.name, language)}</p>
                                                    <p className="text-[11px] text-slate-400 font-mono">{p.sku}</p>
                                                </div>
                                                <span className={`text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${p.current_stock > 0 ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-600'}`}>
                                                    {p.current_stock} {translateUnit(p.unit, language)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedProductData && (
                                <p className="text-xs mt-1 text-slate-500">
                                    На складі: <span className="font-bold text-orange-700">{selectedProductData.current_stock}</span> {translateUnit(selectedProductData.unit, language)} · {selectedProductData.unit_price} грн/{translateUnit('шт', language)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('writeoffs.field.quantity')}</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={selectedProductData?.current_stock || ''}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all disabled:opacity-50 disabled:bg-slate-50"
                                placeholder="e.g. 1"
                                disabled={!selectedProduct}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('writeoffs.field.reason')}</label>
                            <textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all min-h-[100px]"
                                placeholder={t('writeoffs.placeholder.reason')}
                            />
                        </div>

                        <div className="pt-4 flex flex-wrap gap-3">
                            <button
                                type="submit"
                                disabled={!selectedProduct || isSubmitting}
                                className="px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-100 transition-all flex items-center justify-center gap-2 shadow-sm shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Збереження...' : t('writeoffs.btn.submit')}
                                {!isSubmitting && <ArrowRight size={16} />}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="w-full xl:w-96 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-full min-h-[400px]">
                    <div className="p-4 border-b border-slate-50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="text-orange-500" size={18} />
                            Архів актів списання
                        </h3>
                    </div>

                    <div className="p-4 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Пошук за ID або назвою..."
                                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
                        {filteredDocs.length > 0 ? (
                            <div className="space-y-2">
                                {filteredDocs.map(doc => (
                                    <div key={doc.id} className="p-3 bg-white border border-slate-100 rounded-lg hover:border-orange-200 hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded uppercase">ACT-{doc.id.substring(0,6).toUpperCase()}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${doc.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {doc.status === 'approved' ? 'Затверджено' : 'Очікує'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 mb-0.5">{doc.itemName}</p>
                                        <p className="text-[10px] text-slate-500 mb-2">{doc.quantity} шт. · {doc.date}</p>
                                        <button
                                            onClick={() => downloadWriteoffActPDF({ docId: doc.id, date: doc.date, itemName: doc.itemName, sku: doc.sku, unit: doc.unit, unitPrice: doc.unitPrice, quantity: doc.quantity, reason: doc.reason, status: doc.status })}
                                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-orange-600 border border-orange-100 rounded-md hover:bg-orange-50 transition-colors"
                                        >
                                            <FileDown size={11} /> Завантажити акт
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40 py-10">
                                <FileText size={40} className="mb-2" />
                                <p className="text-xs">За вашим запитом актів не знайдено</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WriteOffs;
