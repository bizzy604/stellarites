import { Link } from 'react-router-dom';

export default function Dashboard() {
    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-sans antialiased transition-colors duration-200 h-screen overflow-hidden flex">
            {/* Sidebar */}
            <aside className="w-64 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark flex flex-col justify-between hidden md:flex z-10 transition-colors duration-200">
                <div>
                    <div className="h-20 flex items-center px-8 border-b border-border-light dark:border-border-dark">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-16 h-16 relative flex-shrink-0">
                                <img
                                    alt="Paytrace Logo"
                                    className="w-full h-full object-contain filter dark:invert"
                                    src="/logo.png"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuC31-VBCSxvPJzd5n4F6L6zmi0TjGKyOa71kj7aPAbJGyX4MzwnVJdEK4tvoNUL7rZn89UwqAHVo3N9loHNvNMEFs67c5Te9rzLe94PH_tBaLDCY_rXPPXGST-fUKTe5JDwyH1NDuo5K5lZ9d0PUL2AT3mKP2DKrM1ZIc_GREPTKXI2mxDW9LGy2VewAB6DC5J5CJ41avAzGpV0dFcIq8FVtICKUaWxA5bVcn4AT9n2AZFgLH4X63iWBr4XnVttDByvf6Q0O6WUUc_r";
                                    }}
                                />
                            </div>
                        </Link>
                    </div>
                    <nav className="mt-8 px-4 space-y-2">
                        <a href="#" className="flex items-center px-4 py-3 bg-primary/10 text-primary dark:text-blue-400 rounded-lg group transition-colors">
                            <span className="material-icons-outlined text-2xl mr-3 group-hover:text-primary-dark">dashboard</span>
                            <span className="font-medium">Account</span>
                        </a>
                        <a href="#" className="flex items-center px-4 py-3 text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group transition-colors">
                            <span className="material-icons-outlined text-2xl mr-3">receipt_long</span>
                            <span className="font-medium">Transactions</span>
                        </a>
                        <a href="#" className="flex items-center px-4 py-3 text-secondary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg group transition-colors">
                            <span className="material-icons-outlined text-2xl mr-3">payments</span>
                            <span className="font-medium">Withdraw</span>
                        </a>
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
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <img
                                alt="Paytrace Logo"
                                className="w-8 h-8 object-contain filter dark:invert"
                                src="/logo.png"
                            />
                        </div>
                    </div>
                    <button className="text-secondary dark:text-slate-300">
                        <span className="material-icons-outlined">menu</span>
                    </button>
                </header>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
                            <p className="text-secondary dark:text-slate-400 mt-1 text-sm">Welcome back, Maria. Here's your financial summary.</p>
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 space-y-8">
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
                                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">4,250.00</h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">≈ $531.25 USD</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2">
                                            <span className="material-icons-outlined text-sm">add</span>
                                            Deposit
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
                                            <span className="material-icons-outlined">account_balance</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Citibank Checking</p>
                                            <p className="text-xs text-secondary dark:text-slate-400">**** 4589</p>
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

                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">Refer a friend</h4>
                                        <p className="text-indigo-100 text-sm mb-4">Earn 50 XLM for every domestic worker you refer to Paytrace.</p>
                                        <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 px-4 rounded-lg backdrop-blur-sm transition-colors">
                                            Get Invite Link
                                        </button>
                                    </div>
                                    <span className="material-icons-outlined text-4xl opacity-50">card_giftcard</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm h-full flex flex-col">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-semibold text-lg text-slate-800 dark:text-white">Recent Transactions</h3>
                                    <div className="flex gap-2">
                                        <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <span className="material-icons-outlined text-lg">filter_list</span>
                                        </button>
                                        <button className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                            <span className="material-icons-outlined text-lg">download</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto flex-1">
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
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center flex-shrink-0">
                                                            <span className="material-icons-outlined text-lg">arrow_downward</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white">Salary Payment</p>
                                                            <p className="text-xs text-secondary dark:text-slate-500">From: Mr. Anderson</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-secondary dark:text-slate-400">
                                                    Oct 24, 2023<br />
                                                    <span className="text-xs text-slate-400">10:30 AM</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-semibold text-slate-900 dark:text-white">+ 1,200.00 XLM</span>
                                                    <p className="text-xs text-slate-400">≈ $150.00</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        Completed
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
                                                        <span className="material-icons-outlined">more_horiz</span>
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* More rows... */}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 border-t border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/30 rounded-b-xl flex justify-center">
                                    <button className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">View all transactions</button>
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
