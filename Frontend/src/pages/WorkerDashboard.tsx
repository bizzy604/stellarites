import { useState } from 'react';
import { Link } from 'react-router-dom';
import WithdrawModal from '../components/WithdrawModal';

export default function WorkerDashboard() {
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'account' | 'transactions'>('account');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const balance = 4250.00;

    const transactions = [
        { id: 1, title: 'Salary Payment', subtitle: 'From: Mr. Anderson', type: 'income', amount: 1200.00, fiatAmount: 150.00, date: 'Oct 24, 2023', time: '10:30 AM', status: 'Completed' },
        { id: 2, title: 'M-Pesa Withdrawal', subtitle: 'To: 0712 *** 789', type: 'expense', amount: 300.00, fiatAmount: 37.50, date: 'Oct 23, 2023', time: '02:15 PM', status: 'Completed' },
        { id: 3, title: 'Groceries', subtitle: 'Naivas Supermarket', type: 'expense', amount: 50.00, fiatAmount: 6.25, date: 'Oct 22, 2023', time: '06:45 PM', status: 'Completed' },
        { id: 4, title: 'Freelance Work', subtitle: 'Project X Milestone', type: 'income', amount: 450.00, fiatAmount: 56.25, date: 'Oct 21, 2023', time: '11:00 AM', status: 'Pending' },
        { id: 5, title: 'Electric Bill', subtitle: 'KPLC Postpaid', type: 'expense', amount: 25.00, fiatAmount: 3.12, date: 'Oct 20, 2023', time: '09:00 AM', status: 'Completed' },
    ];

    const handleDeposit = () => {
        // Mock M-Pesa deposit
        alert("Initiating M-Pesa Deposit STK Push...");
    };

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
                            Worker Portal
                        </div>
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left ${activeTab === 'account'
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-icons-outlined text-2xl mr-3">dashboard</span>
                            <span className="font-medium">Account</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left ${activeTab === 'transactions'
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-icons-outlined text-2xl mr-3">receipt_long</span>
                            <span className="font-medium">Transactions</span>
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
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Worker Dashboard</h1>
                            <p className="text-secondary dark:text-slate-400 mt-1 text-sm">Welcome back. Manage your earnings.</p>
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

                    {activeTab === 'account' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                            <div className="bg-blue-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-blue-100 dark:border-slate-700 relative overflow-hidden shadow-sm">
                                <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-blue-900 dark:text-blue-100 font-medium flex items-center gap-2">
                                            <span className="material-icons-outlined text-lg">account_balance_wallet</span>
                                            Wallet Balance
                                        </span>
                                        <span className="bg-white/60 dark:bg-slate-700/60 px-2 py-1 rounded text-xs font-semibold text-blue-700 dark:text-blue-300">XLM</span>
                                    </div>
                                    <div className="mb-6">
                                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">≈ $531.25 USD</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleDeposit}
                                            className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-icons-outlined text-sm">add</span>
                                            Deposit (M-Pesa)
                                        </button>
                                        <button className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                            <span className="material-icons-outlined text-sm">arrow_outward</span>
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Linked Details</h3>
                                    <button className="text-primary text-sm hover:underline">Edit</button>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-600 dark:text-slate-300">
                                            <span className="material-icons-outlined">phone_iphone</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">M-Pesa Number</p>
                                            <p className="text-xs text-secondary dark:text-slate-400">0712 *** 789</p>
                                        </div>
                                        <span className="ml-auto material-icons-outlined text-green-500 text-lg">check_circle</span>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg border border-dashed border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <span className="material-icons-outlined">add</span>
                                        </div>
                                        <p className="text-sm font-medium text-secondary dark:text-slate-400 group-hover:text-primary transition-colors">Link new account</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
                            <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-slate-800 dark:text-white">All Transactions</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsWithdrawModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium mr-2"
                                    >
                                        <span className="material-icons-outlined text-lg">payments</span>
                                        Withdraw
                                    </button>
                                    <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <span className="material-icons-outlined text-lg">filter_list</span>
                                    </button>
                                    <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                        <span className="material-icons-outlined text-lg">download</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold">
                                        <tr>
                                            <th className="px-6 py-4">Transaction</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Amount</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
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
                                                            <p className="font-medium text-slate-900 dark:text-white">{tx.title}</p>
                                                            <p className="text-xs text-secondary dark:text-slate-500">{tx.subtitle}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary dark:text-slate-400">
                                                    {tx.date}<br />
                                                    <span className="text-xs text-slate-400">{tx.time}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
                                                        }`}>
                                                        {tx.type === 'income' ? '+' : '-'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} XLM
                                                    </span>
                                                    <p className="text-xs text-slate-400">≈ ${tx.fiatAmount.toFixed(2)}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tx.status === 'Completed'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'Completed' ? 'bg-green-500' : 'bg-yellow-500'
                                                            }`}></span>
                                                        {tx.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
                                                        <span className="material-icons-outlined">more_horiz</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/30 rounded-b-xl flex justify-center">
                                <button className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">View all transactions</button>
                            </div>
                        </div>
                    )}
                </div>

                <WithdrawModal
                    isOpen={isWithdrawModalOpen}
                    onClose={() => setIsWithdrawModalOpen(false)}
                    balance={balance}
                />

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
