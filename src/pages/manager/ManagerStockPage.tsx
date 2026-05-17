import { useState, useMemo } from 'react';
import { Search, PackageSearch, AlertTriangle, TrendingDown, Layers, DollarSign, XCircle } from 'lucide-react';
import { useItems } from '../../context/ItemsContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateItemName, translateUnit, translateCategory } from '../../utils/translateItem';

// ── Stock level helpers ────────────────────────────────────────────────────────
function stockLevel(current: number, min: number): 'empty' | 'low' | 'ok' {
    if (current === 0) return 'empty';
    if (current < min) return 'low';
    return 'ok';
}

const LEVEL_BADGE: Record<string, string> = {
    ok:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    low:   'bg-amber-50  text-amber-700  border-amber-200',
    empty: 'bg-red-50    text-red-700    border-red-200',
};

const STATUS_BADGE: Record<string, string> = {
    available:   'bg-green-50  text-green-700',
    issued:      'bg-blue-50   text-blue-700',
    written_off: 'bg-slate-100 text-slate-500',
    damaged:     'bg-red-50    text-red-600',
};

// ── Component ─────────────────────────────────────────────────────────────────
const ManagerStockPage = () => {
    const { t, language } = useLanguage();
    const { items, loading } = useItems();

    const [search,        setSearch]        = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter,  setStatusFilter]  = useState('');
    const [levelFilter,   setLevelFilter]   = useState<'' | 'ok' | 'low' | 'empty'>('');

    // ── Derived data ───────────────────────────────────────────────────────────
    const categories = useMemo(() =>
        [...new Set(items.map(i => i.category))].sort(),
    [items]);

    const stats = useMemo(() => {
        const total      = items.length;
        const totalValue = items.reduce((s, i) => s + i.current_stock * (i.unit_price ?? 0), 0);
        const lowCount   = items.filter(i => i.current_stock < i.min_stock).length;
        const catCount   = new Set(items.map(i => i.category)).size;
        return { total, totalValue, lowCount, catCount };
    }, [items]);

    // Category breakdown for stats row
    const categoryStats = useMemo(() =>
        categories.map(cat => {
            const group = items.filter(i => i.category === cat);
            const total = group.reduce((s, i) => s + i.current_stock, 0);
            const low   = group.filter(i => i.current_stock < i.min_stock).length;
            return { cat, count: group.length, total, low };
        }),
    [categories, items]);

    // ── Filtered rows ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return items.filter(item => {
            const matchSearch = !q ||
                item.name.toLowerCase().includes(q) ||
                item.sku.toLowerCase().includes(q) ||
                item.category.toLowerCase().includes(q);
            const matchCat    = !categoryFilter || item.category === categoryFilter;
            const matchStatus = !statusFilter   || item.status === statusFilter;
            const lvl = stockLevel(item.current_stock, item.min_stock);
            const matchLevel  = !levelFilter    || lvl === levelFilter;
            return matchSearch && matchCat && matchStatus && matchLevel;
        });
    }, [items, search, categoryFilter, statusFilter, levelFilter]);

    const clearFilters = () => {
        setSearch(''); setCategoryFilter(''); setStatusFilter(''); setLevelFilter('');
    };
    const hasFilters = !!(search || categoryFilter || statusFilter || levelFilter);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <PackageSearch size={22} className="text-blue-600" />
                    {t('mstock.title')}
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">{t('mstock.subtitle')}</p>
            </div>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Layers size={18} className="text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">{t('mstock.card.total')}</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.total}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('mstock.card.positions')}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <DollarSign size={18} className="text-emerald-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">{t('mstock.card.totalValue')}</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">
                        {stats.totalValue.toLocaleString('uk-UA', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">грн</p>
                </div>

                <div
                    className={`bg-white rounded-xl border shadow-sm p-5 cursor-pointer transition-all ${levelFilter === 'low' || levelFilter === 'empty' ? 'border-amber-300 ring-2 ring-amber-200' : 'border-slate-100 hover:border-amber-200'}`}
                    onClick={() => setLevelFilter(prev => (prev === 'low' ? '' : 'low'))}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                            <TrendingDown size={18} className="text-amber-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">{t('mstock.card.lowStock')}</span>
                    </div>
                    <p className={`text-3xl font-black ${stats.lowCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                        {stats.lowCount}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{t('mstock.card.items')}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                            <PackageSearch size={18} className="text-violet-600" />
                        </div>
                        <span className="text-sm font-medium text-slate-500">{t('mstock.card.categories')}</span>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{stats.catCount}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('mstock.card.positions')}</p>
                </div>
            </div>

            {/* ── Category breakdown ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
                <div className="flex gap-2 p-4 min-w-0">
                    <button
                        onClick={() => setCategoryFilter('')}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!categoryFilter ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {t('mstock.filter.all')}
                    </button>
                    {categoryStats.map(({ cat, count, low }) => (
                        <button key={cat}
                            onClick={() => setCategoryFilter(prev => prev === cat ? '' : cat)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <span>{translateCategory(cat, language)}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>{count}</span>
                            {low > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-500">
                                    <AlertTriangle size={10} /> {low}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Filters bar + Table ── */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('mstock.search')}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                        <option value="">{t('mstock.filter.allStatuses')}</option>
                        <option value="available">{t('status.available')}</option>
                        <option value="issued">{t('status.issued')}</option>
                        <option value="damaged">{t('status.damaged')}</option>
                        <option value="written_off">{t('status.written_off')}</option>
                    </select>

                    {/* Stock level filter */}
                    <select
                        value={levelFilter}
                        onChange={e => setLevelFilter(e.target.value as any)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                        <option value="">Всі рівні запасів</option>
                        <option value="ok">{t('mstock.status.ok')}</option>
                        <option value="low">{t('mstock.status.low')}</option>
                        <option value="empty">{t('mstock.status.empty')}</option>
                    </select>

                    {/* Clear filters */}
                    {hasFilters && (
                        <button onClick={clearFilters}
                            className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-500 transition-colors">
                            <XCircle size={15} /> Скинути
                        </button>
                    )}

                    <span className="ml-auto text-sm text-slate-400 whitespace-nowrap">
                        {filtered.length} / {items.length} {t('mstock.positions')}
                    </span>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="p-12 text-center text-slate-400">{t('mstock.loading')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('mstock.table.name')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('mstock.table.sku')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('mstock.table.category')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('mstock.table.current')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('mstock.table.min')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase">{t('mstock.table.status')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('mstock.table.price')}</th>
                                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('mstock.table.value')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-slate-400 text-sm">
                                            {t('mstock.noResults')}
                                        </td>
                                    </tr>
                                ) : filtered.map(item => {
                                    const lvl   = stockLevel(item.current_stock, item.min_stock);
                                    const value = item.current_stock * (item.unit_price ?? 0);
                                    return (
                                        <tr key={item._id}
                                            className={`hover:bg-slate-50/60 transition-colors ${lvl === 'empty' ? 'bg-red-50/30' : lvl === 'low' ? 'bg-amber-50/20' : ''}`}>
                                            <td className="px-5 py-3 text-sm font-medium text-slate-800">
                                                <div className="flex items-center gap-2">
                                                    {lvl !== 'ok' && (
                                                        <AlertTriangle size={13} className={lvl === 'empty' ? 'text-red-500 shrink-0' : 'text-amber-500 shrink-0'} />
                                                    )}
                                                    {translateItemName(item.name, language)}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-xs text-slate-500 font-mono">{item.sku}</td>
                                            <td className="px-5 py-3">
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{translateCategory(item.category, language)}</span>
                                            </td>
                                            <td className="px-5 py-3 text-sm font-bold text-right">
                                                <span className={lvl === 'empty' ? 'text-red-600' : lvl === 'low' ? 'text-amber-600' : 'text-slate-800'}>
                                                    {item.current_stock}
                                                </span>
                                                <span className="text-xs text-slate-400 ml-1">{translateUnit(item.unit, language)}</span>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-500 text-right">
                                                {item.min_stock}
                                                <span className="text-xs text-slate-400 ml-1">{translateUnit(item.unit, language)}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold w-fit ${LEVEL_BADGE[lvl]}`}>
                                                        {lvl === 'ok' ? t('mstock.status.ok') : lvl === 'low' ? t('mstock.status.low') : t('mstock.status.empty')}
                                                    </span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase w-fit ${STATUS_BADGE[item.status] ?? 'bg-slate-100 text-slate-500'}`}>
                                                        {t(`status.${item.status}`) || item.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-sm text-slate-600 text-right font-mono">
                                                {(item.unit_price ?? 0).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                                            </td>
                                            <td className="px-5 py-3 text-sm font-bold text-slate-700 text-right font-mono">
                                                {value.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerStockPage;
