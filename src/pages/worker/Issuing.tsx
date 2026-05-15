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
    type DetailRequest,
} from '../../utils/api';
import { downloadIssuingActPDF } from '../../utils/pdfGenerator';

// ── Status helpers ────────────────────────────────────────────────────────────
const S = {
    CREATED:  { badge: 'bg-amber-50 text-amber-700 border-amber-200',     dot: 'bg-amber-400',   label: 'Новий'    },
    APPROVED: { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',dot: 'bg-emerald-400', label: 'Схвалено' },
    REJECTED: { badge: 'bg-red-50 text-red-700 border-red-200',           dot: 'bg-red-400',     label: 'Відхилено'},
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
    const { t }                         = useLanguage();
    const { items, updateItem, refetch } = useItems();

    // ── Detail requests ───────────────────────────────────────────────────────
    const [requests, setRequests]       = useState<DetailRequest[]>([]);
    const [reqLoading, setReqLoading]   = useState(true);
    const [tab, setTab]                 = useState<TabFilter>('CREATED');
    const [reqSearch, setReqSearch]     = useState('');
    const [selected, setSelected]       = useState<DetailRequest | null>(null);

    // ── Issuance form ─────────────────────────────────────────────────────────
    const [selectedItem, setSelectedItem] = useState('');
    const [quantity, setQuantity]         = useState('1');
    const [recipient, setRecipient]       = useState('');
    const [notes, setNotes]               = useState('');
    const [busy, setBusy]                 = useState(false);
    const [msg, setMsg]                   = useState<{ text: string; ok: boolean } | null>(null);

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
        setQuantity('1');
        setRecipient('');
        setNotes(selected.explanation || '');
        setMsg(null);
    }, [selected?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    const clearRequest = () => {
        setSelected(null);
        setSelectedItem('');
        setQuantity('1');
        setRecipient('');
        setNotes('');
        setMsg(null);
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
        if (!qty || qty < 1) { showMsg('Вкажіть коректну кількість', false); return; }
        if (qty > inStock)   { showMsg(`Недостатньо на складі (є: ${inStock})`, false); return; }

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
                    ? `✓ Видано ${qty} × ${itemData.name}. Запит схвалено.`
                    : `✓ Видано ${qty} × ${itemData.name} → ${recipient}.`,
                true
            );

            if (!fromRequest) {
                setSelectedItem(''); setQuantity('1'); setRecipient(''); setNotes('');
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
            showMsg('Запит схвалено без видачі.', true);
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
            showMsg('Запит відхилено.', false);
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
                        Видача &amp; Запити на деталі
                    </h2>
                    <p className="text-slate-500 text-sm mt-0.5">
                        Оберіть запит зі списку або видайте товар вручну
                    </p>
                </div>
                <button onClick={loadRequests} disabled={reqLoading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
                    <RefreshCw size={15} className={reqLoading ? 'animate-spin' : ''} />
                    Оновити запити
                </button>
            </div>

            {/* Three-column layout */}
            <div className="flex gap-4 flex-1 min-h-0">

                {/* ══ COL 1: Request list ══════════════════════════════════════ */}
                <div className="w-72 shrink-0 flex flex-col bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-100 space-y-2 shrink-0">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Wrench size={12} /> Вхідні запити
                        </p>
                        {/* Tabs */}
                        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                            {(['CREATED','ALL','APPROVED','REJECTED'] as TabFilter[]).map(k => (
                                <button key={k} onClick={() => setTab(k)}
                                    className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-all ${tab === k ? 'bg-white shadow text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {k === 'CREATED' ? 'Нові' : k === 'ALL' ? 'Всі' : k === 'APPROVED' ? '✓' : '✕'}
                                    {counts[k] > 0 && <span className="ml-0.5 text-[9px]">({counts[k]})</span>}
                                </button>
                            ))}
                        </div>
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={reqSearch} onChange={e => setReqSearch(e.target.value)}
                                placeholder="Пошук..." type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-400 outline-none" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {/* Manual mode button */}
                        <button onClick={clearRequest}
                            className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${!selected ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}>
                            <span className="font-bold flex items-center gap-1.5">
                                <PackageMinus size={12} /> Ручна видача
                            </span>
                            <span className="text-[10px] opacity-70">без прив'язки до запиту</span>
                        </button>

                        {reqLoading ? (
                            <div className="flex justify-center py-6"><RefreshCw size={18} className="animate-spin text-slate-300" /></div>
                        ) : filteredReqs.length === 0 ? (
                            <p className="text-center text-[11px] text-slate-400 py-4">Запитів немає</p>
                        ) : filteredReqs.map(req => {
                            const s = S[req.status];
                            const isActive = selected?._id === req._id;
                            return (
                                <button key={req._id} onClick={() => selectRequest(req)}
                                    className={`w-full text-left p-2.5 rounded-lg border transition-all ${isActive ? 'border-violet-300 bg-violet-50' : 'border-slate-100 hover:border-violet-200 hover:bg-slate-50'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${s.badge}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
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
                                    <span className="text-sm font-bold text-slate-700">Запит на деталь</span>
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${S[selected.status].badge}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${S[selected.status].dot}`} />
                                        {S[selected.status].label}
                                    </span>
                                </div>
                                <p className="text-lg font-bold font-mono text-slate-800">{selected.detail_needs}</p>
                                {selected.explanation && <p className="text-sm text-slate-500">{selected.explanation}</p>}
                                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                                    <span>Спеціаліст: <span className="font-mono">{shortId(selected.specialist_id)}</span></span>
                                    <span>Замовлення: <span className="font-mono">{shortId(selected.order_id)}</span></span>
                                    <span>{fmtDate(selected.created_at)}</span>
                                </div>
                                {/* Warehouse match banner — shown only when item IS found */}
                                {selected.status === 'CREATED' && warehouseMatch && (
                                    <div className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${warehouseMatch.current_stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                        {warehouseMatch.current_stock > 0
                                            ? <><CheckCircle2 size={13} /> Знайдено на складі: <strong>{warehouseMatch.name}</strong> — {warehouseMatch.current_stock} {warehouseMatch.unit}</>
                                            : <><AlertTriangle size={13} /> Товар є в каталозі, але запас = 0</>
                                        }
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <PackageMinus size={18} className="text-blue-500" />
                                <div>
                                    <p className="font-bold text-slate-800">Ручна видача</p>
                                    <p className="text-xs text-slate-500">Оберіть товар і вкажіть отримувача</p>
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
                                        {selected.status === 'APPROVED' ? 'Запит вже схвалено' : 'Запит відхилено'}
                                    </p>
                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                                        <Clock size={13} /> {selected.approved_by} · {fmtDate(selected.approved_at)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form key={selected?._id ?? 'manual'} onSubmit={handleIssue} className="space-y-4">
                                {/* Item selector */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Товар зі складу</label>
                                    <select required value={selectedItem} onChange={e => setSelectedItem(e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                        <option value="" disabled>Оберіть товар...</option>
                                        {items.map(it => (
                                            <option key={it._id} value={it._id} disabled={it.current_stock === 0}>
                                                {it.name} (SKU: {it.sku}) — {it.current_stock} {it.unit} на складі
                                            </option>
                                        ))}
                                    </select>
                                    {itemData && (
                                        <p className={`text-xs mt-1 font-medium ${inStock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            На складі: {inStock} {itemData.unit} · {itemData.unit_price} грн/шт
                                        </p>
                                    )}
                                </div>

                                {/* Quantity (editable always) + Recipient */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Кількість {itemData && <span className="text-slate-400 font-normal">(макс. {inStock})</span>}
                                        </label>
                                        <input type="number" required min="1" max={inStock || undefined}
                                            value={quantity} onChange={e => setQuantity(e.target.value)}
                                            disabled={!selectedItem}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50 disabled:bg-slate-50" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Отримувач</label>
                                        {fromRequest ? (
                                            <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600">
                                                <UserCheck size={14} className="text-slate-400 shrink-0" />
                                                <span className="font-mono truncate">{selected?.detail_needs}</span>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <UserCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" required value={recipient} onChange={e => setRecipient(e.target.value)}
                                                    placeholder="ПІБ або відділ..."
                                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        <ClipboardPenLine size={13} className="inline mr-1" />
                                        Пояснення {fromRequest && <span className="text-slate-400 font-normal text-xs">(з запиту)</span>}
                                    </label>
                                    {fromRequest ? (
                                        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 min-h-[60px]">
                                            {selected?.explanation || <span className="text-slate-400 italic">Пояснення відсутнє</span>}
                                        </div>
                                    ) : (
                                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                                            placeholder="Необов'язково..."
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
                                        {busy ? 'Виконується...' : fromRequest ? 'Видати та схвалити' : 'Видати'}
                                    </button>



                                    {fromRequest && selected?.status === 'CREATED' && (
                                        <button type="button" onClick={handleReject} disabled={busy}
                                            className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                                            <XCircle size={16} />
                                            Відхилити
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
                            <FileText size={12} /> Архів видач
                        </p>
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={archSearch} onChange={e => setArchSearch(e.target.value)}
                                placeholder="Пошук..." type="text"
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                        {filteredArchive.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400 opacity-50">
                                <FileText size={32} className="mb-2" />
                                <p className="text-xs">Документів немає</p>
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
                                    <FileDown size={10} /> Завантажити акт
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
