import { useState } from 'react';
import { FileWarning, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useItems } from '../../context/ItemsContext';
import { apiCreateDocument } from '../../utils/api';

const InventoryCheck = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { items } = useItems();
    const [actualStock, setActualStock] = useState<Record<string, number>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStockChange = (id: string, value: string) => {
        setActualStock(prev => ({
            ...prev,
            [id]: value === '' ? 0 : parseInt(value, 10),
        }));
    };

    const calculateDiscrepancy = (expected: number, actual: number | undefined) => {
        if (actual === undefined) return 0;
        return actual - expected;
    };

    const handleGenerateAct = async () => {
        const discrepancies = items
            .filter(p => {
                const act = actualStock[p._id];
                return act !== undefined && act !== p.current_stock;
            })
            .map(p => ({
                item_id: p._id,
                item_name: p.name,
                sku: p.sku,
                expected: p.current_stock,
                actual: actualStock[p._id],
                diff: actualStock[p._id] - p.current_stock,
            }));

        if (discrepancies.length === 0) {
            setSuccessMessage('Розбіжностей не знайдено. Залишки відповідають обліку.');
            setTimeout(() => setSuccessMessage(''), 4000);
            return;
        }

        setIsSubmitting(true);
        try {
            await apiCreateDocument({
                type: 'discrepancy_act',
                status: 'pending',
                created_at: new Date().toISOString(),
                created_by: user?._id || '',
                discrepancies,
            });

            setSuccessMessage(`Акт розбіжностей по ${discrepancies.length} позиціях сформовано та надіслано на підтвердження.`);
            setTimeout(() => setSuccessMessage(''), 6000);
            setActualStock({});
        } catch (err: any) {
            setSuccessMessage(`Помилка: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('inventory.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('inventory.subtitle')}</p>
                </div>
                <button
                    onClick={handleGenerateAct}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <FileWarning size={18} />
                    <span>{isSubmitting ? 'Збереження...' : t('inventory.btn.generateAct')}</span>
                </button>
            </div>

            {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t('inventory.table.details')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">{t('dashboard.tableCategory')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">{t('inventory.table.expected')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">{t('inventory.table.actual')}</th>
                                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t('inventory.table.discrepancy')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => {
                                const actual = actualStock[item._id];
                                const diff = calculateDiscrepancy(item.current_stock, actual);
                                const hasDiff = actual !== undefined && diff !== 0;

                                return (
                                    <tr key={item._id} className={`hover:bg-slate-50/50 transition-colors ${hasDiff ? 'bg-orange-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">SKU: <span className="font-mono text-slate-700">{item.sku}</span></p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                                                {t(`receiving.category.${item.category}` as any)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-600">
                                            {item.current_stock} <span className="text-[10px] text-slate-400 uppercase">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder={t('inventory.placeholder.count')}
                                                value={actual !== undefined ? actual : ''}
                                                onChange={(e) => handleStockChange(item._id, e.target.value)}
                                                className={`w-28 text-center px-3 py-1.5 border rounded-lg text-sm outline-none transition-all ${hasDiff
                                                    ? 'border-orange-300 bg-orange-50 focus:ring-2 focus:ring-orange-500'
                                                    : 'border-slate-200 focus:ring-2 focus:ring-blue-500'
                                                    }`}
                                            />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {actual !== undefined ? (
                                                <span className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded font-bold text-sm ${diff === 0
                                                    ? 'bg-green-100 text-green-700'
                                                    : diff > 0
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-sm italic">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InventoryCheck;
