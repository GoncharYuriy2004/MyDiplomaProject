import { useEffect, useState } from 'react';

import { apiGetUsers, apiActivateUser, apiDeactivateUser } from '../../utils/api';
import { UserCheck, UserX, Clock, RefreshCw } from 'lucide-react';

type UserEntry = {
    _id: string;
    login: string;
    full_name: string;
    role_in_system: string;
    account_status: string;
    pass_number: number;
    position: string;
    phone: string;
    email: string;
};

const STATUS_COLORS: Record<string, string> = {
    ACTIVE:       'bg-green-100 text-green-700 border-green-200',
    REGISTRATION: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    INACTIVE:     'bg-red-100 text-red-700 border-red-200',
};

const STATUS_LABELS: Record<string, string> = {
    ACTIVE:       'Активний',
    REGISTRATION: 'Очікує активації',
    INACTIVE:     'Деактивований',
};

const ROLE_LABELS: Record<string, string> = {
    WAREHOUSE_MANAGER: 'Завідувач складу',
    WAREHOUSE_WORKER:  'Працівник складу',
};

export default function UsersPage() {

    const [users, setUsers]       = useState<UserEntry[]>([]);
    const [loading, setLoading]   = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const data = await apiGetUsers();
            setUsers(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const activate = async (id: string) => {
        setActionId(id);
        try { const updated = await apiActivateUser(id); setUsers(u => u.map(x => x._id === id ? { ...x, ...updated } : x)); }
        finally { setActionId(null); }
    };

    const deactivate = async (id: string) => {
        setActionId(id);
        try { const updated = await apiDeactivateUser(id); setUsers(u => u.map(x => x._id === id ? { ...x, ...updated } : x)); }
        finally { setActionId(null); }
    };

    const pending  = users.filter(u => u.account_status === 'REGISTRATION');
    const active   = users.filter(u => u.account_status === 'ACTIVE');
    const inactive = users.filter(u => u.account_status === 'INACTIVE');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-[var(--text-primary)]">Управління користувачами</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Активація та управління акаунтами</p>
                </div>
                <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl text-sm font-semibold hover:bg-[var(--hover-bg)] transition-colors">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    Оновити
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Очікують активації', count: pending.length,  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
                    { label: 'Активні',             count: active.length,   color: 'text-green-600',  bg: 'bg-green-50 border-green-200'  },
                    { label: 'Деактивовані',        count: inactive.length, color: 'text-red-600',    bg: 'bg-red-50 border-red-200'      },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-2xl p-4`}>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
                        <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.count}</p>
                    </div>
                ))}
            </div>

            {/* Pending activation — highlighted */}
            {pending.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                    <h2 className="text-sm font-black text-yellow-800 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Clock size={14} /> Очікують активації ({pending.length})
                    </h2>
                    <div className="space-y-2">
                        {pending.map(u => <UserRow key={u._id} user={u} actionId={actionId} onActivate={activate} onDeactivate={deactivate} />)}
                    </div>
                </div>
            )}

            {/* All users table */}
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[var(--border)]">
                    <h2 className="font-black text-[var(--text-primary)]">Всі користувачі ({users.length})</h2>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-[var(--text-secondary)]">Завантаження...</div>
                ) : (
                    <div className="divide-y divide-[var(--border)]">
                        {users.map(u => <UserRow key={u._id} user={u} actionId={actionId} onActivate={activate} onDeactivate={deactivate} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

function UserRow({ user: u, actionId, onActivate, onDeactivate }: {
    user: UserEntry;
    actionId: string | null;
    onActivate: (id: string) => void;
    onDeactivate: (id: string) => void;
}) {
    const busy = actionId === u._id;
    return (
        <div className="flex items-center justify-between px-6 py-4 hover:bg-[var(--hover-bg)] transition-colors">
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--text-primary)] truncate">{u.full_name || '—'}</p>
                <p className="text-sm text-[var(--text-secondary)]">{u.login}</p>
                {u.position && <p className="text-xs text-[var(--text-secondary)] opacity-70">{u.position}</p>}
            </div>
            <div className="flex items-center gap-4 ml-4">
                <span className="text-xs text-[var(--text-secondary)] hidden md:block">{ROLE_LABELS[u.role_in_system] ?? u.role_in_system}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[u.account_status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[u.account_status] ?? u.account_status}
                </span>
                <div className="flex gap-2">
                    {u.account_status !== 'ACTIVE' && (
                        <button
                            onClick={() => onActivate(u._id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            <UserCheck size={13} />
                            {busy ? '...' : 'Активувати'}
                        </button>
                    )}
                    {u.account_status === 'ACTIVE' && (
                        <button
                            onClick={() => onDeactivate(u._id)}
                            disabled={busy}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                        >
                            <UserX size={13} />
                            {busy ? '...' : 'Деактивувати'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
