import { useState, useEffect } from 'react';
import { Check, X, AlertCircle, CheckCircle2, ClipboardList, AlertTriangle, UserCheck, RefreshCw, Search, XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentsContext';
import { apiGetUsers, apiActivateUser } from '../../utils/api';

const APPROVAL_CRITERIA: { id: string; label: string; hint: string }[] = [
    {
        id: 'confirmed',
        label: 'Інформацію в документі перевірено та підтверджено',
        hint: 'Усі дані документа відповідають фактичному стану',
    },
    {
        id: 'justified',
        label: 'Підстава для проведення операції є достатньою',
        hint: 'Причина та обставини операції документально підтверджені',
    },
    {
        id: 'commission',
        label: 'Акт розглянуто комісією та відповідає вимогам',
        hint: 'Інвентаризаційна комісія ознайомлена з документом',
    },
    {
        id: 'signature',
        label: 'Накласти цифровий підпис та печатку відповідального',
        hint: 'Ваш підпис підтверджує юридичну силу документа',
    },
];

const Approvals = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { documents, loading, approveDocument, removeDocument, refetch } = useDocuments();

    const [approvingDoc, setApprovingDoc] = useState<any | null>(null);
    const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
    const [busy, setBusy] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ── Pending user registrations ────────────────────────────────────────
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);

    const loadPendingUsers = () => {
        setUsersLoading(true);
        apiGetUsers()
            .then((all: any[]) => setPendingUsers(all.filter(u => u.account_status === 'REGISTRATION')))
            .catch(() => {})
            .finally(() => setUsersLoading(false));
    };

    useEffect(() => { loadPendingUsers(); }, []);

    const handleActivateUser = async (uid: string) => {
        setBusy(true);
        try {
            await apiActivateUser(uid);
            setPendingUsers(prev => prev.filter(u => u._id !== uid));
        } catch { /* ignore */ }
        finally { setBusy(false); }
    };

    const pendingDocs = documents.filter(doc => {
        const isPending = doc.status === 'pending' && (doc.type === 'act_writeoff' || doc.type === 'discrepancy_act');
        if (!isPending) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            getDocTypeName(doc.type).toLowerCase().includes(q) ||
            doc._id.toLowerCase().includes(q) ||
            (doc.item_name  && String(doc.item_name).toLowerCase().includes(q)) ||
            (doc.reason     && String(doc.reason).toLowerCase().includes(q)) ||
            (doc.notes      && String(doc.notes).toLowerCase().includes(q)) ||
            (doc.created_at && new Date(doc.created_at).toLocaleString('uk-UA').toLowerCase().includes(q))
        );
    });

    const allChecked = APPROVAL_CRITERIA.every(c => checkedCriteria[c.id]);

    const openModal = (doc: any) => {
        setApprovingDoc(doc);
        setCheckedCriteria({});
    };

    const closeModal = () => {
        setApprovingDoc(null);
        setCheckedCriteria({});
    };

    const toggleCriteria = (id: string) => {
        setCheckedCriteria(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirmApproval = async () => {
        if (!allChecked || !approvingDoc) return;
        setBusy(true);
        try {
            await approveDocument(approvingDoc._id);
            await refetch();
        } finally {
            closeModal();
            setBusy(false);
        }
    };

    const handleReject = async (id: string) => {
        setBusy(true);
        try {
            await removeDocument(id);
            await refetch();
        } finally {
            setBusy(false);
        }
    };

    const getDocIcon = (type: string) => {
        if (type === 'discrepancy_act') return <ClipboardList size={24} />;
        return <AlertTriangle size={24} />;
    };

    const getDocIconBg = (type: string) => {
        if (type === 'discrepancy_act') return 'bg-purple-50 text-purple-500';
        return 'bg-amber-50 text-amber-500';
    };

    const getDocTypeName = (type: string) => {
        if (type === 'discrepancy_act') return 'Акт інвентаризації';
        return 'Запит на списання';
    };

    const getDocDetails = (doc: any) => {
        if (doc.type === 'discrepancy_act') {
            const count = Array.isArray(doc.discrepancies) ? doc.discrepancies.length : 0;
            return `Виявлено розбіжностей: ${count} позиц.`;
        }
        return [
            doc.item_name && `📦 ${doc.item_name}`,
            doc.quantity  && `${doc.quantity} ${doc.unit ?? 'шт'}`,
            doc.reason    && `Причина: ${String(doc.reason).slice(0, 60)}${doc.reason?.length > 60 ? '…' : ''}`,
        ].filter(Boolean).join(' · ') || '—';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('approvals.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('approvals.subtitle')}</p>
                </div>
                {pendingDocs.length > 0 && (
                    <span className="bg-amber-100 text-amber-700 text-sm font-bold px-3 py-1 rounded-full">
                        {pendingDocs.length} очікує
                    </span>
                )}
            </div>

            {/* Approval Modal */}
            {approvingDoc && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
                        {/* Modal header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle2 className="text-blue-600" size={20} />
                                Офіційне затвердження документа
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Document info */}
                        <div className="px-5 pt-4 pb-2">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-sm">
                                <div className="flex items-center gap-2 font-bold text-slate-700">
                                    <AlertCircle size={15} className="text-amber-500" />
                                    {getDocTypeName(approvingDoc.type)} #{approvingDoc._id.slice(-8).toUpperCase()}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono space-y-0.5 pt-1">
                                    <p>Дата: {new Date(approvingDoc.created_at).toLocaleString('uk-UA')}</p>
                                    <p>Відповідальний: <span className="font-semibold text-slate-700">{user?.full_name || user?.username || '—'}</span></p>
                                    <p className="text-slate-600 pt-1">{getDocDetails(approvingDoc)}</p>
                                </div>
                            </div>
                        </div>

                        {/* 4 criteria */}
                        <div className="px-5 py-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Критерії затвердження ({Object.values(checkedCriteria).filter(Boolean).length}/{APPROVAL_CRITERIA.length})
                            </p>
                            {APPROVAL_CRITERIA.map((criterion, idx) => {
                                const checked = !!checkedCriteria[criterion.id];
                                return (
                                    <label
                                        key={criterion.id}
                                        className={`flex items-start gap-3 cursor-pointer p-3 border rounded-xl transition-all ${
                                            checked
                                                ? 'border-blue-200 bg-blue-50/50'
                                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="relative mt-0.5 shrink-0">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={checked}
                                                onChange={() => toggleCriteria(criterion.id)}
                                            />
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                                checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                            }`}>
                                                {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${checked ? 'text-blue-900' : 'text-slate-700'}`}>
                                                <span className="text-slate-400 mr-1">{idx + 1}.</span>
                                                {criterion.label}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">{criterion.hint}</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Progress bar */}
                        <div className="px-5 pb-2">
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div
                                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(Object.values(checkedCriteria).filter(Boolean).length / APPROVAL_CRITERIA.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors"
                            >
                                Скасувати
                            </button>
                            <button
                                disabled={!allChecked || busy}
                                onClick={handleConfirmApproval}
                                className={`flex-1 px-4 py-2 text-white font-bold rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-2 ${
                                    allChecked && !busy
                                        ? 'bg-blue-600 hover:bg-blue-700'
                                        : 'bg-slate-300 cursor-not-allowed'
                                }`}
                            >
                                <Check size={15} />
                                {busy ? 'Збереження...' : 'Затвердити документ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Pending user activations ── */}
            {(usersLoading || pendingUsers.length > 0) && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <UserCheck size={18} className="text-violet-600" />
                            <h3 className="font-bold text-slate-800">Активація нових акаунтів</h3>
                            {pendingUsers.length > 0 && (
                                <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {pendingUsers.length}
                                </span>
                            )}
                        </div>
                        <button onClick={loadPendingUsers} disabled={usersLoading}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-50">
                            <RefreshCw size={15} className={usersLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {usersLoading ? (
                            <div className="p-6 text-center text-slate-400 text-sm">Завантаження...</div>
                        ) : pendingUsers.map(u => (
                            <div key={u._id} className="px-6 py-4 flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-medium text-slate-800">{u.full_name || u.login}</p>
                                    <p className="text-xs text-slate-400 font-mono">{u.login} · {u.role_in_system === 'WAREHOUSE_WORKER' ? 'Працівник складу' : u.role_in_system}</p>
                                    {u.position && <p className="text-xs text-slate-400">{u.position}</p>}
                                </div>
                                <button
                                    disabled={busy}
                                    onClick={() => handleActivateUser(u._id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0">
                                    <Check size={14} /> Активувати
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Search bar for documents */}
            {!loading && documents.some(d => d.status === 'pending' && (d.type === 'act_writeoff' || d.type === 'discrepancy_act')) && (
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-5 py-3 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Пошук по типу, ID, МтаК, причині..."
                            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-slate-50"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={14} />
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <span className="text-xs text-slate-500">
                            Знайдено: <span className="font-semibold text-slate-700">{pendingDocs.length}</span>
                        </span>
                    )}
                </div>
            )}

            {/* Document list */}
            {loading ? (
                <div className="bg-white rounded-xl p-12 text-center text-slate-400">Завантаження...</div>
            ) : pendingDocs.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                        {searchQuery ? 'Нічого не знайдено' : t('approvals.empty.title')}
                    </h3>
                    <p className="text-slate-500 mt-1 max-w-sm">
                        {searchQuery
                            ? `Немає збігів для «${searchQuery}»`
                            : t('approvals.empty.subtitle')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pendingDocs.map((doc) => (
                        <div
                            key={doc._id}
                            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${getDocIconBg(doc.type)}`}>
                                    {getDocIcon(doc.type)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-800">
                                        {getDocTypeName(doc.type)}{' '}
                                        <span className="font-mono text-slate-400 text-xs">#{doc._id.slice(-8).toUpperCase()}</span>
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-0.5">
                                        {t('approvals.card.requestedOn')} {new Date(doc.created_at).toLocaleString('uk-UA')}
                                    </p>
                                    <div className="mt-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm text-slate-600">
                                        {getDocDetails(doc)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 shrink-0 md:flex-col lg:flex-row">
                                <button
                                    disabled={busy}
                                    onClick={() => handleReject(doc._id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors font-medium text-sm disabled:opacity-50"
                                >
                                    <X size={15} /> {t('approvals.btn.reject')}
                                </button>
                                <button
                                    disabled={busy}
                                    onClick={() => openModal(doc)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                                >
                                    <Check size={15} /> {t('approvals.btn.approve')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Approvals;
