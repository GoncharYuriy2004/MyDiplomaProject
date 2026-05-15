import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle2, Truck, Trash2 } from 'lucide-react';
import { useItems } from '../../context/ItemsContext';
import { useSuppliers } from '../../context/SupplierContext';
import { useLanguage } from '../../context/LanguageContext';
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
    const { t } = useLanguage();
    const { items } = useItems();
    const { suppliers } = useSuppliers();

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const lowStockItems = items.filter(p => p.current_stock <= p.min_stock);

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
            setQuantity('1');
            setSelectedSupplierId('');
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
                {lowStockItems.length > 0 && (
                    <div className="animate-pulse bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 text-sm font-bold flex items-center gap-2">
                        Low Stock Alert! ({lowStockItems.length})
                    </div>
                )}
            </div>

            {lowStockItems.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-orange-800">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold">Аналіз критичних залишків</p>
                            <p className="text-xs">Виявлено {lowStockItems.length} товарів нижче норми.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {lowStockItems.map(item => (
                            <button
                                key={item._id}
                                onClick={() => { setSelectedItemId(item._id); setQuantity((item.min_stock * 2).toString()); }}
                                className="px-3 py-1.5 bg-white border border-orange-200 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors shadow-sm"
                            >
                                Поповнити {item.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* PO List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-700">{t('procurement.list.title')}</h3>
                    </div>
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Завантаження...</div>
                    ) : orders.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Замовлень ще немає</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {orders.map((order) => (
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

                {/* Quick New Request Form */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 h-fit">
                    <h3 className="font-semibold text-slate-700 mb-4 pb-4 border-b border-slate-100">{t('procurement.form.title')}</h3>
                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.product')}</label>
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">{t('procurement.form.product.placeholder')}</option>
                                {items.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} (на складі: {p.current_stock} {p.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.quantity')}</label>
                            <input
                                type="number" min="1" value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('procurement.form.supplier')}</label>
                            <select
                                value={selectedSupplierId}
                                onChange={(e) => setSelectedSupplierId(e.target.value)}
                                className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">— Оберіть постачальника —</option>
                                {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name}</option>
                                ))}
                            </select>
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
