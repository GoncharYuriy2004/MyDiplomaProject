import { useState, useEffect, useCallback } from 'react';
import {
    Wrench, CheckCircle2, XCircle, Clock, RefreshCw,
    Hash, FileText, User, PackageMinus, AlertTriangle,
    ShoppingBag, ChevronRight, Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useItems } from '../../context/ItemsContext';
import {
    apiGetDetailRequests,
    apiApproveDetailRequest,
    apiRejectDetailRequest,
    apiCreateTransaction,
    apiCreateDocument,
    type DetailRequest,
} from '../../utils/api';

const STATUS_STYLES: Record<string, { badge: string; dot: string; label: string }> = {
    CREATED:  { badge: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-400',   label: 'Новий'     },
    APPROVED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400', label: 'Схвалено'  },
    REJECTED: { badge: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-400',     label: 'Відхилено' },
};

function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function shortId(id: string | null | undefined) {
    if (!id) return '—';
    return id.length > 10 ? `…${id.slice(-6)}` : id;
}

type TabFilter = 'ALL' | 'CREATED' | 'APPROVED' | 'REJECTED';

const DetailRequests = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { items, updateItem, refetch } = useItems();

    const [requests, setRequests]     = useState<DetailRequest[]>([]);
    const [loading, setLoading]       = useState(true);
    const [tab, setTab]               = useState<TabFilter>('CREATED');
    const [search, setSearch]         = useState('');
    const [selected, setSelected]     = useState<DetailRequest | null>(null);

    // Form state
    const [qty, setQty]               = useState('1');
    const [notes, setNotes]           = useState('');
    const [busy, setBusy]             = useState(false);
    const [msg, setMsg]               = useState<{ text: string; ok: boolean } | null>(null);

    const load = useCallback(() => {
        setLoading(true);
        apiGetDetailRequests()
            .then(data => { setRequests(data); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { load(); }, [load]);

    // When selecting a request — reset form
    const selectRequest = (req: DetailRequest) => {
        setSelected(req);
        setQty('1');
        setNotes('');
        setMsg(null);
    };

    // Find warehouse item by SKU (detail_needs)
    const warehouseItem = selected
        ? items.find(it => it.sku === selected.detail_needs && it.status !== 'written_off') ?? null
        : null;

    const inStock = warehouseItem?.current_stock ?? 0;

    const showMsg = (text: string, ok: boolean) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 5000);
    };

    // Issue + Approve
    const handleIssue = async () => {
        if (!selected || !warehouseItem) return;
        const qtyNum = parseInt(qty);
        if (!qtyNum || qtyNum < 1 || qtyNum > inStock) {
            showMsg(`Кількість має бути від 1 до ${inStock}`, false);
            return;
        }
        setBusy(true);
        try {
            const now = new Date().toISOString();

            await updateItem(warehouseItem._id, {
                current_stock: inStock - qtyNum,
                status: inStock - qtyNum === 0 ? 'issued' : 'available',
                issued_date: now,
                issued_by:   user?._id || '',
                issued_to:   `Запит: ${selected.detail_needs}`,
            });

            await apiCreateTransaction({
                type:       'out',
                product_id: warehouseItem._id,
                quantity:   qtyNum,
                date:       now,
                user_id:    user?._id || '',
                notes:      notes || `Видача за запитом деталі ${selected.detail_needs}`,
            });

            await apiCreateDocument({
                type:       'issuing',
                status:     'approved',
                created_at: now,
                created_by: user?._id || '',
                item_id:    warehouseItem._id,
                item_name:  warehouseItem.name,
                sku:        warehouseItem.sku,
                unit:       warehouseItem.unit,
                unit_price: warehouseItem.unit_price,
                quantity:   qtyNum,
                recipient:  `Запит деталі: ${selected.detail_needs}`,
                notes:      notes || '',
            });

            await refetch();

            const updated = await apiApproveDetailRequest(selected._id, user?.full_name ?? 'Працівник');
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            setSelected(updated);
            showMsg(`Видано ${qtyNum} × ${warehouseItem.name}. Запит схвалено.`, true);
        } catch (e: any) {
            showMsg(e.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    // Approve only (no stock)
    const handleApproveOnly = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await apiApproveDetailRequest(selected._id, user?.full_name ?? 'Працівник');
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            setSelected(updated);
            showMsg('Запит схвалено без видачі.', true);
        } catch (e: any) {
            showMsg(e.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    // Reject
    const handleReject = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await apiRejectDetailRequest(selected._id, user?.full_name ?? 'Працівник');
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            setSelected(updated);
            showMsg('Запит відхилено.', false);
        } catch (e: any) {
            showMsg(e.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    const tabs: { key: TabFilter; label: string }[] = [
        { key: 'CREATED',  label: 'Нові' },
        { key: 'ALL',      label: 'Усі' },
        { key: 'APPROVED', label: 'Схвалені' },
        { key: 'REJECTED', label: 'Відхилені' },
    ];

    const filtered = requests
        .filter(r => tab === 'ALL' || r.status === tab)
        .filter(r =>
            !search ||
            r.detail_needs?.toLowerCase().includes(search.toLowerCase()) ||
            r.explanation?.toLowerCase().includes(search.toLowerCase())
        );

    const counts: Record<TabFilter, number> = {
        ALL:      requests.length,
        CREATED:  requests.filter(r => r.status === 'CREATED').length,
        APPROVED: requests.filter(r => r.status === 'APPROVED').length,
        REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    };

    return (
        <div className="flex flex-col h-full gap-0">
            {/* ── Page header ── */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Wrench size={22} className="text-violet-600" />
                        Запити на деталі — Видача
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Оберіть запит ліворуч → опрацюйте та видайте товар праворуч
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Оновити
                </button>
            </div>

            {/* ── Split layout ── */}
            <div className="flex gap-4 flex-1 min-h-0" style={{ height: 'calc(100vh - 180px)' }}>

                {/* ════ LEFT: Request list ════ */}
                <div className="w-80 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden shrink-0">
                    {/* Tabs */}
                    <div className="p-3 border-b border-slate-100 space-y-2">
                        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                            {tabs.map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setTab(key)}
                                    className={`flex-1 text-[11px] font-semibold py-1 rounded-md transition-all ${
                                        tab === key ? 'bg-white shadow text-violet-700' : 'text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {label}
                                    {counts[key] > 0 && (
                                        <span className={`ml-1 text-[10px] px-1 py-0.5 rounded-full ${tab === key ? 'bg-violet-100 text-violet-600' : 'bg-slate-200 text-slate-400'}`}>
                                            {counts[key]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Пошук за SKU або описом..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 outline-none"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {loading ? (
                            <div className="flex justify-center py-8 text-slate-400">
                                <RefreshCw size={20} className="animate-spin" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-xs">Запитів немає</div>
                        ) : filtered.map(req => {
                            const s = STATUS_STYLES[req.status];
                            const isActive = selected?._id === req._id;
                            return (
                                <button
                                    key={req._id}
                                    onClick={() => selectRequest(req)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        isActive
                                            ? 'border-violet-300 bg-violet-50 shadow-sm'
                                            : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                            {s.label}
                                        </span>
                                        <ChevronRight size={14} className={isActive ? 'text-violet-500' : 'text-slate-300'} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 font-mono truncate">{req.detail_needs || '—'}</p>
                                    {req.explanation && (
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{req.explanation}</p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1">{fmtDate(req.created_at)}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ════ RIGHT: Work panel ════ */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Wrench size={48} className="opacity-15" />
                            <p className="text-sm">Оберіть запит зі списку</p>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLES[selected.status].badge}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[selected.status].dot}`} />
                                                {STATUS_STYLES[selected.status].label}
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">{shortId(selected._id)}</span>
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 font-mono">{selected.detail_needs}</p>
                                        {selected.explanation && (
                                            <p className="text-sm text-slate-500 mt-0.5">{selected.explanation}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Meta row */}
                                <div className="flex flex-wrap gap-4 mt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <User size={13} className="text-slate-400" />
                                        Спеціаліст: <span className="font-mono font-medium">{shortId(selected.specialist_id)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <ShoppingBag size={13} className="text-slate-400" />
                                        Замовлення: <span className="font-mono font-medium">{shortId(selected.order_id)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <Clock size={13} className="text-slate-400" />
                                        {fmtDate(selected.created_at)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Warehouse match */}
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Hash size={13} /> Товар на складі (за SKU)
                                    </p>
                                    {warehouseItem ? (
                                        <div className={`p-4 rounded-xl border-2 ${inStock > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                            <p className="font-bold text-slate-800">{warehouseItem.name}</p>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                                                <span className="text-slate-500">SKU: <span className="font-mono font-medium">{warehouseItem.sku}</span></span>
                                                <span className="text-slate-500">Категорія: <span className="font-medium">{warehouseItem.category}</span></span>
                                                <span className="text-slate-500">Ціна: <span className="font-medium">{warehouseItem.unit_price} грн</span></span>
                                                <span className={`font-bold ${inStock > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    На складі: {inStock} {warehouseItem.unit}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50 text-sm text-red-700">
                                            <AlertTriangle size={18} className="shrink-0" />
                                            Товар зі SKU <span className="font-mono font-bold mx-1">{selected.detail_needs}</span> не знайдено у вашому складі
                                        </div>
                                    )}
                                </div>

                                {/* Already processed */}
                                {selected.status !== 'CREATED' ? (
                                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                                        selected.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                                    }`}>
                                        {selected.status === 'APPROVED'
                                            ? <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                                            : <XCircle size={20} className="text-red-600 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-bold text-sm ${selected.status === 'APPROVED' ? 'text-emerald-800' : 'text-red-800'}`}>
                                                {selected.status === 'APPROVED' ? 'Запит вже схвалено' : 'Запит відхилено'}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {selected.approved_by} · {fmtDate(selected.approved_at)}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Issuance form */}
                                        {warehouseItem && inStock > 0 && (
                                            <div className="space-y-4">
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <PackageMinus size={13} /> Видача
                                                </p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                                            Кількість <span className="text-slate-400 font-normal">(макс. {inStock})</span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max={inStock}
                                                            value={qty}
                                                            onChange={e => setQty(e.target.value)}
                                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-1">Одиниця</label>
                                                        <div className="px-3 py-2 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-600">
                                                            {warehouseItem.unit}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                                        <FileText size={13} className="inline mr-1" />
                                                        Примітка (необов'язково)
                                                    </label>
                                                    <textarea
                                                        value={notes}
                                                        onChange={e => setNotes(e.target.value)}
                                                        rows={2}
                                                        placeholder={`Видача: ${warehouseItem.name} за запитом...`}
                                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Message */}
                                        {msg && (
                                            <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                                                msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                                            }`}>
                                                {msg.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                                                {msg.text}
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex gap-3 pt-2">
                                            {warehouseItem && inStock > 0 && (
                                                <button
                                                    onClick={handleIssue}
                                                    disabled={busy}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                                                >
                                                    <PackageMinus size={18} />
                                                    {busy ? 'Виконується...' : 'Видати та схвалити'}
                                                </button>
                                            )}
                                            {(!warehouseItem || inStock === 0) && (
                                                <button
                                                    onClick={handleApproveOnly}
                                                    disabled={busy}
                                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                                                >
                                                    <CheckCircle2 size={18} />
                                                    {busy ? 'Виконується...' : 'Схвалити без видачі'}
                                                </button>
                                            )}
                                            <button
                                                onClick={handleReject}
                                                disabled={busy}
                                                className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
                                            >
                                                <XCircle size={18} />
                                                Відхилити
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DetailRequests;
