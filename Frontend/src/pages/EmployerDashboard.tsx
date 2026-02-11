import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function EmployerDashboard() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const balance = 15000.00;

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
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-16 h-16 relative flex-shrink-0">
                                <img
                                    alt="Paytrace Logo"
                                    className="w-full h-full object-contain filter dark:invert"
                                    src="/logo.png"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuC31-VBCSxvPJzd5n4F6L6zmi0TjGKyOa71kj7aPAbJGyX4MzwnVJdEK4tvoNUL7rZn89UwqAHVo3N9loHNvNMEFs67c5Te9rzLe94PH_tBaLDCY_rXPPGSTD-fUKTe5JDwyH1NDuo5K5lZ9d0PUL2AT3mKP2DKrM1ZIc_GREPTKXI2mxDW9LGy2VewAB6DC5J5CJ41avAzGpV0dFcIq8FVtICKUaWxA5bVcn4AT9n2AZFgLH4X63iWBr4XnVttDByvf6Q0O6WUUc_r";
                                    }}
                                />
                            </div>
                        </Link>
                    </div>
                    <nav className="mt-8 px-4 space-y-2">
                        <div className="px-4 py-2 mb-4 text-xs font-semibold text-secondary uppercase tracking-wider">
                            Employer Portal
                        </div>
                        <button className="w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left bg-primary/10 text-primary dark:text-blue-400">
                            <span className="material-icons-outlined text-2xl mr-3">dashboard</span>
                            <span className="font-medium">Overview</span>
                        </button>
                        <button className="w-full flex items-center px-4 py-3 text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group transition-colors text-left">
                            <span className="material-icons-outlined text-2xl mr-3">people</span>
                            <span className="font-medium">My Workers</span>
                        </button>
                        <button className="w-full flex items-center px-4 py-3 text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group transition-colors text-left">
                            <span className="material-icons-outlined text-2xl mr-3">send</span>
                            <span className="font-medium">Pay Salaries</span>
                        </button>
                        <a href="#" className="flex items-center px-4 py-3 text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group transition-colors">
                            <span className="material-icons-outlined text-2xl mr-3">settings</span>
                            <span className="font-medium">Settings</span>
                        </a>
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
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img
                                alt="Paytrace Logo"
                                className="w-10 h-10 object-contain filter dark:invert"
                                src="/logo.png"
                            />
                        </div>
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
                                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">≈ $1,875.00 USD</p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                                        <span className="material-icons-outlined text-sm">send</span>
                                        Pay Salaries
                                    </button>
                                    <button className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                        <span className="material-icons-outlined text-sm">add</span>
                                        Add Funds
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
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
