import { useState } from 'react';
import { Link } from 'react-router-dom';


export default function WorkerDashboard() {
    const [activeTab, setActiveTab] = useState<'account' | 'transactions' | 'reviews'>('account');
    const [showReviewNotification, setShowReviewNotification] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Pagination State
    const [transactionPage, setTransactionPage] = useState(0);

    // Balance Visibility State
    const [showBalance, setShowBalance] = useState(true);

    // Withdraw State
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawStep, setWithdrawStep] = useState<'input' | 'processing' | 'success'>('input');

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawStep('processing');
        // Simulate API call
        setTimeout(() => {
            setWithdrawStep('success');
        }, 1500);
    };
    const balance = 4250.00;

    const transactions = [
        { id: 1, title: 'Salary Payment', subtitle: 'From: Mr. Anderson', type: 'income', amount: 1200.00, fiatAmount: 150.00, date: 'Oct 24, 2023', time: '10:30 AM', status: 'Completed' },
        { id: 2, title: 'M-Pesa Withdrawal', subtitle: 'To: 0712 *** 789', type: 'expense', amount: 300.00, fiatAmount: 37.50, date: 'Oct 23, 2023', time: '02:15 PM', status: 'Completed' },
        { id: 3, title: 'Groceries', subtitle: 'Naivas Supermarket', type: 'expense', amount: 50.00, fiatAmount: 6.25, date: 'Oct 22, 2023', time: '06:45 PM', status: 'Completed' },
        { id: 4, title: 'Freelance Work', subtitle: 'Project X Milestone', type: 'income', amount: 450.00, fiatAmount: 56.25, date: 'Oct 21, 2023', time: '11:00 AM', status: 'Pending' },
        { id: 5, title: 'Electric Bill', subtitle: 'KPLC Postpaid', type: 'expense', amount: 25.00, fiatAmount: 3.12, date: 'Oct 20, 2023', time: '09:00 AM', status: 'Completed' },
    ];

    const reviews = [
        { id: 1, employer: 'TechStart Corp', rating: 5, comment: 'Excellent work on the frontend migration. Very professional and timely.', date: '2 days ago', avatar: 'TS' },
        { id: 2, employer: 'GreenLeaf Ltd', rating: 4, comment: 'Good communication and quality code. Would hire again.', date: '1 week ago', avatar: 'GL' }
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
                        <button
                            onClick={() => {
                                setActiveTab('reviews');
                                setShowReviewNotification(false);
                            }}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left relative ${activeTab === 'reviews'
                                ? 'bg-primary/10 text-primary dark:text-blue-400'
                                : 'text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <span className="material-icons-outlined text-2xl mr-3">star_rate</span>
                            <span className="font-medium">Reviews</span>
                            {showReviewNotification && (
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                            )}
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
                        <div className="space-y-8 max-w-5xl">
                            {/* Row 1: Balance & Withdraw */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Wallet Balance */}
                                <div className="bg-blue-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-blue-100 dark:border-slate-700 relative overflow-hidden shadow-sm h-full">
                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-3xl"></div>
                                    <div className="relative z-10 flex flex-col h-full justify-between">
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-blue-900 dark:text-blue-100 font-medium flex items-center gap-2">
                                                <span className="material-icons-outlined text-lg">account_balance_wallet</span>
                                                Wallet Balance
                                                <button
                                                    onClick={() => setShowBalance(!showBalance)}
                                                    className="ml-2 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white transition-colors focus:outline-none"
                                                    title={showBalance ? "Hide Balance" : "Show Balance"}
                                                >
                                                    <span className="material-icons-outlined text-lg">
                                                        {showBalance ? 'visibility' : 'visibility_off'}
                                                    </span>
                                                </button>
                                            </span>
                                            <span className="bg-white/60 dark:bg-slate-700/60 px-2 py-1 rounded text-xs font-semibold text-blue-700 dark:text-blue-300">XLM</span>
                                        </div>
                                        <div className="mb-4">
                                            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                                {showBalance ? balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {showBalance ? `≈ $531.25 USD` : '≈ $•••••• USD'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Inline Withdraw Card */}
                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                    <div className="flex items-center mb-6">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3">
                                            <span className="material-icons-outlined">payments</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">Withdraw Funds</h3>
                                            <p className="text-xs text-secondary dark:text-slate-400">Transfer to M-Pesa</p>
                                        </div>
                                    </div>

                                    {withdrawStep === 'input' && (
                                        <form onSubmit={handleWithdraw}>
                                            <div className="mb-4">
                                                <label htmlFor="amount" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                                    Amount (XLM)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        id="amount"
                                                        value={withdrawAmount}
                                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                                        className="block w-full pl-4 pr-12 py-3 border border-border-light dark:border-border-dark rounded-xl bg-gray-50 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        required
                                                    />
                                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">XLM</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="submit"
                                                className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                Withdraw Now
                                            </button>
                                        </form>
                                    )}

                                    {withdrawStep === 'processing' && (
                                        <div className="text-center py-4">
                                            <div className="w-12 h-12 border-4 border-blue-200 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Processing...</p>
                                        </div>
                                    )}

                                    {withdrawStep === 'success' && (
                                        <div className="text-center py-2">
                                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <span className="material-icons-outlined text-2xl">check</span>
                                            </div>
                                            <p className="font-bold text-slate-900 dark:text-white">Success!</p>
                                            <button
                                                onClick={() => {
                                                    setWithdrawStep('input');
                                                    setWithdrawAmount('');
                                                }}
                                                className="mt-4 text-sm text-primary hover:underline"
                                            >
                                                Make another withdrawal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Linked Details */}
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


                            {/* Upcoming Payments Card */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Upcoming Payments</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800/20">
                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                                            <span className="material-icons-outlined">payments</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">Salary Payment</p>
                                            <p className="text-xs text-secondary dark:text-slate-400">From Mr. Anderson • Due in 2 days</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="font-bold text-slate-900 dark:text-white">1,200.00 XLM</p>
                                            <span className="text-[10px] font-medium text-secondary dark:text-slate-500 uppercase tracking-wide">Pending</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Recent Transactions */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm flex flex-col">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Recent Transactions</h3>
                                    <div className="flex gap-2">
                                    </div>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-border-dark">
                                    {transactions.slice(0, 3).map((tx) => (
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
                                    {transactions.length === 0 && (
                                        <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                            No recent transactions found.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                    }

                    {
                        activeTab === 'transactions' && (
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">All Transactions</h3>
                                    <div className="flex gap-2">

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
                                    <button
                                        onClick={() => setActiveTab('transactions')}
                                        className="text-sm font-medium text-primary hover:text-primary-dark transition-colors flex items-center gap-1"
                                    >
                                        View all transactions
                                        <span className="material-icons-outlined text-sm">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        )
                    }

                    {
                        activeTab === 'reviews' && (
                            <div className="space-y-6">
                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-800/30">
                                        <div>
                                            <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
                                                My Reviews
                                                <span className="px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-bold border border-yellow-200 dark:border-yellow-700/50">4.8 Average</span>
                                            </h3>
                                            <p className="text-secondary dark:text-slate-400 text-sm mt-1">What employers are saying about your work</p>
                                        </div>
                                        <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                            <span className="material-icons-outlined text-sm">share</span>
                                            Share Profile
                                        </button>
                                    </div>
                                    <div className="divide-y divide-border-light dark:divide-border-dark">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
                                                        {review.avatar}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-semibold text-slate-900 dark:text-white">{review.employer}</h4>
                                                            <span className="text-xs text-secondary dark:text-slate-500">{review.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mb-2">
                                                            {[...Array(5)].map((_, i) => (
                                                                <span key={i} className={`material-icons-outlined text-[16px] ${i < review.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}>star</span>
                                                            ))}
                                                        </div>
                                                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-sm">"{review.comment}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center border-t border-border-light dark:border-border-dark">
                                        <button className="text-primary hover:text-primary-dark font-medium text-sm flex items-center justify-center gap-1">
                                            View all reviews
                                            <span className="material-icons-outlined text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    }
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
