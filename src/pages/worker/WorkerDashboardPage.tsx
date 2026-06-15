import { useState } from 'react';
import { Search } from 'lucide-react';
import { useItems } from '../../context/ItemsContext';
import { useLanguage } from '../../context/LanguageContext';
import { translateItemName, translateUnit } from '../../utils/translateItem';

const statusColor: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  issued:      'bg-blue-100 text-blue-700',
  written_off: 'bg-slate-200 text-slate-600',
  damaged:     'bg-red-100 text-red-700',
};

const WorkerDashboardPage = () => {
    const { t, language } = useLanguage();
    const { items, loading } = useItems();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered = items.filter(item => {
        const q = search.toLowerCase();
        const matchSearch = !q ||
            item.name.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q);
        const matchStatus = !statusFilter || item.status === statusFilter;
        return matchSearch && matchStatus;
    });



    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center">
                    <h3 className="text-lg font-bold text-slate-800 mr-auto">{t('dashboard.inventoryTitle')}</h3>

                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 focus:ring-2 focus:ring-blue-400 outline-none"
                    >
                        <option value="">{t('dashboard.allStatuses')}</option>
                        <option value="available">{t('status.available')}</option>
                        <option value="issued">{t('status.issued')}</option>
                        <option value="damaged">{t('status.damaged')}</option>
                        <option value="written_off">{t('status.written_off')}</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('dashboard.searchPlaceholder')}
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-72 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                    </div>

                    <span className="text-sm text-slate-400 whitespace-nowrap">
                        {filtered.length} / {items.length} {t('dashboard.positions')}
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">{t('dashboard.loading')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableName')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableSku')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableCategory')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableStatus')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('mstock.table.price')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('dashboard.tableStock')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            {t('dashboard.noResults')}
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{translateItemName(item.name, language)}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.sku}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {t(`status.${item.status}`) || item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 text-right">
                                            {item.unit_price != null ? `${item.unit_price.toFixed(2)} ₴` : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                                            {item.current_stock} {translateUnit(item.unit, language)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkerDashboardPage;
