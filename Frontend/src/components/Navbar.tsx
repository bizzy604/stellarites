import { Link } from 'react-router-dom';
import { useState } from 'react';

// Mock Data for User Profiles [Account Number -> Profile]
const MOCK_PROFILES: Record<string, { name: string; role: string; rating: number; yearsWorked: number; avatar: string }> = {
    '1001': { name: 'Sarah Wilson', role: 'Domestic Worker', rating: 4.9, yearsWorked: 5, avatar: 'SW' },
    '1002': { name: 'James Rodriquez', role: 'Employer', rating: 5.0, yearsWorked: 8, avatar: 'JR' },
    '1003': { name: 'Emily Chen', role: 'Domestic Worker', rating: 4.7, yearsWorked: 3, avatar: 'EC' },
    '1004': { name: 'Michael Chang', role: 'Employer', rating: 4.8, yearsWorked: 12, avatar: 'MC' },
};

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<typeof MOCK_PROFILES['1001'] | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!searchQuery.trim()) return;

        const profile = MOCK_PROFILES[searchQuery.trim()];
        if (profile) {
            setSearchResult(profile);
            setIsModalOpen(true);
        } else {
            setError('Account not found');
            // Optional: Clear error after a few seconds
            setTimeout(() => setError(''), 3000);
        }
    };

    return (
        <>
            <nav className="fixed w-full z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="h-16 w-16 md:w-40 text-text-light dark:text-white">
                                    {/* Mobile Logo */}
                                    <img
                                        alt="Paytrace Logo"
                                        className="h-full w-full object-contain dark:invert md:hidden"
                                        src="/logo.png"
                                    />
                                    {/* Desktop Logo */}
                                    <img
                                        alt="Paytrace Logo"
                                        className="h-full w-full object-contain dark:invert hidden md:block"
                                        src="/logo1.png"
                                    />
                                </div>
                            </Link>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4 lg:px-8 lg:ml-6 lg:justify-end">
                            <div className="max-w-lg w-full lg:max-w-xs relative hidden md:block">
                                <form onSubmit={handleSearch}>
                                    <label htmlFor="search" className="sr-only">Search</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-icons-outlined text-gray-400 text-lg">search</span>
                                        </div>
                                        <input
                                            id="search"
                                            name="search"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className={`block w-full pl-10 pr-3 py-2 border ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-primary'} rounded-full leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-1 sm:text-sm transition-colors`}
                                            placeholder="Search Account ID..."
                                            type="search"
                                        />
                                    </div>
                                    {error && (
                                        <div className="absolute top-full left-0 mt-2 w-full text-xs text-red-500 font-medium px-3">
                                            {error}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link
                                to="/auth/signin"
                                className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors font-medium"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/auth/signup"
                                className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md"
                            >
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex lg:hidden items-center ml-4">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:text-primary focus:outline-none"
                            >
                                <span className="material-icons-outlined text-2xl">
                                    {isMobileMenuOpen ? 'close' : 'menu'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Dropdown */}
                {isMobileMenuOpen && (
                    <div className="lg:hidden absolute top-20 left-0 w-full bg-white dark:bg-background-dark border-b border-gray-100 dark:border-gray-800 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
                        <div className="relative">
                            <form onSubmit={handleSearch}>
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-4 pr-10 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Search Account ID..."
                                    type="search"
                                />
                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </form>
                        </div>
                        <Link
                            to="/auth/signin"
                            className="text-center py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/auth/signup"
                            className="text-center py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-md"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Get Started
                        </Link>
                    </div>
                )}
            </nav>

            {/* Profile Search Result Modal */}
            {
                isModalOpen && searchResult && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                            {/* Decorative Header */}
                            <div className="h-24 bg-gradient-to-br from-blue-600 via-primary to-purple-700 relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                                <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
                            </div>

                            {/* Content */}
                            <div className="px-6 pb-6 relative">
                                {/* Avatar */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 p-1.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                                            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-600 dark:text-slate-300 border-4 border-white dark:border-slate-900">
                                                {searchResult.avatar}
                                            </div>
                                        </div>
                                        {/* Verified Badge */}
                                        <div className="absolute bottom-1 right-1 bg-blue-500 text-white rounded-full p-1 shadow-lg border-2 border-white dark:border-slate-900" title="Verified Account">
                                            <span className="material-icons-outlined text-xs font-bold block">check</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-14 text-center space-y-2">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            {searchResult.name}
                                        </h3>
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-semibold uppercase tracking-wide mt-1 border border-blue-100 dark:border-blue-800">
                                            {searchResult.role}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3 mt-6 py-4 border-t border-b border-slate-100 dark:border-slate-800">
                                        <div className="group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center justify-center gap-1.5 text-yellow-500 mb-1">
                                                <span className="material-icons-outlined text-xl group-hover:scale-110 transition-transform">star</span>
                                                <span className="text-xl font-bold text-slate-900 dark:text-white">{searchResult.rating}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Rating</div>
                                        </div>
                                        <div className="group p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
                                                <span className="material-icons-outlined text-xl group-hover:scale-110 transition-transform">work_history</span>
                                                <span className="text-xl font-bold text-slate-900 dark:text-white">{searchResult.yearsWorked}</span>
                                                <span className="text-xs font-medium text-slate-400 self-end mb-0.5">yrs</span>
                                            </div>
                                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Experience</div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="mt-6">
                                        <button
                                            onClick={() => setIsModalOpen(false)}
                                            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
