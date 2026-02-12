import { Link } from 'react-router-dom';
import { useState } from 'react';
import { resolveAccount, getBalance } from '../services/accounts';
import { getUserRating, getReviewsFor } from '../services/reviews';
import { getWorkerSchedules, getEmployerSchedules } from '../services/schedules';
import type { ResolveResponse, UserReview, UserRating, Schedule } from '../types';

export default function Navbar() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);

    // Search result state
    const [profile, setProfile] = useState<ResolveResponse | null>(null);
    const [rating, setRating] = useState<UserRating>({ avg_rating: 0, count: 0 });
    const [reviews, setReviews] = useState<UserReview[]>([]);
    const [jobsDone, setJobsDone] = useState(0);
    const [stellarVerified, setStellarVerified] = useState(false);
    const [nftVerifiedCount, setNftVerifiedCount] = useState(0);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const query = searchQuery.trim();
        if (!query) return;

        setSearching(true);
        try {
            const resolved = await resolveAccount(query);
            setProfile(resolved);

            // Fetch additional data in parallel
            const [balRes, ratRes, revRes, schedRes] = await Promise.allSettled([
                getBalance(resolved.stellar_public_key),
                getUserRating(resolved.worker_id),
                getReviewsFor(resolved.worker_id),
                resolved.role === 'worker'
                    ? getWorkerSchedules(resolved.worker_id)
                    : getEmployerSchedules(resolved.worker_id),
            ]);

            // Stellar verification: account exists on-chain with real balance
            if (balRes.status === 'fulfilled') {
                const native = balRes.value.balances.find(b => b.asset_type === 'native');
                setStellarVerified(native ? parseFloat(native.balance) > 0 : false);
            } else {
                setStellarVerified(false);
            }

            if (ratRes.status === 'fulfilled') setRating(ratRes.value);
            else setRating({ avg_rating: 0, count: 0 });

            if (revRes.status === 'fulfilled') {
                setReviews(revRes.value);
                // Count reviews that have been minted as NFTs on Stellar
                setNftVerifiedCount(revRes.value.filter(r => r.stellar_tx_hash).length);
            } else {
                setReviews([]);
                setNftVerifiedCount(0);
            }

            // Jobs done = unique counterparts from schedules
            if (schedRes.status === 'fulfilled') {
                const schedules = schedRes.value as Schedule[];
                const uniqueCounterparts = new Set(
                    schedules.map(s => resolved.role === 'worker' ? s.employer_id : s.worker_id)
                );
                setJobsDone(uniqueCounterparts.size);
            } else {
                setJobsDone(0);
            }

            setIsModalOpen(true);
        } catch {
            setError('Account not found. Try a Worker ID (NW-XXXX), Stellar key (G…), or phone number.');
            setTimeout(() => setError(''), 4000);
        } finally {
            setSearching(false);
        }
    };

    return (
        <>
            <nav className="fixed w-full z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <Link to="/" className="flex items-center gap-3">
                                <div className="h-24 w-24 md:w-64 text-text-light dark:text-white">
                                    <img alt="KaziChain Logo" className="h-full w-full object-contain dark:invert md:hidden" src="/logo1.png" />
                                    <img alt="KaziChain Logo" className="h-full w-full object-contain dark:invert hidden md:block" src="/logo1.png" />
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
                                            placeholder="ID, key, or phone…"
                                            type="search"
                                        />
                                    </div>
                                    {error && (
                                        <div className="absolute top-full left-0 mt-2 w-full text-xs text-red-500 font-medium px-3 bg-white dark:bg-slate-900 rounded-lg py-1.5 shadow-lg border border-red-100 dark:border-red-900">
                                            {error}
                                        </div>
                                    )}
                                    {searching && (
                                        <div className="absolute top-full left-0 mt-2 w-full text-xs text-primary font-medium px-3 flex items-center gap-1">
                                            <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></span>
                                            Searching…
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link to="/auth/signin" className="text-gray-600 dark:text-gray-300 hover:text-primary transition-colors font-medium">
                                Sign In
                            </Link>
                            <Link to="/auth/signup" className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-full text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm hover:shadow-md">
                                Get Started
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="flex lg:hidden items-center ml-4">
                            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:text-primary focus:outline-none">
                                <span className="material-icons-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
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
                                    placeholder="ID, key, or phone…"
                                    type="search"
                                />
                                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                                    <span className="material-icons-outlined">search</span>
                                </button>
                            </form>
                        </div>
                        <Link to="/auth/signin" className="text-center py-3 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
                            Sign In
                        </Link>
                        <Link to="/auth/signup" className="text-center py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-md" onClick={() => setIsMobileMenuOpen(false)}>
                            Get Started
                        </Link>
                    </div>
                )}
            </nav>

            {/* ─── Profile Search Result Modal ─── */}
            {isModalOpen && profile && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-white/10 max-h-[90vh] overflow-y-auto">

                        {/* Gradient Header */}
                        <div className="h-28 bg-gradient-to-br from-blue-600 via-primary to-purple-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                            >
                                <span className="material-icons-outlined text-lg">close</span>
                            </button>
                        </div>

                        {/* Avatar overlapping header */}
                        <div className="flex justify-center -mt-10 relative z-10">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl border-4 border-white dark:border-slate-900">
                                    {(profile.name || profile.worker_id).slice(0, 2).toUpperCase()}
                                </div>
                                {/* Stellar verification badge */}
                                {stellarVerified && (
                                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900" title="Verified on Stellar Network">
                                        <span className="material-icons-outlined text-white text-[14px]">verified</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 pb-6 pt-3">
                            {/* Name + Role + Verification */}
                            <div className="text-center mb-5">
                                <div className="flex items-center justify-center gap-1.5">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{profile.name || 'Unnamed'}</h3>
                                    {stellarVerified && (
                                        <span className="material-icons-outlined text-green-500 text-lg" title="Stellar Verified">verified</span>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${
                                        profile.role === 'employer'
                                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-purple-800'
                                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                                    }`}>
                                        <span className="material-icons-outlined text-[12px]">{profile.role === 'employer' ? 'business' : 'person'}</span>
                                        {profile.role}
                                    </span>
                                    {stellarVerified && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 border-green-100 dark:border-green-800">
                                            <span className="material-icons-outlined text-[12px]">shield</span>
                                            Stellar Verified
                                        </span>
                                    )}
                                    {nftVerifiedCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 border-amber-100 dark:border-amber-800">
                                            <span className="material-icons-outlined text-[12px]">token</span>
                                            {nftVerifiedCount} NFT Review{nftVerifiedCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-center gap-1 text-yellow-500 mb-0.5">
                                        <span className="material-icons-outlined text-lg">star</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                                            {rating.count > 0 ? rating.avg_rating.toFixed(1) : '—'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Rating</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="text-lg font-bold text-slate-900 dark:text-white mb-0.5">{rating.count}</div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Reviews</p>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center justify-center gap-1 text-blue-500 mb-0.5">
                                        <span className="material-icons-outlined text-lg">work_history</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">{jobsDone}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                        {profile.role === 'worker' ? 'Jobs Done' : 'Workers Hired'}
                                    </p>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-2.5 mb-5">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2.5">
                                        <span className="material-icons-outlined text-slate-400 text-lg">tag</span>
                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account ID</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{profile.worker_id}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(profile.worker_id)}
                                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        <span className="material-icons-outlined text-sm">content_copy</span>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="material-icons-outlined text-slate-400 text-lg flex-shrink-0">key</span>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stellar Public Key</p>
                                            <p className="text-xs font-medium text-slate-900 dark:text-white font-mono truncate">{profile.stellar_public_key}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(profile.stellar_public_key)}
                                        className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors flex-shrink-0"
                                    >
                                        <span className="material-icons-outlined text-sm">content_copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Reviews */}
                            {reviews.length > 0 && (
                                <div className="mb-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Recent Reviews</h4>
                                        {nftVerifiedCount > 0 && (
                                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-0.5">
                                                <span className="material-icons-outlined text-[10px]">verified</span>
                                                {nftVerifiedCount}/{reviews.length} on-chain
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                        {reviews.slice(0, 5).map((rev) => (
                                            <div key={rev.review_id} className={`p-3 rounded-xl border ${
                                                rev.stellar_tx_hash
                                                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/40'
                                                    : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                                            }`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {rev.reviewer_name || rev.reviewer_id}
                                                        </span>
                                                        {rev.stellar_tx_hash && (
                                                            <span className="material-icons-outlined text-green-500 text-[12px]" title="Verified on Stellar">verified</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 mb-1">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <span key={s} className={`material-icons-outlined text-[14px] ${s <= rev.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}>star</span>
                                                    ))}
                                                </div>
                                                {rev.comment && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{rev.comment}</p>
                                                )}
                                                {rev.nft_asset_code && (
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-[10px] font-mono">
                                                            <span className="material-icons-outlined text-[8px]">token</span>
                                                            {rev.nft_asset_code}
                                                        </span>
                                                        {rev.explorer_url && (
                                                            <a href={rev.explorer_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                                                                <span className="material-icons-outlined text-[10px]">open_in_new</span>
                                                                Verify on Stellar
                                                            </a>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Reviews placeholder */}
                            {reviews.length === 0 && (
                                <div className="mb-5 text-center p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="material-icons-outlined text-3xl text-slate-300 dark:text-slate-600 mb-1">rate_review</span>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">No reviews yet</p>
                                </div>
                            )}

                            {/* Close Button */}
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
