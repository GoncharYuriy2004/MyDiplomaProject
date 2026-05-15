import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Briefcase, User, FileText, Mail, Send, Phone, Save } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useSuppliers } from '../../context/SupplierContext';

const AddSupplierPage = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { id } = useParams();
    const { suppliers, addSupplier, updateSupplier } = useSuppliers();
    const isEditMode = Boolean(id);
    
    const [formData, setFormData] = useState({
        name: '',
        edrpou: '',
        address: '',
        iban: '',
        contactPerson: '',
        email: '',
        telegram: '',
        phone: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError]         = useState('');

    useEffect(() => {
        if (isEditMode && id) {
            const supplier = suppliers.find(s => s._id === id);
            if (supplier) {
                setFormData({
                    name: supplier.name,
                    edrpou: supplier.edrpou,
                    address: supplier.address || '',
                    iban: supplier.iban || supplier.bank_details || '',
                    contactPerson: supplier.contact_person || '',
                    email: supplier.email || supplier.contact_info || '',
                    telegram: supplier.telegram || '',
                    phone: supplier.phone || ''
                });
            }
        }
    }, [id, isEditMode, suppliers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const supplierData = {
            name:           formData.name,
            edrpou:         formData.edrpou,
            address:        formData.address,
            iban:           formData.iban,
            contact_person: formData.contactPerson,
            email:          formData.email,
            telegram:       formData.telegram,
            phone:          formData.phone,
        };

        try {
            if (isEditMode && id) {
                await updateSupplier(id, supplierData);
            } else {
                await addSupplier(supplierData);
            }
            navigate('/manager/suppliers');
        } catch (err: any) {
            setError(err.message ?? 'Помилка збереження. Спробуйте ще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafaf9] py-8 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Back Link */}
                <button 
                    onClick={() => navigate('/manager/suppliers')}
                    className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group px-2 py-1 rounded-lg hover:bg-white"
                >
                    <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">{t('acts.filter.all')}</span>
                </button>

                {/* Main Card */}
                <div className="bg-white rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white overflow-hidden">
                    {/* Header */}
                    <div className="px-8 py-8 border-b border-slate-50 bg-white/50">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            {isEditMode ? 'Редагувати постачальника' : t('suppliers.btn.add')}
                        </h2>
                        <p className="text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">{t('suppliers.subtitle')}</p>
                        <div className="h-1.5 w-12 bg-blue-600 rounded-full mt-4"></div>
                    </div>

                    {/* Form Body */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Name */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Briefcase size={14} className="text-blue-500" /> {t('suppliers.form.name')}
                                </label>
                                <input 
                                    required
                                    maxLength={100}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder={t('suppliers.form.placeholder.name')}
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            {/* EDRPOU */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-blue-500" /> ЄДРПОУ
                                </label>
                                <input
                                    required
                                    maxLength={20}
                                    type="text"
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-bold font-mono text-slate-700"
                                    placeholder="12345678"
                                    value={formData.edrpou}
                                    onChange={(e) => setFormData({...formData, edrpou: e.target.value})}
                                />
                            </div>

                            {/* Address */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={14} className="text-blue-500" /> {t('suppliers.form.address')}
                                </label>
                                <input 
                                    required
                                    maxLength={200}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder={t('suppliers.form.placeholder.address')}
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                />
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={14} className="text-blue-500" /> {t('suppliers.form.contactPerson')}
                                </label>
                                <input 
                                    required
                                    maxLength={100}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder={t('suppliers.form.placeholder.contactPerson')}
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                                />
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Mail size={14} className="text-blue-500" /> {t('suppliers.form.email')}
                                </label>
                                <input 
                                    required
                                    maxLength={100}
                                    type="email" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder="vendor@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            {/* Telegram */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Send size={14} className="text-blue-500" /> {t('suppliers.form.telegram')}
                                </label>
                                <input 
                                    maxLength={50}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder={t('suppliers.form.placeholder.telegram')}
                                    value={formData.telegram}
                                    onChange={(e) => setFormData({...formData, telegram: e.target.value})}
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Phone size={14} className="text-blue-500" /> {t('suppliers.form.phone')}
                                </label>
                                <input 
                                    maxLength={200}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-semibold text-slate-700"
                                    placeholder="+380..."
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>

                            {/* IBAN */}
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-blue-500" /> {t('suppliers.form.iban')}
                                </label>
                                <input 
                                    required
                                    maxLength={50}
                                    type="text" 
                                    className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-sm font-bold font-mono text-slate-700"
                                    placeholder={t('suppliers.form.placeholder.iban')}
                                    value={formData.iban}
                                    onChange={(e) => setFormData({...formData, iban: e.target.value})}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold text-center">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4 flex justify-center">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full md:w-auto min-w-[300px] flex items-center justify-center gap-3 px-10 py-5 bg-blue-600 text-white rounded-[24px] hover:bg-blue-700 transition-all font-bold text-base shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] hover:-translate-y-1 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            >
                                <Save size={20} />
                                <span>{isLoading ? 'Збереження...' : (isEditMode ? 'Зберегти зміни' : t('suppliers.btn.add'))}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddSupplierPage;
