import { useState, useEffect, useMemo } from 'react';
import { useItems } from '../../context/ItemsContext';
import { apiGetStats, apiGetTransactions } from '../../utils/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Package, Settings2, FileBarChart, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { downloadSummaryReportPDF } from '../../utils/pdfGenerator';
import { useLanguage } from '../../context/LanguageContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const QUARTER_LABELS = ['Q1','Q2','Q3','Q4'];

const ManagerDashboardPage = () => {
    const { t } = useLanguage();
    const { items } = useItems();

    const [dateFilter, setDateFilter]         = useState('month');
    const [selectedMetric, setSelectedMetric] = useState('procurement');
    const [selectedChartType, setSelectedChartType] = useState('bar');

    const [stats, setStats] = useState({
        total_items: 0,
        available: 0,
        issued: 0,
        written_off: 0,
        damaged: 0,
        total_suppliers: 0,
        pending_approvals: 0,
        total_stock_value: 0,
    });
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        apiGetStats().then(setStats).catch(() => {});
        apiGetTransactions().then(setTransactions).catch(() => {});
    }, []);

    // Real data computed from items context
    const lowStockItems  = items.filter(p => p.current_stock <= p.min_stock).length;
    const categories     = Array.from(new Set(items.map(p => p.category))).filter(Boolean);
    const summaryData    = categories.map(cat => {
        const catItems = items.filter(p => p.category === cat);
        return {
            category: cat,
            count:      catItems.length,
            totalStock: catItems.reduce((acc, i) => acc + i.current_stock, 0),
            value:      catItems.reduce((acc, i) => acc + i.current_stock * i.unit_price, 0),
        };
    });

    // Build chart data from real transactions
    const currentTimeData = useMemo(() => {
        if (!transactions.length) return [];

        if (dateFilter === 'day') {
            const today = new Date().toISOString().split('T')[0];
            const hours = ['08','09','10','11','12','13','14','15','16','17','18'];
            return hours.map(h => {
                const bucket = transactions.filter(tx => {
                    const d = tx.date ?? '';
                    return d.startsWith(today) && d.includes(`T${h}`);
                });
                return {
                    name: `${h}:00`,
                    procurement: bucket.filter(t => t.type === 'in').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                    writeOffs:   bucket.filter(t => t.type === 'write_off').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                    stock:       bucket.reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                };
            });
        }

        if (dateFilter === 'month') {
            return MONTH_LABELS.map((name, idx) => {
                const bucket = transactions.filter(tx => {
                    const d = new Date(tx.date ?? '');
                    return d.getMonth() === idx;
                });
                return {
                    name,
                    procurement: bucket.filter(t => t.type === 'in').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                    writeOffs:   bucket.filter(t => t.type === 'write_off').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                    stock:       bucket.reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                };
            }).filter(r => r.procurement > 0 || r.writeOffs > 0 || r.stock > 0);
        }

        // quarter
        return QUARTER_LABELS.map((name, idx) => {
            const bucket = transactions.filter(tx => {
                const d = new Date(tx.date ?? '');
                return Math.floor(d.getMonth() / 3) === idx;
            });
            return {
                name: `${name} ${new Date().getFullYear()}`,
                procurement: bucket.filter(t => t.type === 'in').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                writeOffs:   bucket.filter(t => t.type === 'write_off').reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
                stock:       bucket.reduce((s: number, t: any) => s + (t.quantity ?? 0), 0),
            };
        });
    }, [transactions, dateFilter]);

    const renderChart = () => {
        const dataKey   = selectedMetric;
        const color     = selectedMetric === 'procurement' ? '#3b82f6' : selectedMetric === 'writeOffs' ? '#f97316' : '#10b981';
        const metricName = t(`manager.analytics.metric.${selectedMetric}`);

        if (selectedChartType === 'pie') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={summaryData}
                            cx="50%" cy="50%"
                            innerRadius={60} outerRadius={100}
                            paddingAngle={5}
                            dataKey={selectedMetric === 'stock' ? 'totalStock' : 'value'}
                            nameKey="category"
                            label
                        >
                            {summaryData.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        if (selectedChartType === 'line') {
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={currentTimeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey={dataKey} stroke={color} name={metricName} strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={currentTimeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={dataKey} fill={color} name={metricName} radius={[4, 4, 0, 0]} barSize={40} />
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
                        <p className="text-slate-500 text-xs">{t('procurement.subtitle')}</p>
                    </div>
                </div>
                <button
                    onClick={() => downloadSummaryReportPDF(summaryData, {
                        totalStockValue:   stats.total_stock_value,
                        lowStockItems,
                        pendingApprovals:  stats.pending_approvals,
                        totalItems:        stats.total_items,
                    })}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md text-sm font-medium"
                >
                    <FileBarChart size={18} />
                    {t('manager.analytics.btn.requestReport')}
                </button>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.totalValue')}</h3>
                        <p className="text-2xl font-bold text-slate-800">{stats.total_stock_value.toLocaleString()} ₴</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.lowStock')}</h3>
                        <p className="text-2xl font-bold text-red-600">{lowStockItems}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                        <AlertTriangle size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.totalProcurement')}</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.total_items}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-slate-500 mb-1">{t('manager.stats.writeOffsValue')}</h3>
                        <p className="text-2xl font-bold text-orange-600">{stats.pending_approvals}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                        <TrendingDown size={24} />
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[450px]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <h3 className="text-lg font-bold text-slate-800">{t('manager.charts.dynamics')}</h3>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            {['day', 'month', 'quarter'].map(filter => (
                                <button
                                    key={filter}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${dateFilter === filter ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    onClick={() => setDateFilter(filter)}
                                >{t(`manager.charts.${filter}`)}</button>
                            ))}
                        </div>
                    </div>
                    <div className="h-[350px] w-full">{renderChart()}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-50">
                        <Settings2 size={20} className="text-slate-400" />
                        <h3 className="font-bold text-slate-700">{t('login.subtitle')}</h3>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">{t('manager.analytics.selector.metric')}</label>
                            <div className="grid grid-cols-1 gap-2">
                                {['procurement', 'stock', 'writeOffs'].map(metric => (
                                    <button
                                        key={metric}
                                        onClick={() => setSelectedMetric(metric)}
                                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${selectedMetric === metric ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <p className="text-sm font-bold">{t(`manager.analytics.metric.${metric}`)}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-600 mb-2">{t('manager.analytics.selector.chartType')}</label>
                            <div className="flex gap-2">
                                {['bar', 'line', 'pie'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedChartType(type)}
                                        className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all text-center ${selectedChartType === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 text-slate-600'}`}
                                    >
                                        <p className="text-xs font-bold uppercase">{t(`manager.analytics.chart.${type}`).split(' ')[0]}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Table */}
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
                                {summaryData.map((row) => (
                                    <tr key={row.category} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{row.category}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{row.count}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 text-sm font-medium">{row.totalStock}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-slate-800">{row.value.toLocaleString()} ₴</td>
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

export default ManagerDashboardPage;
