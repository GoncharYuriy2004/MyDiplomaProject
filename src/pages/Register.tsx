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
        firstname: '',
        lastname: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'worker'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
                firstname: formData.firstname,
                lastname: formData.lastname,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            });
            if (result.success) {
                navigate('/login');
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
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    name="firstname"
                                    placeholder={t('register.field.firstname')}
                                    value={formData.firstname}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-lg hover:bg-white"
                                    required
                                />
                            </div>
                            <div className="flex-1">
                                <input
                                    type="text"
                                    name="lastname"
                                    placeholder={t('register.field.lastname')}
                                    value={formData.lastname}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-lg hover:bg-white"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <input
                                type="email"
                                name="email"
                                placeholder={t('register.field.email')}
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-lg hover:bg-white"
                                required
                            />
                        </div>

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder={t('register.field.password')}
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-lg hover:bg-white pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                name="confirmPassword"
                                placeholder={t('register.field.confirmPassword')}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800 font-semibold text-lg hover:bg-white pr-12"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                            </button>
                        </div>

                        <div className="relative">
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-slate-800 font-bold text-lg appearance-none cursor-pointer hover:bg-white"
                                required
                            >
                                <option value="worker">{t('role.warehouse_worker')}</option>
                                <option value="manager">{t('role.warehouse_manager')}</option>
                            </select>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
                </div>
            </div>
        </div>
    );
};


export default Register;
