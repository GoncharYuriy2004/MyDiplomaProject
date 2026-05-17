import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Clock, CheckCircle2, Truck, Trash2, Search, XCircle } from 'lucide-react';
import { useItems } from '../../context/ItemsContext';
import { useSuppliers } from '../../context/SupplierContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateItemName } from '../../utils/translateItem';
import {
    apiGetProcurement,
    apiCreateProcurement,
    apiUpdateProcurementStatus,
    apiDeleteProcurement,
} from '../../utils/api';

type Order = {
    _id: string;
    item_id: string | null;
    supplier_id: string | null;
    item_name: string;
    supplier_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    status: 'planned' | 'ordered' | 'received';
    date: string;
};

const Procurement = () => {
    const { t, language } = useLanguage();
    const { items, refetch } = useItems();
    const { suppliers } = useSuppliers();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'' | 'planned' | 'ordered' | 'received'>('');

    // Form combobox states
    const [itemSearch, setItemSearch] = useState('');
    const [itemDropOpen, setItemDropOpen] = useState(false);
    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierDropOpen, setSupplierDropOpen] = useState(false);

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchStatus = !statusFilter || o.status === statusFilter;
            if (!matchStatus) return false;
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                o.item_name.toLowerCase().includes(q) ||
                o.supplier_name.toLowerCase().includes(q) ||
                (o.date && o.date.slice(0, 10).includes(q)) ||
                String(o.total).includes(q)
            );
        });
    }, [orders, searchQuery, statusFilter]);

    const lowStockItems = items.filter(p => p.current_stock < p.min_stock);

    useEffect(() => {
        apiGetProcurement()
            .then(data => setOrders(data))
            .catch(() => setErrorMessage('Не вдалося завантажити замовлення'))
            .finally(() => setIsLoading(false));
    }, []);

    const showMessage = (msg: string, isError = false) => {
        if (isError) setErrorMessage(msg);
        else setSuccessMessage(msg);
        setTimeout(() => { setSuccessMessage(''); setErrorMessage(''); }, 3000);
    };

    const handleCreateOrder = async () => {
        if (!selectedItemId) return;
        const qty = parseFloat(quantity);
        if (!qty || qty < 1) return;
        const item = items.find(p => p._id === selectedItemId);
        if (!item) return;
        const supplier = suppliers.find(s => s._id === selectedSupplierId);

        setSubmitting(true);
        try {
            const created = await apiCreateProcurement({
                item_id:       item._id,
                supplier_id:   supplier?._id ?? null,
                item_name:     item.name,
                supplier_name: supplier?.name ?? '—',
                quantity:      qty,
                unit_price:    item.unit_price,
                total:         qty * item.unit_price,
                status:        'planned',
            });
            setOrders(prev => [created, ...prev]);
            setSelectedItemId('');
            setItemSearch('');
            setQuantity('1');
            setSelectedSupplierId('');
            setSupplierSearch('');
            showMessage(t('procurement.msg.created') || 'Замовлення створено!');
        } catch (err: any) {
            showMessage(err.message ?? 'Помилка створення замовлення', true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            const updated = await apiUpdateProcurementStatus(id, newStatus);
            setOrders(prev => prev.map(o => o._id === id ? updated : o));
            // Re-fetch items so stock overview reflects the new quantity immediately
            if (newStatus === 'received') await refetch();
        } catch (err: any) {
            showMessage(err.message ?? 'Помилка оновлення статусу', true);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiDeleteProcurement(id);
            setOrders(prev => prev.filter(o => o._id !== id));
        } catch (err: any) {
            showMessage(err.message ?? 'Помилка видалення', true);
        }
    };

    const getStatusBadge = (order: Order) => {
        const next: Record<string, string> = { planned: 'ordered', ordered: 'received' };
        const badges: Record<string, React.ReactElement> = {
            planned:  <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700"><Clock size={12} /> {t('procurement.status.planned')}</span>,
            ordered:  <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Truck size={12} /> {t('procurement.status.ordered')}</span>,
            received: <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle2 size={12} /> {t('procurement.status.received')}</span>,
        };
        return (
            <div className="flex items-center gap-2">
                {badges[order.status]}
                {next[order.status] && (
                    <button
                        onClick={() => handleStatusChange(order._id, next[order.status])}
                        className="text-xs text-blue-500 hover:underline"
                    >
                        →
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('procurement.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('procurement.subtitle')}</p>
                </div>
            </div>



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PO List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-slate-700">{t('procurement.list.title')}</h3>
                            <span className="text-xs text-slate-400">
                                {filteredOrders.length} / {orders.length}
                            </span>
                        </div>
                        {/* Search + status filter */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Пошук по МтаК, постачальнику, даті..."
                                    className="w-full pl-8 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        <XCircle size={13} />
                                    </button>
                                )}
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:ring-2 focus:ring-blue-400 outline-none"
                            >
                                <option value="">Всі статуси</option>
                                <option value="planned">{t('procurement.status.planned')}</option>
                                <option value="ordered">{t('procurement.status.ordered')}</option>
                                <option value="received">{t('procurement.status.received')}</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Завантаження...</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">
                            {orders.length === 0
                                ? 'Замовлень ще немає'
                                : searchQuery
                                    ? `Немає збігів для «${searchQuery}»`
                                    : 'Немає замовлень з таким статусом'}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => (
                                <div key={order._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="font-bold text-slate-800">{order.item_name}</p>
                                        <p className="text-sm text-slate-500 mt-1">
                                            {order.supplier_name} &bull; {order.quantity} шт. &bull; {order.date?.slice(0, 10)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <p className="font-semibold text-slate-800">{order.total.toLocaleString()} ₴</p>
                                        {getStatusBadge(order)}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(order._id)}
                                        className="ml-4 text-slate-300 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* New Purchase Order Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit">
                    <h3 className="font-semibold text-slate-700 mb-4 pb-4 border-b border-slate-100">{t('procurement.form.title')}</h3>
                    <form className="space-y-4">
                        {/* Item combobox */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.product')}</label>
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={t('procurement.form.product.placeholder')}
                                    value={itemSearch !== '' || itemDropOpen ? itemSearch : (items.find(i => i._id === selectedItemId)?.name ?? '')}
                                    onChange={e => { setItemSearch(e.target.value); setSelectedItemId(''); setItemDropOpen(true); }}
                                    onFocus={() => { setItemSearch(''); setItemDropOpen(true); }}
                                    onBlur={() => setTimeout(() => setItemDropOpen(false), 150)}
                                />
                                {itemDropOpen && (
                                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {items
                                            .filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()))
                                            .map(i => (
                                                <button
                                                    key={i._id}
                                                    type="button"
                                                    onMouseDown={e => { e.preventDefault(); setSelectedItemId(i._id); setItemSearch(''); setItemDropOpen(false); }}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                >
                                                    <span className="font-medium">{i.name}</span>
                                                    <span className="ml-2 text-xs text-slate-400">на складі: {i.current_stock} {i.unit}</span>
                                                </button>
                                            ))}
                                        {items.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                                            <p className="px-3 py-2 text-xs text-slate-400">Нічого не знайдено</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.quantity')}</label>
                            <input
                                type="number" min="1" value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        {/* Supplier combobox */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.supplier')}</label>
                            <div className="relative">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    className="block w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Оберіть постачальника..."
                                    value={supplierSearch !== '' || supplierDropOpen ? supplierSearch : (suppliers.find(s => s._id === selectedSupplierId)?.name ?? '')}
                                    onChange={e => { setSupplierSearch(e.target.value); setSelectedSupplierId(''); setSupplierDropOpen(true); }}
                                    onFocus={() => { setSupplierSearch(''); setSupplierDropOpen(true); }}
                                    onBlur={() => setTimeout(() => setSupplierDropOpen(false), 150)}
                                />
                                {supplierDropOpen && (
                                    <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {suppliers
                                            .filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
                                            .map(s => (
                                                <button
                                                    key={s._id}
                                                    type="button"
                                                    onMouseDown={e => { e.preventDefault(); setSelectedSupplierId(s._id); setSupplierSearch(''); setSupplierDropOpen(false); }}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                >
                                                    <span className="font-medium">{s.name}</span>
                                                    {s.code && <span className="ml-2 text-xs text-slate-400 font-mono">{s.code}</span>}
                                                </button>
                                            ))}
                                        {suppliers.filter(s => !supplierSearch || s.name.toLowerCase().includes(supplierSearch.toLowerCase())).length === 0 && (
                                            <p className="px-3 py-2 text-xs text-slate-400">Нічого не знайдено</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {successMessage && (
                            <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm font-medium">
                                {successMessage}
                            </div>
                        )}
                        {errorMessage && (
                            <div className="text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm font-medium">
                                {errorMessage}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleCreateOrder}
                            disabled={submitting || !selectedItemId}
                            className="w-full bg-slate-800 text-white font-medium py-2 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <Plus size={16} />
                            {submitting ? 'Збереження...' : t('procurement.form.btn.create')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Procurement;
