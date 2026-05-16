import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
    BarChart3,
    Users,
    ShoppingCart,
    FileText,
    CheckSquare,
    LogOut,
    PackageSearch,
    ArrowDownToLine,
    ArrowUpFromLine,
    ClipboardCheck,
    Ban,
    Undo2,
    BrainCircuit,
    Wrench,
    UserCog,
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const managerLinks = [
        { name: t('sidebar.dashboard'), path: '/manager', icon: <BarChart3 size={20} />, exact: true },
        { name: t('sidebar.suppliers'), path: '/manager/suppliers', icon: <Users size={20} /> },
        { name: t('sidebar.procurement'), path: '/manager/procurement', icon: <ShoppingCart size={20} /> },
        { name: t('sidebar.documents'), path: '/manager/documents', icon: <FileText size={20} /> },
        { name: t('sidebar.approvals'), path: '/manager/approvals', icon: <CheckSquare size={20} /> },
        { name: t('sidebar.analytics'), path: '/manager/analytics', icon: <BrainCircuit size={20} /> },
        { name: t('sidebar.users'),     path: '/manager/users',     icon: <UserCog size={20} /> },
    ];

    const workerLinks = [
        { name: t('sidebar.stockOverview'), path: '/worker', icon: <PackageSearch size={20} />, exact: true },
        { name: t('sidebar.receiving'), path: '/worker/receiving', icon: <ArrowDownToLine size={20} /> },
        { name: t('sidebar.issuing'), path: '/worker/issuing', icon: <ArrowUpFromLine size={20} /> },
        { name: t('sidebar.inventoryCheck'), path: '/worker/inventory-check', icon: <ClipboardCheck size={20} /> },
        { name: t('sidebar.writeOffs'), path: '/worker/write-offs', icon: <Ban size={20} /> },
        { name: t('sidebar.returns'), path: '/worker/returns', icon: <Undo2 size={20} /> },
    ];

    const links = user?.role === 'manager' ? managerLinks : workerLinks;

    return (
        <div className="w-64 h-screen fixed top-0 left-0 flex flex-col transition-colors duration-300 shadow-xl z-20"
            style={{ backgroundColor: 'var(--sidebar-bg)', color: 'var(--sidebar-text)' }}>
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                    <PackageSearch size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">{t('sidebar.appTitle')}</h2>
            </div>

            <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider opacity-60 font-semibold">
                        {t('sidebar.loggedInAs')}
                    </div>
                    {/* Language Toggle */}
                    <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-[var(--sidebar-bg)] shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('uk')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${language === 'uk' ? 'bg-white text-[var(--sidebar-bg)] shadow-sm' : 'text-white/60 hover:text-white'}`}
                        >
                            UK
                        </button>
                    </div>
                </div>

                <div className="font-medium flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    {user?.full_name}
                    <span className="ml-auto text-xs py-0.5 px-2 rounded-full bg-white/20 capitalize">
                        {user?.role === 'manager' ? t('role.manager') : t('role.worker')}
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-1 px-3">
                    {links.map((link) => (
                        <li key={link.name}>
                            <NavLink
                                to={link.path}
                                end={link.exact}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                        ? 'bg-[var(--sidebar-active)] text-white shadow-md'
                                        : 'hover:bg-[var(--sidebar-hover)] opacity-80 hover:opacity-100'
                                    }`
                                }
                            >
                                {link.icon}
                                <span className="font-medium">{link.name}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            <div className="p-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg hover:bg-white/10 transition-colors opacity-80 hover:opacity-100 text-left"
                >
                    <LogOut size={20} />
                    <span className="font-medium">{t('sidebar.signOut')}</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
