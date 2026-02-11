import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function EmployerDashboard() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'connect'>('overview');
    const [showBalance, setShowBalance] = useState(true);
    const balance = 15000.00;

    const transactions = [
        { id: 1, title: 'Salary Payment - John Doe', type: 'expense', amount: 450.00, date: 'Oct 24, 2023' },
        { id: 2, title: 'Fund Deposit', type: 'income', amount: 2000.00, date: 'Oct 22, 2023' },
        { id: 3, title: 'Salary Payment - Jane Smith', type: 'expense', amount: 450.00, date: 'Oct 24, 2023' },
    ];

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200 h-screen overflow-hidden flex">
            {/* Mobile Backdrop */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col justify-between fixed md:relative z-30 h-full transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}>
                <div>
                    <div className="h-20 flex items-center px-8 border-b border-border-light dark:border-border-dark">
                        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-primary transition-colors">
                            <span className="material-icons-outlined">arrow_back</span>
                            <span className="font-bold text-lg">Back to Home</span>
                        </Link>
                    </div>
                    <nav className="mt-8 px-4 space-y-2">
                        <div className="px-4 py-2 mb-4 text-xs font-semibold text-secondary uppercase tracking-wider">
                            Employer Portal
                        </div>
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left ${activeTab === 'overview'
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-icons-outlined text-2xl mr-3">dashboard</span>
                            <span className="font-medium">Overview</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('connect')}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left ${activeTab === 'connect'
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-icons-outlined text-2xl mr-3">link</span>
                            <span className="font-medium">Connect Worker</span>
                        </button>
                    </nav>
                </div>
                <div className="p-4 border-t border-border-light dark:border-border-dark">
                    <Link to="/" className="flex items-center px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg group transition-colors">
                        <span className="material-icons-outlined text-2xl mr-3">logout</span>
                        <span className="font-medium">Logout</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-0">
                <header className="md:hidden h-16 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-4 sticky top-0 z-20">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-white">
                            <span className="material-icons-outlined">home</span>
                            <span className="font-bold">Home</span>
                        </Link>
                    </div>
                    <button
                        className="text-secondary dark:text-slate-300"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <span className="material-icons-outlined">menu</span>
                    </button>
                </header>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employer Dashboard</h1>
                            <p className="text-secondary dark:text-slate-400 mt-1 text-sm">Welcome back. Manage your domestic workers.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-surface-light dark:bg-surface-dark px-4 py-2 rounded-lg border border-border-light dark:border-border-dark flex items-center gap-2 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Stellar Mainnet</span>
                            </div>
                            <button className="p-2 rounded-lg bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-secondary dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                <span className="material-icons-outlined">notifications</span>
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                            <div className="bg-purple-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-purple-100 dark:border-slate-700 relative overflow-hidden shadow-sm">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-100 dark:bg-purple-900/20 rounded-full blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-purple-900 dark:text-purple-100 font-medium flex items-center gap-2">
                                            <span className="material-icons-outlined text-lg">account_balance_wallet</span>
                                            Total Balance
                                        </span>
                                        <span className="bg-white/60 dark:bg-slate-700/60 px-2 py-1 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">XLM</span>
                                    </div>
                                    <div className="mb-6">
                                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            {showBalance ? balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                            {showBalance ? '≈ $1,875.00 USD' : '≈ $•••••• USD'}
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setShowBalance(!showBalance)}
                                            className="flex-1 bg-white/10 hover:bg-white/20 text-purple-900 dark:text-white border border-purple-200 dark:border-slate-600 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 backdrop-blur-sm"
                                        >
                                            <span className="material-icons-outlined text-sm">
                                                {showBalance ? 'visibility_off' : 'visibility'}
                                            </span>
                                            {showBalance ? 'Hide Balance' : 'Show Balance'}
                                        </button>
                                        <button className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                                            <span className="material-icons-outlined text-sm">add</span>
                                            Add Funds
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Transactions Information */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm flex flex-col">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Recent Transactions</h3>
                                    <button className="text-primary text-sm hover:underline font-medium">
                                        View All
                                    </button>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-border-dark flex-1 overflow-auto">
                                    {transactions.map((tx) => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'income'
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                                    }`}>
                                                    <span className="material-icons-outlined text-lg">
                                                        {tx.type === 'income' ? 'arrow_downward' : 'arrow_upward'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">{tx.title}</p>
                                                    <p className="text-xs text-secondary dark:text-slate-500">{tx.date}</p>
                                                </div>
                                            </div>
                                            <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
                                                }`}>
                                                {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'overview' && (
                        <div className="mt-8 max-w-4xl bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Scheduled Deductions</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">Upcoming automated payments to your workers</p>
                                </div>
                                <button className="text-primary text-sm hover:underline font-medium flex items-center gap-1">
                                    <span className="material-icons-outlined text-sm">add</span>
                                    Add Schedule
                                </button>
                            </div>
                            <div className="divide-y divide-border-light dark:divide-border-dark">
                                {[
                                    { id: 1, worker: 'Sarah Wilson', amount: 1200.00, frequency: 'Monthly', nextDate: 'Nov 24, 2023', avatar: 'SW' },
                                    { id: 2, worker: 'David Kim', amount: 850.00, frequency: 'Bi-weekly', nextDate: 'Nov 07, 2023', avatar: 'DK' },
                                ].map((schedule) => (
                                    <div key={schedule.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                                                {schedule.avatar}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white">{schedule.worker}</p>
                                                <div className="flex items-center gap-2 text-xs text-secondary dark:text-slate-500 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-icons-outlined text-[10px]">event_repeat</span>
                                                        {schedule.frequency}
                                                    </span>
                                                    <span>•</span>
                                                    <span className="text-slate-500 dark:text-slate-400">Next: {schedule.nextDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-900 dark:text-white">{schedule.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} XLM</p>
                                            <div className="flex items-center justify-end gap-2 mt-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium uppercase tracking-wide">
                                                    Active
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/30 rounded-b-xl flex justify-center">
                                <button className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">Manage all schedules</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'connect' && (
                        <div className="max-w-2xl mx-auto mt-8 px-4">
                            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl shadow-lg border border-border-light dark:border-border-dark relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-icons-outlined text-3xl">link</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Connect Worker</h2>
                                        <p className="text-secondary dark:text-slate-400 mt-1">Link a worker's account to automate payments.</p>
                                    </div>
                                </div>

                                <form className="space-y-6 relative z-10">
                                    <div>
                                        <label htmlFor="workerAccount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                            Worker Account Public Key
                                        </label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                id="workerAccount"
                                                className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono text-sm"
                                                placeholder="G..."
                                            />
                                            <span className="material-icons-outlined absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors">account_balance_wallet</span>
                                            <button type="button" className="absolute right-4 top-4 text-slate-400 hover:text-primary transition-colors">
                                                <span className="material-icons-outlined">qr_code_scanner</span>
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <span className="material-icons-outlined text-xs">info</span>
                                            Enter the Stellar public key (starts with G) of the worker.
                                        </p>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                            <span className="material-icons-outlined text-sm">auto_awesome</span>
                                            Automation Benefits
                                        </h4>
                                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                                            <li>Automatic salary disbursement on schedule</li>
                                            <li>Simplified one-click payments</li>
                                            <li>Instant payment history tracking</li>
                                        </ul>
                                    </div>

                                    <button type="button" className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                                        <span className="material-icons-outlined">link</span>
                                        Connect & Automate Payments
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>

                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        className="w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
                        onClick={() => document.documentElement.classList.toggle('dark')}
                    >
                        <span className="material-icons-outlined dark:hidden">dark_mode</span>
                        <span className="material-icons-outlined hidden dark:block">light_mode</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
