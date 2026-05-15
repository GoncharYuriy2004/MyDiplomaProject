import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Search, Mail } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSuppliers } from '../../context/SupplierContext';

const Suppliers = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { suppliers, deleteSupplier } = useSuppliers();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.edrpou.includes(searchTerm)
    );

    return (
        <div className="space-y-6 min-h-screen bg-[#fafaf9]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">{t('suppliers.title')}</h2>
                    <p className="text-slate-500 text-sm mt-1">{t('suppliers.subtitle')}</p>
                </div>
                <button 
                    onClick={() => navigate('/manager/suppliers/add')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4)] hover:-translate-y-0.5"
                >
                    <Plus size={18} />
                    <span>{t('suppliers.btn.add')}</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                            placeholder={t('suppliers.search.placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.details')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.contact')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t('suppliers.table.bank')}</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t('suppliers.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSuppliers.map((supplier) => (
                                <tr key={supplier._id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{supplier.name}</p>
                                        <p className="text-xs text-slate-500 mt-1 font-medium italic">ID: <span className="text-slate-400">Gen by DB</span></p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Mail size={12} className="text-blue-500"/> {supplier.contact_info}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold font-mono border border-blue-100">
                                            {supplier.bank_details}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => navigate(`/manager/suppliers/edit/${supplier._id}`)}
                                            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => { if (window.confirm(`Delete "${supplier.name}"?`)) deleteSupplier(supplier._id); }}
                                            className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Suppliers;
