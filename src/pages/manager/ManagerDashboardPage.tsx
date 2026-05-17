import { useState, useEffect, useMemo } from 'react';
import { useItems } from '../../context/ItemsContext';
import { apiGetStats, apiGetTransactions } from '../../utils/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Package,
    Settings2, FileBarChart, LayoutDashboard, AlertTriangle,
} from 'lucide-react';
import { downloadSummaryReportPDF } from '../../utils/pdfGenerator';
import { useLanguage } from '../../context/LanguageContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const MONTH_LABELS_UK = ['Січ','Лют','Бер','Кві','Тра','Чер','Лип','Сер','Вер','Жов','Лис','Гру'];
const MONTH_LABELS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUARTER_LABELS  = ['Q1','Q2','Q3','Q4'];

type TxType = 'in' | 'out' | 'write_off';
const METRIC_COLOR: Record<TxType, string> = {
    in:        '#10b981',
    out:       '#3b82f6',
    write_off: '#f97316',
};

// ── Component ─────────────────────────────────────────────────────────────────
const ManagerDashboardPage = () => {
    const { t, language } = useLanguage();
    const { items } = useItems();

    const MONTH_LABELS = language === 'uk' ? MONTH_LABELS_UK : MONTH_LABELS_EN;

    const [dateFilter,       setDateFilter]       = useState<'day' | 'month' | 'quarter'>('month');
    const [selectedMetric,   setSelectedMetric]   = useState<TxType>('in');
    const [selectedChartType,setSelectedChartType]= useState<'bar' | 'line' | 'pie'>('bar');
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [transactions,     setTransactions]     = useState<any[]>([]);

    useEffect(() => {
        apiGetStats().then((s: any) => setPendingApprovals(s.pending_approvals ?? 0)).catch(() => {});
        apiGetTransactions().then(setTransactions).catch(() => {});
    }, []);

    // ── Stats computed directly from items (real-time, no stale API cache) ──
    const totalStockValue = useMemo(
        () => items.reduce((s, i) => s + i.current_stock * (i.unit_price ?? 0), 0),
        [items],
    );
    const lowStockCount = useMemo(
        () => items.filter(i => i.current_stock < i.min_stock).length,
        [items],
    );

    // ── Category summary (for pie + table) ────────────────────────────────────
    const categories  = useMemo(() => [...new Set(items.map(p => p.category))].filter(Boolean), [items]);
    const summaryData = useMemo(() => categories.map(cat => {
        const g = items.filter(p => p.category === cat);
        return {
            category:   cat,
            count:      g.length,
            totalStock: g.reduce((a, i) => a + i.current_stock, 0),
            value:      g.reduce((a, i) => a + i.current_stock * (i.unit_price ?? 0), 0),
        };
    }), [categories, items]);

    // ── Transaction totals (for cards) ────────────────────────────────────────
    const txTotals = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const thisYear = transactions.filter(t => new Date(t.date ?? '').getFullYear() === currentYear);
        return {
            in:        thisYear.filter(t => t.type === 'in').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
            out:       thisYear.filter(t => t.type === 'out').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
            write_off: thisYear.filter(t => t.type === 'write_off').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
        };
    }, [transactions]);

    // ── Time-series data for bar/line charts ──────────────────────────────────
    const chartData = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const today = new Date().toISOString().split('T')[0];

        const bucket = (txList: any[]) => ({
            in:        txList.filter(t => t.type === 'in'       ).reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
            out:       txList.filter(t => t.type === 'out'      ).reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
            write_off: txList.filter(t => t.type === 'write_off').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
        });

        if (dateFilter === 'day') {
            const hours = ['08','09','10','11','12','13','14','15','16','17','18'];
            return hours.map(h => {
                const slice = transactions.filter(tx => {
                    const d = tx.date ?? '';
                    return d.startsWith(today) && d.includes(`T${h}`);
                });
                return { name: `${h}:00`, ...bucket(slice) };
            });
        }

        if (dateFilter === 'month') {
            return MONTH_LABELS.map((name, idx) => {
                const slice = transactions.filter(tx => {
                    const d = new Date(tx.date ?? '');
                    return d.getFullYear() === currentYear && d.getMonth() === idx;
                });
                return { name, ...bucket(slice) };
            }).filter(r => r.in > 0 || r.out > 0 || r.write_off > 0);
        }

        // quarter — current year
        return QUARTER_LABELS.map((name, idx) => {
            const slice = transactions.filter(tx => {
                const d = new Date(tx.date ?? '');
                return d.getFullYear() === currentYear && Math.floor(d.getMonth() / 3) === idx;
            });
            return { name: `${name} ${currentYear}`, ...bucket(slice) };
        });
    }, [transactions, dateFilter, MONTH_LABELS]);

    // ── Pie data ──────────────────────────────────────────────────────────────
    const pieData = useMemo(() => {
        if (selectedMetric === 'in' || selectedMetric === 'out' || selectedMetric === 'write_off') {
            // Per-category transaction quantity
            return categories.map(cat => {
                const catItems = items.filter(i => i.category === cat);
                const ids = new Set(catItems.map(i => i._id));
                const qty = transactions
                    .filter(tx => tx.type === selectedMetric && ids.has(tx.item_id))
                    .reduce((s: number, t: any) => s + (t.quantity ?? 0), 0);
                return { category: cat, qty };
            }).filter(r => r.qty > 0);
        }
        return summaryData.map(r => ({ category: r.category, qty: r.totalStock }));
    }, [categories, items, transactions, selectedMetric, summaryData]);

    // ── Render chart ──────────────────────────────────────────────────────────
    const metricLabel = t(`manager.analytics.metric.${selectedMetric}`);
    const metricColor = METRIC_COLOR[selectedMetric];

    const renderChart = () => {
        if (selectedChartType === 'pie') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={100}
                            paddingAngle={5}
                            dataKey="qty"
                            nameKey="category"
                            label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        >
                            {pieData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [v, metricLabel]} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        if (selectedChartType === 'line') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={selectedMetric} stroke={metricColor}
                            name={metricLabel} strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={selectedMetric} fill={metricColor}
                        name={metricLabel} radius={[4, 4, 0, 0]} barSize={36} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                        <LayoutDashboard size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{t('manager.analytics.customTitle')}</h2>
                        <p className="text-slate-500 text-xs">{t('manager.charts.dynamics')}</p>
                    </div>
                </div>
                <button
                    onClick={() => downloadSummaryReportPDF(summaryData, {
                        totalStockValue,
                        lowStockItems:    lowStockCount,
                        pendingApprovals,
                        totalItems:       items.length,
                    })}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md text-sm font-medium"
                >
                    <FileBarChart size={18} />
                    {t('manager.analytics.btn.requestReport')}
                </button>
            </div>

            {/* ── Stats cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* 1. Total stock value */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.totalValue')}</h3>
                        <p className="text-2xl font-bold text-slate-800">
                            {totalStockValue.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                </div>

                {/* 2. Low stock count */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.lowStock')}</h3>
                        <p className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {lowStockCount}
                        </p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        <AlertTriangle size={24} />
                    </div>
                </div>

                {/* 3. Total items */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.totalItems')}</h3>
                        <p className="text-2xl font-bold text-slate-800">{items.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                </div>

                {/* 4. Pending approvals */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.pendingApprovals')}</h3>
                        <p className="text-2xl font-bold text-orange-600">{pendingApprovals}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                        <TrendingDown size={24} />
                    </div>
                </div>
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[450px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">{t('manager.charts.dynamics')}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {selectedChartType !== 'pie' && `${new Date().getFullYear()} · `}
                                {metricLabel}
                            </p>
                        </div>
                        {selectedChartType !== 'pie' && (
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                {(['day', 'month', 'quarter'] as const).map(f => (
                                    <button key={f}
                                        className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${dateFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        onClick={() => setDateFilter(f)}
                                    >{t(`manager.charts.${f}`)}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {chartData.length === 0 && selectedChartType !== 'pie' ? (
                        <div className="h-[350px] flex items-center justify-center text-slate-400 text-sm">
                            Немає даних за вибраний період
                        </div>
                    ) : (
                        <div className="h-[350px] w-full">{renderChart()}</div>
                    )}
                </div>

                {/* Metric / chart type selector */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                        <Settings2 size={20} className="text-slate-400" />
                        <h3 className="font-bold text-slate-700">{t('manager.analytics.selector.metric')}</h3>
                    </div>
                    <div className="space-y-5">
                        {/* Metric */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                {t('manager.analytics.selector.metric')}
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {(['in', 'out', 'write_off'] as TxType[]).map(m => (
                                    <button key={m} onClick={() => setSelectedMetric(m)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedMetric === m ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: METRIC_COLOR[m] }} />
                                            <span className="text-sm font-bold">{t(`manager.analytics.metric.${m}`)}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 ml-4.5">
                                            {language === 'uk'
                                                ? `${new Date().getFullYear()} р.: `
                                                : `${new Date().getFullYear()}: `
                                            }
                                            <span className="font-semibold text-slate-600">{txTotals[m]} шт</span>
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Chart type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                {t('manager.analytics.selector.chartType')}
                            </label>
                            <div className="flex gap-2">
                                {(['bar', 'line', 'pie'] as const).map(type => (
                                    <button key={type} onClick={() => setSelectedChartType(type)}
                                        className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all text-center ${selectedChartType === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <p className="text-xs font-bold uppercase">
                                            {t(`manager.analytics.chart.${type}`).split(' ')[0]}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Summary table by category ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <Package size={20} className="text-slate-400" />
                    <h3 className="text-lg font-bold text-slate-800">{t('manager.analytics.summaryTitle')}</h3>
                </div>
                {summaryData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Завантаження...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase font-semibold">
                                    <th className="px-6 py-4">{t('manager.analytics.table.category')}</th>
                                    <th className="px-6 py-4 text-center">{t('manager.analytics.table.itemsCount')}</th>
                                    <th className="px-6 py-4 text-center">{t('manager.analytics.table.totalStock')}</th>
                                    <th className="px-6 py-4 text-right">{t('manager.analytics.table.estimatedValue')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {summaryData.map(row => (
                                    <tr key={row.category} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{row.category}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{row.count}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 text-sm font-medium">
                                                {row.totalStock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">
                                            {row.value.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                                    <td className="px-6 py-4 text-slate-700">Всього</td>
                                    <td className="px-6 py-4 text-center text-slate-700">
                                        {summaryData.reduce((s, r) => s + r.count, 0)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2 py-1 bg-slate-200 rounded text-slate-700 text-sm font-bold">
                                            {summaryData.reduce((s, r) => s + r.totalStock, 0)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-indigo-700">
                                        {totalStockValue.toLocaleString('uk-UA', { maximumFractionDigits: 0 })} ₴
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManagerDashboardPage;
