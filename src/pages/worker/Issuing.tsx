import { useState, useEffect, useCallback } from 'react';
import {
    PackageMinus, UserCheck, ClipboardPenLine, FileText,
    Search, CheckCircle2, XCircle, RefreshCw, Wrench,
    Hash, AlertTriangle, ChevronRight, FileDown, Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useItems } from '../../context/ItemsContext';
import {
    apiCreateTransaction, apiCreateDocument, apiGetDocuments,
    apiGetDetailRequests, apiApproveDetailRequest, apiRejectDetailRequest,
    apiGetUsers,
    type DetailRequest,
} from '../../utils/api';
import { downloadIssuingActPDF } from '../../utils/pdfGenerator';
import { translateItemName, translateUnit } from '../../utils/translateItem';

// ── Status style helpers (labels injected via t() inside component) ───────────
const S_STYLE = {
    CREATED:  { badge: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-400'   },
    APPROVED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' },
    REJECTED: { badge: 'bg-red-50 text-red-700 border-red-200',            dot: 'bg-red-400'     },
} as const;

type TabFilter = 'CREATED' | 'ALL' | 'APPROVED' | 'REJECTED';

function fmtDate(iso: string | null | undefined) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function shortId(id: string | null | undefined) {
    if (!id) return '—';
    return id.length > 10 ? `…${id.slice(-6)}` : id;
}

type IssuedDoc = {
    id: string; date: string; itemName: string;
    sku?: string; unit?: string; unitPrice?: number;
    quantity: number; recipient: string; notes?: string;
};

// ═════════════════════════════════════════════════════════════════════════════
const Issuing = () => {
    const { user }                      = useAuth();
    const { t, language }               = useLanguage();
    const { items, updateItem, refetch } = useItems();

    const statusLabel = (s: 'CREATED' | 'APPROVED' | 'REJECTED') =>
        s === 'CREATED' ? t('issuing.status.new') : s === 'APPROVED' ? t('issuing.status.approved') : t('issuing.status.rejected');

    // ── Detail requests ───────────────────────────────────────────────────────
    const [requests, setRequests]       = useState<DetailRequest[]>([]);
    const [reqLoading, setReqLoading]   = useState(true);
    const [tab, setTab]                 = useState<TabFilter>('CREATED');
    const [reqSearch, setReqSearch]     = useState('');
    const [selected, setSelected]       = useState<DetailRequest | null>(null);

    // ── Issuance form ─────────────────────────────────────────────────────────
    const [selectedItem, setSelectedItem] = useState('');
    const [itemSearch, setItemSearch]     = useState('');
    const [itemDropOpen, setItemDropOpen] = useState(false);
    const [quantity, setQuantity]         = useState('1');
    const [recipient, setRecipient]       = useState('');
    const [notes, setNotes]               = useState('');
    const [busy, setBusy]                 = useState(false);
    const [msg, setMsg]                   = useState<{ text: string; ok: boolean } | null>(null);

    // ── Users (recipient dropdown) ────────────────────────────────────────────
    const [users, setUsers]                   = useState<{ _id: string; login: string; full_name: string; account_status?: string }[]>([]);
    const [recipientSearch, setRecipientSearch] = useState('');
    const [recipientDropOpen, setRecipientDropOpen] = useState(false);

    // ── Archive ───────────────────────────────────────────────────────────────
    const [archive, setArchive]           = useState<IssuedDoc[]>([]);
    const [archSearch, setArchSearch]     = useState('');

    // ── Load requests ─────────────────────────────────────────────────────────
    const loadRequests = useCallback(() => {
        setReqLoading(true);
        apiGetDetailRequests()
            .then(setRequests)
            .catch(() => {})
            .finally(() => setReqLoading(false));
    }, []);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    // ── Load users ────────────────────────────────────────────────────────────
    useEffect(() => {
        apiGetUsers().then((data: any[]) => {
            setUsers(data.filter(u => !u.account_status || u.account_status === 'ACTIVE'));
        }).catch(() => {});
    }, []);

    // ── Load archive ──────────────────────────────────────────────────────────
    useEffect(() => {
        apiGetDocuments({ type: 'issuing' }).then((docs: any[]) => {
            setArchive(docs.map(d => ({
                id:        (d._id ?? '').substring(0, 8),
                date:      (d.created_at ?? '').split('T')[0],
                itemName:  d.item_name ?? '—',
                sku:       d.sku,
                unit:      d.unit,
                unitPrice: d.unit_price,
                quantity:  d.quantity ?? 1,
                recipient: d.recipient ?? '—',
                notes:     d.notes,
            })));
        }).catch(() => {});
    }, []);

    // ── Select request → prefill form ─────────────────────────────────────────
    const selectRequest = (req: DetailRequest) => {
        setSelected(req);
        setMsg(null);
    };

    // Prefill form whenever selected request changes
    useEffect(() => {
        if (!selected) return;
        const match = items.find(it => it.sku === selected.detail_needs && it.status !== 'written_off');
        setSelectedItem(match?._id ?? '');
        setItemSearch(match ? `${translateItemName(match.name, language)} (${match.sku})` : '');
        setItemDropOpen(false);
        setQuantity('1');
        setRecipient('');
        setRecipientSearch('');
        setNotes(selected.explanation || '');
        setMsg(null);
    }, [selected?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    const clearRequest = () => {
        setSelected(null);
        setSelectedItem('');
        setItemSearch('');
        setItemDropOpen(false);
        setQuantity('1');
        setRecipient('');
        setRecipientSearch('');
        setRecipientDropOpen(false);
        setNotes('');
        setMsg(null);
    };

    // ── Item search helpers ───────────────────────────────────────────────────
    const filteredItems = items.filter(it =>
        it.status !== 'written_off' && (
            !itemSearch ||
            it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
            it.sku.toLowerCase().includes(itemSearch.toLowerCase())
        )
    );

    const selectItemById = (id: string) => {
        const it = items.find(i => i._id === id);
        setSelectedItem(id);
        setItemSearch(it ? `${translateItemName(it.name, language)} (${it.sku})` : '');
        setItemDropOpen(false);
    };

    // ── Current item data ─────────────────────────────────────────────────────
    const itemData     = items.find(i => i._id === selectedItem);
    const inStock      = itemData?.current_stock ?? 0;
    const fromRequest  = selected !== null;
    const warehouseMatch = selected
        ? items.find(it => it.sku === selected.detail_needs && it.status !== 'written_off')
        : null;

    const showMsg = (text: string, ok: boolean) => {
        setMsg({ text, ok });
        setTimeout(() => setMsg(null), 6000);
    };

    // ── Submit: issue (+ optionally approve request) ─────────────────────────
    const handleIssue = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!itemData) return;
        const qty = parseInt(quantity);
        if (!qty || qty < 1) { showMsg(t('issuing.err.invalidQty'), false); return; }
        if (qty > inStock)   { showMsg(t('issuing.err.notEnough').replace('{{count}}', String(inStock)), false); return; }

        setBusy(true);
        try {
            const now = new Date().toISOString();
            const recipientValue = fromRequest
                ? `Запит: ${selected!.detail_needs}`
                : recipient;

            await updateItem(itemData._id, {
                current_stock: inStock - qty,
                status:        inStock - qty === 0 ? 'issued' : 'available',
                issued_date:   now,
                issued_by:     user?._id || '',
                issued_to:     recipientValue,
            });

            await apiCreateTransaction({
                type:       'out',
                product_id: itemData._id,
                quantity:   qty,
                date:       now,
                user_id:    user?._id || '',
                notes:      `Видача: ${itemData.name} → ${recipientValue}`,
            });

            const doc = await apiCreateDocument({
                type:       'issuing',
                status:     'approved',
                created_at: now,
                created_by: user?._id || '',
                item_id:    itemData._id,
                item_name:  itemData.name,
                sku:        itemData.sku,
                unit:       itemData.unit,
                unit_price: itemData.unit_price,
                quantity:   qty,
                recipient:  recipientValue,
                notes:      fromRequest ? (selected?.explanation || '') : notes,
            });

            await refetch();

            // If issuing from a request — approve it
            if (selected && selected.status === 'CREATED') {
                const updated = await apiApproveDetailRequest(selected._id, user?.full_name ?? 'Працівник');
                setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
                setSelected(updated);
            }

            setArchive(prev => [{
                id:        (doc._id ?? '').substring(0, 8),
                date:      now.split('T')[0],
                itemName:  itemData.name,
                sku:       itemData.sku,
                unit:      itemData.unit,
                unitPrice: itemData.unit_price,
                quantity:  qty,
                recipient: recipientValue,
                notes:     fromRequest ? (selected?.explanation || undefined) : (notes || undefined),
            }, ...prev]);

            showMsg(
                fromRequest
                    ? t('issuing.msg.issuedFromRequest').replace('{{qty}}', String(qty)).replace('{{name}}', itemData.name)
                    : t('issuing.msg.issued').replace('{{qty}}', String(qty)).replace('{{name}}', itemData.name).replace('{{recipient}}', recipient),
                true
            );

            if (!fromRequest) {
                setSelectedItem(''); setItemSearch(''); setQuantity('1'); setRecipient(''); setRecipientSearch(''); setNotes('');
            } else {
                setQuantity('1');
            }
        } catch (err: any) {
            showMsg(err.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    // ── Approve without issuing ───────────────────────────────────────────────
    const handleApproveOnly = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await apiApproveDetailRequest(selected._id, user?.full_name ?? 'Працівник');
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            setSelected(updated);
            showMsg(t('issuing.msg.approvedOnly'), true);
        } catch (err: any) {
            showMsg(err.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    // ── Reject request ────────────────────────────────────────────────────────
    const handleReject = async () => {
        if (!selected) return;
        setBusy(true);
        try {
            const updated = await apiRejectDetailRequest(selected._id, user?.full_name ?? 'Працівник');
            setRequests(prev => prev.map(r => r._id === updated._id ? updated : r));
            setSelected(updated);
            showMsg(t('issuing.msg.rejected'), false);
        } catch (err: any) {
            showMsg(err.message ?? 'Помилка', false);
        } finally {
            setBusy(false);
        }
    };

    // ── Filtered requests list ────────────────────────────────────────────────
    const filteredReqs = requests
        .filter(r => tab === 'ALL' || r.status === tab)
        .filter(r =>
            !reqSearch ||
            r.detail_needs?.toLowerCase().includes(reqSearch.toLowerCase()) ||
            r.explanation?.toLowerCase().includes(reqSearch.toLowerCase())
        );

    const counts = {
        CREATED:  requests.filter(r => r.status === 'CREATED').length,
        ALL:      requests.length,
        APPROVED: requests.filter(r => r.status === 'APPROVED').length,
        REJECTED: requests.filter(r => r.status === 'REJECTED').length,
    };

    const filteredArchive = archive.filter(d =>
        !archSearch ||
        d.itemName.toLowerCase().includes(archSearch.toLowerCase()) ||
        d.recipient.toLowerCase().includes(archSearch.toLowerCase())
    );

    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 80px)' }}>
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <PackageMinus size={22} className="text-blue-600" />
                        {t('issuing.pageTitle')}
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">{t('issuing.pageSubtitle')}</p>
                </div>
                <button onClick={loadRequests} disabled={reqLoading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                    <RefreshCw size={15} className={reqLoading ? 'animate-spin' : ''} />
                    {t('issuing.btn.refresh')}
                </button>
            </div>

            {/* Three-column layout */}
            <div className="flex gap-4 flex-1 min-h-0">

                {/* ══ COL 1: Request list ══════════════════════════════════════ */}
                <div className="w-72 shrink-0 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench size={12} /> {t('issuing.col.requests')}
                        </p>
                        {/* Tabs */}
                        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                            {(['CREATED','ALL','APPROVED','REJECTED'] as TabFilter[]).map(k => (
                                <button key={k} onClick={() => setTab(k)}
                                    className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${tab === k ? 'bg-white shadow text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {k === 'CREATED' ? t('issuing.tab.new') : k === 'ALL' ? t('issuing.tab.all') : k === 'APPROVED' ? t('issuing.tab.approved') : t('issuing.tab.rejected')}
                                    {counts[k] > 0 && <span className="ml-0.5 text-[9px]">({counts[k]})</span>}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={reqSearch} onChange={e => setReqSearch(e.target.value)}
                                placeholder={t('issuing.placeholder.search')} type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 outline-none" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {/* Manual mode button */}
                        <button onClick={clearRequest}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${!selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}>
                            <span className="font-bold flex items-center gap-1.5">
                                <PackageMinus size={12} /> {t('issuing.manual.title')}
                            </span>
                            <span className="text-[10px] opacity-70">{t('issuing.manual.subtitle')}</span>
                        </button>

                        {reqLoading ? (
                            <div className="flex justify-center py-6"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>
                        ) : filteredReqs.length === 0 ? (
                            <p className="text-center text-[11px] text-slate-400 py-4">{t('issuing.requests.empty')}</p>
                        ) : filteredReqs.map(req => {
                            const s = S_STYLE[req.status];
                            const isActive = selected?._id === req._id;
                            return (
                                <button key={req._id} onClick={() => selectRequest(req)}
                                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${s.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{statusLabel(req.status)}
                                        </span>
                                        <ChevronRight size={12} className={isActive ? 'text-violet-500' : 'text-slate-300'} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 font-mono truncate">{req.detail_needs || '—'}</p>
                                    {req.explanation && <p className="text-[10px] text-slate-500 truncate">{req.explanation}</p>}
                                    <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(req.created_at)}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ══ COL 2: Issuance form ═════════════════════════════════════ */}
                <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Form header */}
                    <div className="p-5 border-b border-slate-100 shrink-0">
                        {selected ? (
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Wrench size={15} className="text-violet-500" />
                                    <span className="text-sm font-bold text-slate-700">{t('issuing.request.label')}</span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${S_STYLE[selected.status].badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${S_STYLE[selected.status].dot}`} />
                                        {statusLabel(selected.status)}
                                    </span>
                                </div>
                                <p className="text-lg font-bold font-mono text-slate-800">{selected.detail_needs}</p>
                                {selected.explanation && <p className="text-sm text-slate-500">{selected.explanation}</p>}
                                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                    <span>{t('issuing.request.specialist')}: <span className="font-mono">{shortId(selected.specialist_id)}</span></span>
                                    <span>{t('issuing.request.order')}: <span className="font-mono">{shortId(selected.order_id)}</span></span>
                                    <span>{fmtDate(selected.created_at)}</span>
                                </div>
                                {selected.status === 'CREATED' && warehouseMatch && (
                                    <div className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${warehouseMatch.current_stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                        {warehouseMatch.current_stock > 0
                                            ? <><CheckCircle2 size={13} /> {t('issuing.request.foundInStock')}: <strong>{translateItemName(warehouseMatch.name, language)}</strong> — {warehouseMatch.current_stock} {translateUnit(warehouseMatch.unit, language)}</>
                                            : <><AlertTriangle size={13} /> {t('issuing.request.zeroStock')}</>
                                        }
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <PackageMinus size={18} className="text-blue-500" />
                                <div>
                                    <p className="font-bold text-slate-800">{t('issuing.form.title')}</p>
                                    <p className="text-xs text-slate-500">{t('issuing.form.subtitle')}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Form body */}
                    <div className="flex-1 overflow-y-auto p-5">
                        {/* Already processed */}
                        {selected && selected.status !== 'CREATED' ? (
                            <div className={`p-5 rounded-xl border-2 flex items-start gap-4 ${selected.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                                {selected.status === 'APPROVED'
                                    ? <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                                    : <XCircle size={24} className="text-red-600 shrink-0" />}
                                <div>
                                    <p className={`font-bold ${selected.status === 'APPROVED' ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {selected.status === 'APPROVED' ? t('issuing.processed.approved') : t('issuing.processed.rejected')}
                                    </p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                        <Clock size={13} /> {selected.approved_by} · {fmtDate(selected.approved_at)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form key={selected?._id ?? 'manual'} onSubmit={handleIssue} className="space-y-4">
                                {/* Item selector with search */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('issuing.field.item')}</label>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            value={itemSearch}
                                            onChange={e => { setItemSearch(e.target.value); setSelectedItem(''); setItemDropOpen(true); }}
                                            onFocus={() => setItemDropOpen(true)}
                                            onBlur={() => setTimeout(() => setItemDropOpen(false), 150)}
                                            placeholder={t('issuing.placeholder.item')}
                                            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        {selectedItem && (
                                            <button type="button" onMouseDown={() => { setSelectedItem(''); setItemSearch(''); setItemDropOpen(true); }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                <XCircle size={15} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Dropdown */}
                                    {itemDropOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                                            {filteredItems.length === 0 ? (
                                                <p className="text-xs text-slate-400 text-center py-4">{t('issuing.item.noResults')}</p>
                                            ) : filteredItems.map(it => (
                                                <button key={it._id} type="button"
                                                    onMouseDown={() => selectItemById(it._id)}
                                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2 ${it.current_stock === 0 ? 'opacity-50' : ''}`}>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-slate-800 truncate">{translateItemName(it.name, language)}</p>
                                                        <p className="text-[11px] text-slate-400 font-mono">{it.sku}</p>
                                                    </div>
                                                    <span className={`text-[11px] font-bold shrink-0 px-1.5 py-0.5 rounded ${it.current_stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                        {it.current_stock} {translateUnit(it.unit, language)}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {itemData && (
                                        <p className={`text-xs mt-1 font-medium ${inStock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {t('issuing.item.inStock')}: {inStock} {translateUnit(itemData.unit, language)} · {itemData.unit_price} грн/{translateUnit('шт', language)}
                                        </p>
                                    )}
                                </div>

                                {/* Quantity (editable always) + Recipient */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {t('issuing.field.quantity')} {itemData && <span className="text-slate-400 font-normal">({t('issuing.field.quantity.max')} {inStock})</span>}
                                        </label>
                                        <input type="number" required min="1" max={inStock || undefined}
                                            value={quantity} onChange={e => setQuantity(e.target.value)}
                                            disabled={!selectedItem}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('issuing.field.recipient')}</label>
                                        {fromRequest ? (
                                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                                                <UserCheck size={14} className="text-slate-400 shrink-0" />
                                                <span className="font-mono truncate">{selected?.detail_needs}</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <UserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={recipientSearch || recipient}
                                                    onChange={e => {
                                                        setRecipientSearch(e.target.value);
                                                        setRecipient('');
                                                        setRecipientDropOpen(true);
                                                    }}
                                                    onFocus={() => setRecipientDropOpen(true)}
                                                    onBlur={() => setTimeout(() => setRecipientDropOpen(false), 150)}
                                                    placeholder={t('issuing.placeholder.recipient')}
                                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                                {/* Hidden input for form validation when user selected */}
                                                <input type="hidden" value={recipient} />

                                                {/* Dropdown */}
                                                {recipientDropOpen && (
                                                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                        {users.filter(u => {
                                                            const q = (recipientSearch || '').toLowerCase();
                                                            return !q ||
                                                                (u.full_name ?? '').toLowerCase().includes(q) ||
                                                                u.login.toLowerCase().includes(q);
                                                        }).length === 0 ? (
                                                            <p className="text-xs text-slate-400 text-center py-3">{t('issuing.item.noResults')}</p>
                                                        ) : users.filter(u => {
                                                            const q = (recipientSearch || '').toLowerCase();
                                                            return !q ||
                                                                (u.full_name ?? '').toLowerCase().includes(q) ||
                                                                u.login.toLowerCase().includes(q);
                                                        }).map(u => (
                                                            <button key={u._id} type="button"
                                                                onMouseDown={() => {
                                                                    const name = u.full_name || u.login;
                                                                    setRecipient(name);
                                                                    setRecipientSearch(name);
                                                                    setRecipientDropOpen(false);
                                                                }}
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2">
                                                                <UserCheck size={13} className="text-slate-400 shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-slate-800 truncate">{u.full_name || u.login}</p>
                                                                    <p className="text-[11px] text-slate-400 font-mono">{u.login}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <ClipboardPenLine size={13} className="inline mr-1" />
                                        {t('issuing.field.notes')} {fromRequest && <span className="text-slate-400 font-normal text-xs">{t('issuing.notes.fromRequest')}</span>}
                                    </label>
                                    {fromRequest ? (
                                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[60px]">
                                            {selected?.explanation || <span className="text-slate-400 italic">{t('issuing.notes.empty')}</span>}
                                        </div>
                                    ) : (
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                            placeholder={t('issuing.placeholder.notes')}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                    )}
                                </div>

                                {/* Message */}
                                {msg && (
                                    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                        {msg.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
                                        {msg.text}
                                    </div>
                                )}

                                {/* Buttons */}
                                <div className="flex gap-3 pt-1">
                                    <button type="submit" disabled={!selectedItem || busy}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-slate-800/20">
                                        <PackageMinus size={18} />
                                        {busy ? t('issuing.busy.issuing') : fromRequest ? t('issuing.btn.issueAndApprove') : t('issuing.btn.issue')}
                                    </button>



                                    {fromRequest && selected?.status === 'CREATED' && (
                                        <button type="button" onClick={handleReject} disabled={busy}
                                            className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                                            <XCircle size={16} />
                                            {t('issuing.btn.reject')}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ══ COL 3: Archive ═══════════════════════════════════════════ */}
                <div className="w-72 shrink-0 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText size={12} /> {t('issuing.col.archive')}
                        </p>
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={archSearch} onChange={e => setArchSearch(e.target.value)}
                                placeholder={t('issuing.placeholder.search')} type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {filteredArchive.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-50">
                                <FileText size={32} className="mb-2" />
                                <p className="text-xs">{t('issuing.archive.empty')}</p>
                            </div>
                        ) : filteredArchive.map(doc => (
                            <div key={doc.id} className="p-2.5 bg-white border border-slate-100 rounded-lg hover:border-blue-200 transition-all">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">
                                        ISS-{doc.id.substring(0,6).toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">{doc.date}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-700 truncate">{doc.itemName}</p>
                                <p className="text-[10px] text-slate-500 mb-1.5 truncate">{doc.quantity} шт. → {doc.recipient}</p>
                                <button
                                    onClick={() => downloadIssuingActPDF({ docId: doc.id, date: doc.date, itemName: doc.itemName, sku: doc.sku, unit: doc.unit, unitPrice: doc.unitPrice, quantity: doc.quantity, recipient: doc.recipient, notes: doc.notes })}
                                    className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-blue-600 border border-blue-100 rounded-md hover:bg-blue-50 transition-colors">
                                    <FileDown size={10} /> {t('issuing.archive.download')}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Issuing;
