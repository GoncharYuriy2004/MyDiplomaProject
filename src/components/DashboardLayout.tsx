
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
    requiredRole: 'manager' | 'worker';
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ requiredRole }) => {
    const { user } = useAuth();
    const { t } = useLanguage();

    // Redirect to login if unauthenticated
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Redirect to their respective dashboard if they try to access the wrong one
    if (user.role !== requiredRole) {
        return <Navigate to={`/${user.role}`} replace />;
    }

    const themeClass = user.role === 'manager' ? 'theme-manager' : 'theme-worker';

    return (
        <div className={`min-h-screen bg-[var(--app-bg)] transition-colors duration-300 ${themeClass}`}>
            <Sidebar />
            <div className="ml-64 p-8">
                <header className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">
                            {user.role === 'manager' ? t('portal.manager') : t('portal.worker')}
                        </h1>
                        <p className="text-slate-500 mt-1">{t('login.subtitle')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${user.role === 'manager' ? 'bg-blue-600' : 'bg-green-600'} shadow-sm`}>
                            {t('portal.role')}: {user.role === 'manager' ? t('role.manager') : t('role.worker')}
                        </div>
                    </div>
                </header>

                <main className="animate-fade-in">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
