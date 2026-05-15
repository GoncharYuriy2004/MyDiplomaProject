import { useState } from 'react';
import { Search } from 'lucide-react';
import { useItems } from '../../context/ItemsContext';
import { useLanguage } from '../../context/LanguageContext';

const statusColor: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  issued:      'bg-blue-100 text-blue-700',
  written_off: 'bg-slate-200 text-slate-600',
  damaged:     'bg-red-100 text-red-700',
};

const WorkerDashboardPage = () => {
    const { t } = useLanguage();
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

    const categories = [...new Set(items.map(i => i.status))];

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
                        <option value="">Усі статуси</option>
                        <option value="available">Available</option>
                        <option value="issued">Issued</option>
                        <option value="damaged">Damaged</option>
                        <option value="written_off">Written off</option>
                    </select>

                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Пошук за назвою, SKU, категорією..."
                            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-72 focus:ring-2 focus:ring-blue-400 outline-none"
                        />
                    </div>

                    <span className="text-sm text-slate-400 whitespace-nowrap">
                        {filtered.length} / {items.length} {t('dashboard.tableStock') || 'позицій'}
                    </span>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-400">Завантаження...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableName')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableSku')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">{t('dashboard.tableCategory')}</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Статус</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">{t('dashboard.tableStock')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            Нічого не знайдено
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => (
                                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800">{item.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-mono">{item.sku}</td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${statusColor[item.status] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                                            {item.current_stock} {item.unit}
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
