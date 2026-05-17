import { useState } from 'react';
import { FileDown, FileText, CheckCircle2, Clock, XCircle, Package, AlertTriangle, ClipboardList, RefreshCw, Search, Trash2 } from 'lucide-react';
import { downloadInvoicePDF } from '../../utils/pdfGenerator';
import { useLanguage } from '../../context/LanguageContext';
import { useDocuments } from '../../context/DocumentsContext';

type FilterType = 'all' | 'issuing' | 'act_writeoff' | 'discrepancy_act' | 'invoice';

const FILTERS: { key: FilterType; labelKey: string }[] = [
    { key: 'all',             labelKey: 'acts.filter.all' },
    { key: 'issuing',         labelKey: 'acts.filter.issuing' },
    { key: 'act_writeoff',    labelKey: 'acts.filter.writeoff' },
    { key: 'discrepancy_act', labelKey: 'acts.filter.discrepancy' },
    { key: 'invoice',         labelKey: 'acts.filter.invoices' },
];

const Acts = () => {
    const { t } = useLanguage();
    const { documents, loading, refetch, deleteDocument } = useDocuments();
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm('Видалити документ? Дію неможливо скасувати.')) return;
        setDeletingId(id);
        try { await deleteDocument(id); } finally { setDeletingId(null); }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try { await refetch(); } finally { setRefreshing(false); }
    };

    const filteredDocs = documents.filter(doc => {
        const matchType = activeFilter === 'all' || doc.type === activeFilter;
        if (!matchType) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            getDocType(doc.type).toLowerCase().includes(q) ||
            doc._id.toLowerCase().includes(q) ||
            (doc.recipient   && String(doc.recipient).toLowerCase().includes(q)) ||
            (doc.item_name   && String(doc.item_name).toLowerCase().includes(q)) ||
            (doc.reason      && String(doc.reason).toLowerCase().includes(q)) ||
            (doc.notes       && String(doc.notes).toLowerCase().includes(q)) ||
            (doc.created_at  && new Date(doc.created_at).toLocaleString('uk-UA').toLowerCase().includes(q))
        );
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <Clock size={12} /> {t('acts.status.pending')}
                    </span>
                );
            case 'approved':
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle2 size={12} /> {t('acts.status.approved')}
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <XCircle size={12} /> {t('acts.status.rejected')}
                    </span>
                );
            default:
                return null;
        }
    };

    const getDocIcon = (type: string) => {
        switch (type) {
            case 'issuing':         return <Package size={20} />;
            case 'act_writeoff':    return <AlertTriangle size={20} />;
            case 'discrepancy_act': return <ClipboardList size={20} />;
            default:                return <FileText size={20} />;
        }
    };

    const getDocIconColor = (type: string) => {
        switch (type) {
            case 'issuing':         return 'bg-green-50 text-green-600';
            case 'act_writeoff':    return 'bg-orange-50 text-orange-600';
            case 'discrepancy_act': return 'bg-purple-50 text-purple-600';
            default:                return 'bg-blue-50 text-blue-600';
        }
    };

    const getDocType = (type: string) => {
        switch (type) {
            case 'issuing':         return t('acts.type.issuing');
            case 'invoice':         return t('acts.type.invoice');
            case 'act_writeoff':    return t('acts.type.writeOff');
            case 'discrepancy_act': return t('acts.type.discrepancy');
            default:                return t('acts.type.default');
        }
    };

    const getDocSubtitle = (doc: any) => {
        switch (doc.type) {
            case 'issuing':
                return [
                    doc.item_name && `📦 ${doc.item_name}`,
                    doc.quantity  && `${doc.quantity} ${doc.unit ?? 'шт'}`,
                    doc.recipient && `→ ${doc.recipient}`,
                ].filter(Boolean).join(' · ') || t('acts.details.noValue');
            case 'act_writeoff':
                return [
                    doc.item_name && `📦 ${doc.item_name}`,
                    doc.quantity  && `${doc.quantity} ${doc.unit ?? 'шт'}`,
                    doc.reason    && `Причина: ${String(doc.reason).slice(0, 40)}${doc.reason?.length > 40 ? '…' : ''}`,
                ].filter(Boolean).join(' · ') || t('acts.details.noValue');
            case 'discrepancy_act': {
                const count = Array.isArray(doc.discrepancies) ? doc.discrepancies.length : 0;
                return `Розбіжностей: ${count} позиц.`;
            }
            case 'invoice':
                return doc.total_sum
                    ? `${t('acts.details.total')}: ${doc.total_sum.toLocaleString()} ₴${doc.total_vat ? ` (ПДВ: ${doc.total_vat.toLocaleString()} ₴)` : ''}`
                    : t('acts.details.noValue');
            default:
                return doc.total_sum
                    ? `${t('acts.details.total')}: ${doc.total_sum.toLocaleString()} ₴`
                    : t('acts.details.noValue');
        }
    };

    const counts: Record<FilterType, number> = {
        all:             documents.length,
        issuing:         documents.filter(d => d.type === 'issuing').length,
        act_writeoff:    documents.filter(d => d.type === 'act_writeoff').length,
        discrepancy_act: documents.filter(d => d.type === 'discrepancy_act').length,
        invoice:         documents.filter(d => d.type === 'invoice').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('acts.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('acts.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">
                        Всього: <span className="font-semibold text-slate-600">{documents.length}</span>
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
                        Оновити
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                {/* Filter tabs */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex gap-1 overflow-x-auto">
                    {FILTERS.map(({ key, labelKey }) => (
                        <button
                            key={key}
                            onClick={() => setActiveFilter(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                                activeFilter === key
                                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                            }`}
                        >
                            {t(labelKey as any)}
                            {counts[key] > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeFilter === key ? 'bg-slate-100 text-slate-600' : 'bg-slate-200 text-slate-500'
                                }`}>
                                    {counts[key]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search bar */}
                <div className="px-6 py-3 border-b border-slate-100 bg-white flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('acts.search') || 'Пошук по типу, ID, отримувачу, МтаК...'}
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
                            Знайдено: <span className="font-semibold text-slate-700">{filteredDocs.length}</span>
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Завантаження...</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredDocs.map((doc) => (
                            <div
                                key={doc._id}
                                className="p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors gap-4"
                            >
                                <div className="flex items-start gap-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${getDocIconColor(doc.type)}`}>
                                        {getDocIcon(doc.type)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                            {getDocType(doc.type)}
                                            <span className="text-slate-400 font-mono text-xs">
                                                #{doc._id.slice(-8).toUpperCase()}
                                            </span>
                                            {getStatusBadge(doc.status)}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {t('acts.details.created')}: {new Date(doc.created_at).toLocaleString('uk-UA')}
                                        </p>
                                        <p className="text-xs text-slate-600 mt-0.5 truncate">
                                            {getDocSubtitle(doc)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => downloadInvoicePDF(doc)}
                                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all"
                                    >
                                        <FileDown size={15} className="text-slate-400" />
                                        {t('acts.btn.download')}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(doc._id)}
                                        disabled={deletingId === doc._id}
                                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                                        title="Видалити документ"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filteredDocs.length === 0 && (
                            <div className="p-12 text-center">
                                <FileText size={36} className="mx-auto mb-3 text-slate-200" />
                                <p className="text-slate-400 font-medium">Документів не знайдено</p>
                                <p className="text-slate-300 text-xs mt-1">
                                    {searchQuery
                                        ? `Немає збігів для «${searchQuery}»`
                                        : activeFilter !== 'all'
                                            ? 'Спробуйте змінити фільтр'
                                            : 'Документи з\'являться після операцій у порталі працівника'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Acts;
