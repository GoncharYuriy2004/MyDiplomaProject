import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';
import warehouseBg from '../assets/warehouse_bg.jpg';
import companyLogo from '../assets/logo.jpg';

const Register = () => {
    const { t, language, setLanguage } = useLanguage();
    const { register } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: '',
        pass_number: '',
        login: '',
        email: '',
        password: '',
        confirmPassword: '',
        role_in_system: 'WAREHOUSE_WORKER',
        position: '',
        phone: '',
        workshop: '',
        floor: '',
        office: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [registered, setRegistered] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('register.error.passwordMismatch'));
            return;
        }

        setIsLoading(true);
        try {
            const result = await register({
                full_name:       formData.full_name,
                pass_number:     parseInt(formData.pass_number) || 0,
                login:           formData.login,
                password:        formData.password,
                role_in_system:  formData.role_in_system,
                email:           formData.email,
                position:        formData.position,
                phone:           formData.phone,
                workshop_number: parseInt(formData.workshop) || 0,
                floor_number:    parseInt(formData.floor) || 0,
                office_number:   parseInt(formData.office) || 0,
            });
            if (result.success) {
                setRegistered(true);
            } else {
                setError(result.error ?? t('register.error.general'));
            }
        } catch {
            setError(t('register.error.general'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden font-sans">
            {/* Background Image with Overlay */}
            <div 
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                style={{ backgroundImage: `url(${warehouseBg})` }}
            >
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
            </div>

            {/* Language Switcher - Fixed in top corner */}
            <div className="fixed top-8 right-8 lg:top-12 lg:right-12 z-50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex bg-slate-900/40 backdrop-blur-xl rounded-2xl p-1.5 border border-white/10 shadow-2xl">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 ${language === 'en' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('uk')}
                        className={`px-5 py-2 text-xs font-black rounded-xl transition-all duration-300 ${language === 'uk' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        UK
                    </button>
                </div>
            </div>

            {/* Left Side: Logo */}
            <div className="flex-1 hidden lg:flex flex-col items-center justify-center z-10 p-12 relative">
                <div className="max-w-lg w-full animate-fade-in text-center flex flex-col items-center">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img 
                            src={companyLogo} 
                            alt="Company Logo" 
                            className="relative w-80 h-80 object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] transform hover:scale-[1.03] transition-transform duration-700 rounded-3xl shadow-2xl" 
                        />
                    </div>
                    <div className="mt-8 text-white">
                        <h2 className="text-3xl font-black tracking-tight drop-shadow-lg">{t('login.title')}</h2>
                        <p className="text-xl text-blue-100 mt-4 font-medium opacity-80">{t('register.subtitle')}</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Card */}
            <div className="flex-1 flex items-center justify-center z-10 p-6 lg:p-12 lg:justify-end xl:pr-40 lg:pr-20">
                <div className="bg-white text-slate-900 p-10 md:p-12 rounded-[3.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] w-full max-w-[500px] border border-white relative overflow-hidden transform animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                    
                    {registered ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-6 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-3">{t('register.success.title')}</h2>
                            <p className="text-slate-500 font-medium mb-8 leading-relaxed">{t('register.success.message')}</p>
                            <Link
                                to="/login"
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-600/30"
                            >
                                {t('register.signIn')}
                            </Link>
                        </div>
                    ) : (
                    <>
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <div className="w-3 h-3 rounded-full bg-white opacity-80" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                            {t('register.title')}
                        </h1>
                    </div>
                    
                    <p className="text-slate-500 text-base mb-10 font-medium ml-1">
                        {t('register.subtitle')}
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm border border-red-100 rounded-2xl text-center font-bold">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.fullName')}</label>
                                <input
                                    type="text"
                                    name="full_name"
                                    placeholder={t('register.field.fullName')}
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                    required
                                />
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.login')}</label>
                                <input
                                    type="text"
                                    name="login"
                                    placeholder={t('register.field.login')}
                                    value={formData.login}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.password')}</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        placeholder={t('register.field.password')}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.confirmPassword')}</label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        placeholder={t('register.field.confirmPassword')}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white pr-12"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.role')}</label>
                                <div className="relative">
                                    <select
                                        name="role_in_system"
                                        value={formData.role_in_system}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-800 font-semibold text-[15px] appearance-none cursor-pointer hover:bg-white"
                                        required
                                    >
                                        <option value="WAREHOUSE_WORKER">{t('role.warehouse_worker')}</option>
                                        <option value="WAREHOUSE_MANAGER">{t('role.warehouse_manager')}</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.position')}</label>
                                <input
                                    type="text"
                                    name="position"
                                    placeholder={t('register.field.position')}
                                    value={formData.position}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.email')}</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t('register.field.email')}
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.phone')}</label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder={t('register.placeholder.phone')}
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.passNumber')}</label>
                                <input
                                    type="number"
                                    name="pass_number"
                                    placeholder="123456"
                                    value={formData.pass_number}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                    required
                                />
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.workshop')}</label>
                                <input
                                    type="text"
                                    name="workshop"
                                    placeholder={t('register.placeholder.workshop')}
                                    value={formData.workshop}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.floor')}</label>
                                <input
                                    type="text"
                                    name="floor"
                                    placeholder={t('register.placeholder.floor')}
                                    value={formData.floor}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5 w-full">
                                <label className="text-sm font-bold text-slate-700 ml-1">{t('register.field.office')}</label>
                                <input
                                    type="text"
                                    name="office"
                                    placeholder={t('register.placeholder.office')}
                                    value={formData.office}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-[15px] hover:bg-white"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={twMerge(
                                "w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-2xl transition-all shadow-2xl shadow-blue-600/30 mt-6 active:scale-[0.98] transform",
                                isLoading && "opacity-75 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-3">
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                    {t('login.btn.loading')}
                                </div>
                            ) : (
                                t('register.btn.submit')
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-slate-500 font-semibold">
                            {t('register.haveAccount')}{' '}
                            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-extrabold active:scale-95 inline-block transition-transform ml-1">
                                {t('register.signIn')}
                            </Link>
                        </p>
                    </div>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
};


export default Register;
