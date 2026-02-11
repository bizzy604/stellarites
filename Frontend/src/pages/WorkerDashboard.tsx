import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../services/session';
import { getBalance } from '../services/accounts';
import { getPaymentHistory, getPaymentStats, offrampToMpesa } from '../services/payments';
import { getWorkerReviews, getEligibleReviewees, submitReview, getReviewsFor, getUserRating } from '../services/reviews';
import { getWorkerSchedules, createClaim, getWorkerClaims } from '../services/schedules';
import type { PaymentRecord, PaymentStats, ReviewData, BalanceItem, Schedule, PaymentClaim, EligibleReviewee, UserReview, UserRating, OfframpResponse } from '../types';


export default function WorkerDashboard() {
    const navigate = useNavigate();
    const session = getSession();
    const publicKey = session?.stellar_public_key ?? '';

    const handleLogout = () => { clearSession(); navigate('/auth/signin'); };

    const [activeTab, setActiveTab] = useState<'account' | 'transactions' | 'reviews'>('account');
    const [showReviewNotification, setShowReviewNotification] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Balance Visibility State
    const [showBalance, setShowBalance] = useState(true);

    // Copy-to-clipboard feedback
    const [copiedField, setCopiedField] = useState('');

    // M-Pesa Off-Ramp State
    const [offrampAmount, setOfframpAmount] = useState('');
    const [offrampPhone, setOfframpPhone] = useState(session?.phone ?? '');
    const [offrampStep, setOfframpStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');
    const [offrampError, setOfframpError] = useState('');
    const [offrampResult, setOfframpResult] = useState<OfframpResponse | null>(null);

    // ── Live data state ─────────────────────────────────────────────
    const [balance, setBalance] = useState<number>(0);
    const [balances, setBalances] = useState<BalanceItem[]>([]);
    const [transactions, setTransactions] = useState<(PaymentRecord & { type: string })[]>([]);
    const [stats, setStats] = useState<PaymentStats | null>(null);
    const [reviews, setReviews] = useState<ReviewData[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    // ── Fetch live data on mount ────────────────────────────────────
    useEffect(() => {
        if (!publicKey) return;
        let cancelled = false;

        async function load() {
            setLoadingData(true);
            try {
                const [balRes, histRes, statsRes, revRes] = await Promise.allSettled([
                    getBalance(publicKey),
                    getPaymentHistory(publicKey, 20),
                    getPaymentStats(publicKey),
                    getWorkerReviews(session?.worker_id ?? publicKey),
                ]);

                if (cancelled) return;

                // Balance
                if (balRes.status === 'fulfilled') {
                    setBalances(balRes.value.balances);
                    const xlm = balRes.value.balances.find(
                        (b) => b.asset_type === 'native',
                    );
                    setBalance(xlm ? parseFloat(xlm.balance) : 0);
                }

                // Transactions – enrich with direction
                if (histRes.status === 'fulfilled') {
                    const enriched = histRes.value.payments.map((p) => ({
                        ...p,
                        type: p.to_account === publicKey ? 'income' : 'expense',
                    }));
                    setTransactions(enriched);
                }

                // Stats
                if (statsRes.status === 'fulfilled') setStats(statsRes.value);

                // Reviews
                if (revRes.status === 'fulfilled') setReviews(revRes.value);
            } catch {
                /* best-effort */
            } finally {
                if (!cancelled) setLoadingData(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [publicKey]);

    // ── M-Pesa Off-Ramp handler ────────────────────────────────────
    const handleOfframp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) return;

        const val = parseFloat(offrampAmount);
        if (isNaN(val) || val <= 0) {
            setOfframpError('Please enter a valid amount');
            return;
        }
        if (val > balance) {
            setOfframpError('Insufficient balance');
            return;
        }
        if (!offrampPhone.trim()) {
            setOfframpError('Please enter your M-Pesa phone number');
            return;
        }

        setOfframpStep('processing');
        setOfframpError('');
        try {
            const result = await offrampToMpesa({
                sender: session?.worker_id ?? publicKey,
                phone: offrampPhone.trim(),
                amount: offrampAmount,
            });
            setOfframpResult(result);
            setOfframpStep('success');
            // Refresh balance & transactions
            getBalance(publicKey).then((res) => {
                const native = res.balances.find(b => b.asset_type === 'native');
                setBalance(native ? parseFloat(native.balance) : 0);
            });
            getPaymentHistory(publicKey, 20).then((res) => {
                setTransactions(res.payments.map(p => ({ ...p, type: p.to_account === publicKey ? 'income' : 'expense' })));
            });
        } catch (err: unknown) {
            setOfframpError(err instanceof Error ? err.message : 'Off-ramp failed. Please try again.');
            setOfframpStep('error');
        }
    };

    // ── Schedules & Claims state ───────────────────────────────────
    const [workerSchedules, setWorkerSchedules] = useState<Schedule[]>([]);
    const [workerClaims, setWorkerClaims] = useState<PaymentClaim[]>([]);
    const [claimingScheduleId, setClaimingScheduleId] = useState<string | null>(null);
    const [claimMessage, setClaimMessage] = useState('');
    const [claimSubmitting, setClaimSubmitting] = useState(false);
    const [claimFeedback, setClaimFeedback] = useState('');

    useEffect(() => {
        if (!session?.worker_id) return;
        let cancelled = false;
        async function load() {
            try {
                const [s, c] = await Promise.allSettled([
                    getWorkerSchedules(session!.worker_id),
                    getWorkerClaims(session!.worker_id),
                ]);
                if (cancelled) return;
                if (s.status === 'fulfilled') setWorkerSchedules(s.value);
                if (c.status === 'fulfilled') setWorkerClaims(c.value);
            } catch { /* best-effort */ }
        }
        load();
        return () => { cancelled = true; };
    }, [session?.worker_id]);

    const handleClaimPayment = async (sched: Schedule) => {
        if (!session?.worker_id) return;
        setClaimSubmitting(true);
        setClaimFeedback('');
        try {
            const newClaim = await createClaim({
                schedule_id: sched.schedule_id,
                worker_id: session.worker_id,
                employer_id: sched.employer_id,
                amount: sched.amount,
                message: claimMessage || `Payment request for schedule ${sched.schedule_id}`,
            });
            setWorkerClaims(prev => [newClaim, ...prev]);
            setClaimFeedback('Claim submitted successfully!');
            setClaimingScheduleId(null);
            setClaimMessage('');
            setTimeout(() => setClaimFeedback(''), 3000);
        } catch (err: unknown) {
            setClaimFeedback(err instanceof Error ? err.message : 'Failed to submit claim.');
            setTimeout(() => setClaimFeedback(''), 5000);
        } finally {
            setClaimSubmitting(false);
        }
    };

    // ── Reviews state (app-based) ──────────────────────────────────
    const [eligibleReviewees, setEligibleReviewees] = useState<EligibleReviewee[]>([]);
    const [receivedReviews, setReceivedReviews] = useState<UserReview[]>([]);
    const [myRating, setMyRating] = useState<UserRating>({ avg_rating: 0, count: 0 });
    const [reviewTarget, setReviewTarget] = useState<EligibleReviewee | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewFeedback, setReviewFeedback] = useState('');

    useEffect(() => {
        if (!session?.worker_id) return;
        let cancelled = false;
        async function load() {
            try {
                const [e, r, rt] = await Promise.allSettled([
                    getEligibleReviewees(session!.worker_id),
                    getReviewsFor(session!.worker_id),
                    getUserRating(session!.worker_id),
                ]);
                if (cancelled) return;
                if (e.status === 'fulfilled') setEligibleReviewees(e.value);
                if (r.status === 'fulfilled') setReceivedReviews(r.value);
                if (rt.status === 'fulfilled') setMyRating(rt.value);
            } catch { /* best-effort */ }
        }
        load();
        return () => { cancelled = true; };
    }, [session?.worker_id]);

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.worker_id || !reviewTarget) return;
        setReviewSubmitting(true);
        setReviewFeedback('');
        try {
            await submitReview({
                reviewer_id: session.worker_id,
                reviewee_id: reviewTarget.reviewee_id,
                rating: reviewRating,
                comment: reviewComment,
                schedule_id: reviewTarget.schedule_id,
            });
            setEligibleReviewees(prev => prev.filter(
                er => !(er.reviewee_id === reviewTarget.reviewee_id && er.schedule_id === reviewTarget.schedule_id)
            ));
            setReviewFeedback(`Review submitted for ${reviewTarget.reviewee_name || reviewTarget.reviewee_id}!`);
            setReviewTarget(null);
            setReviewRating(5);
            setReviewComment('');
            getReviewsFor(session.worker_id).then(setReceivedReviews).catch(() => {});
            getUserRating(session.worker_id).then(setMyRating).catch(() => {});
        } catch (err: unknown) {
            setReviewFeedback(err instanceof Error ? err.message : 'Failed to submit review.');
        } finally {
            setReviewSubmitting(false);
            setTimeout(() => setReviewFeedback(''), 5000);
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────
    const _ = stats;
    void _; void balances; void loadingData;



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
                            {eligibleReviewees.length > 0 && (
                                <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold">
                                    {eligibleReviewees.length}
                                </span>
                            )}
                            {showReviewNotification && eligibleReviewees.length === 0 && (
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
                    <button onClick={handleLogout} className="w-full flex items-center px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg group transition-colors">
                        <span className="material-icons-outlined text-2xl mr-3">logout</span>
                        <span className="font-medium">Logout</span>
                    </button>
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
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Stellar Testnet</span>
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
                                            <span className="bg-white/60 dark:bg-slate-700/60 px-2 py-1 rounded text-xs font-semibold text-blue-700 dark:text-blue-300">KSH</span>
                                        </div>
                                        <div className="mb-4">
                                            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                                {showBalance ? balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
                                            </h2>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                                {showBalance ? `≈ $${(balance * 0.125).toFixed(2)} USD` : '≈ $•••••• USD'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* M-Pesa Off-Ramp Card */}
                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                    <div className="flex items-center mb-5">
                                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 p-1.5">
                                            <img
                                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                                alt="M-Pesa"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">Withdraw to M-Pesa</h3>
                                            <p className="text-xs text-secondary dark:text-slate-400">Off-ramp KSH to your phone</p>
                                        </div>
                                    </div>

                                    {offrampStep === 'input' && (
                                        <form onSubmit={handleOfframp} className="space-y-4">
                                            {/* M-Pesa Phone */}
                                            <div>
                                                <label htmlFor="offrampPhone" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                    M-Pesa Phone Number
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="material-icons-outlined text-green-500 text-lg">phone_android</span>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        id="offrampPhone"
                                                        value={offrampPhone}
                                                        onChange={(e) => { setOfframpPhone(e.target.value); setOfframpError(''); }}
                                                        className="block w-full pl-10 pr-4 py-3 border border-border-light dark:border-border-dark rounded-xl bg-gray-50 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
                                                        placeholder="0712 345 678"
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div>
                                                <label htmlFor="offrampAmount" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                                                    Amount (KSH)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        id="offrampAmount"
                                                        value={offrampAmount}
                                                        onChange={(e) => { setOfframpAmount(e.target.value); setOfframpError(''); }}
                                                        className="block w-full pl-4 pr-12 py-3 border border-border-light dark:border-border-dark rounded-xl bg-gray-50 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium text-lg"
                                                        placeholder="0.00"
                                                        step="0.01"
                                                        required
                                                    />
                                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 dark:text-gray-400 font-medium">KSH</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center mt-1.5">
                                                    {offrampError ? (
                                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                                            <span className="material-icons-outlined text-xs">error</span>
                                                            {offrampError}
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                            Available: <span className="font-medium text-slate-900 dark:text-white">{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                                        </p>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => setOfframpAmount(Math.max(0, balance - 1.5).toFixed(2))}
                                                        className="text-[10px] font-bold text-green-600 hover:text-green-700 uppercase"
                                                    >
                                                        Max
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Conversion Preview */}
                                            {offrampAmount && parseFloat(offrampAmount) > 0 && (
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/40">
                                                    <span className="material-icons-outlined text-green-600 text-lg">swap_horiz</span>
                                                    <div className="text-xs">
                                                        <span className="font-bold text-slate-900 dark:text-white">{parseFloat(offrampAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                                        <span className="text-slate-400 mx-1.5">&rarr;</span>
                                                        <span className="font-bold text-green-700 dark:text-green-300">KES {parseFloat(offrampAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        <span className="text-slate-400 ml-1">(1:1 rate)</span>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                className="w-full py-3.5 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                                            >
                                                <img
                                                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                                    alt=""
                                                    className="w-5 h-5 object-contain brightness-0 invert"
                                                />
                                                Withdraw to M-Pesa
                                            </button>
                                        </form>
                                    )}

                                    {offrampStep === 'processing' && (
                                        <div className="text-center py-6">
                                            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                                                <div className="absolute inset-0 border-4 border-green-100 dark:border-green-800 rounded-full"></div>
                                                <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                                <span className="material-icons-outlined text-3xl text-green-600 animate-pulse">phone_android</span>
                                            </div>
                                            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Processing Off-Ramp</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Converting <span className="font-bold">{parseFloat(offrampAmount).toLocaleString()} KSH</span> and sending to M-Pesa...
                                            </p>
                                            <div className="mt-4 space-y-2 text-left max-w-xs mx-auto">
                                                <div className="flex items-center gap-2 text-xs text-green-600">
                                                    <span className="material-icons-outlined text-sm">check_circle</span>
                                                    Burning KSH on Stellar...
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin"></div>
                                                    Sending KES to M-Pesa...
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {offrampStep === 'error' && (
                                        <div className="text-center py-4">
                                            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <span className="material-icons-outlined text-3xl">error</span>
                                            </div>
                                            <p className="font-bold text-slate-900 dark:text-white mb-1">Off-Ramp Failed</p>
                                            <p className="text-xs text-red-500 mb-4">{offrampError}</p>
                                            <button
                                                onClick={() => setOfframpStep('input')}
                                                className="text-sm text-primary hover:underline font-medium"
                                            >
                                                Try again
                                            </button>
                                        </div>
                                    )}

                                    {offrampStep === 'success' && offrampResult && (
                                        <div className="text-center py-3 space-y-4">
                                            <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                                                <span className="material-icons-outlined text-4xl text-green-600">check_circle</span>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Sent to M-Pesa!</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{offrampResult.message}</p>
                                            </div>

                                            {/* Transaction Details */}
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left space-y-2 border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">M-Pesa Transaction</span>
                                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{offrampResult.mpesa_transaction_id}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Phone</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{offrampResult.phone}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Amount Sent</span>
                                                    <span className="font-bold text-green-600">KES {parseFloat(offrampResult.amount_kes).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">KSH Burned</span>
                                                    <span className="font-medium text-slate-900 dark:text-white">{parseFloat(offrampResult.amount_ksh).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                                </div>
                                                {offrampResult.provider === 'demo' && (
                                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pt-1 border-t border-gray-200 dark:border-gray-600">
                                                        <span className="material-icons-outlined text-xs">info</span>
                                                        Demo mode — no real M-Pesa payout sent
                                                    </div>
                                                )}
                                            </div>

                                            {/* Stellar explorer link */}
                                            {offrampResult.stellar_explorer_url && (
                                                <a
                                                    href={offrampResult.stellar_explorer_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                                                >
                                                    <span className="material-icons-outlined text-sm">open_in_new</span>
                                                    View burn transaction on Stellar
                                                </a>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setOfframpStep('input');
                                                    setOfframpAmount('');
                                                    setOfframpResult(null);
                                                }}
                                                className="text-sm text-primary hover:underline font-medium"
                                            >
                                                Make another withdrawal
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 2: Account Details */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-icons-outlined">badge</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800 dark:text-white">Account Details</h3>
                                        <p className="text-xs text-secondary dark:text-slate-400">Share your Worker ID so employers can pay you</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {/* Worker ID */}
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <span className="material-icons-outlined text-slate-400 text-lg">tag</span>
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Worker ID</p>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{session?.worker_id ?? '—'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(session?.worker_id ?? ''); setCopiedField('worker_id'); setTimeout(() => setCopiedField(''), 2000); }}
                                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary"
                                            title="Copy Worker ID"
                                        >
                                            <span className="material-icons-outlined text-lg">{copiedField === 'worker_id' ? 'check' : 'content_copy'}</span>
                                        </button>
                                    </div>
                                    {/* Stellar Public Key */}
                                    <div className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="material-icons-outlined text-slate-400 text-lg flex-shrink-0">key</span>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stellar Public Key</p>
                                                <p className="text-xs font-medium text-slate-900 dark:text-white font-mono truncate">{publicKey || '—'}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { navigator.clipboard.writeText(publicKey); setCopiedField('public_key'); setTimeout(() => setCopiedField(''), 2000); }}
                                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary flex-shrink-0"
                                            title="Copy Public Key"
                                        >
                                            <span className="material-icons-outlined text-lg">{copiedField === 'public_key' ? 'check' : 'content_copy'}</span>
                                        </button>
                                    </div>
                                    {/* Name & Role */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Name</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{session?.name || '—'}</p>
                                        </div>
                                        <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 capitalize">{session?.role || '—'}</p>
                                        </div>
                                    </div>
                                    {/* Phone */}
                                    <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center gap-3">
                                            <span className="material-icons-outlined text-slate-400 text-lg">phone</span>
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                                                <p className="text-sm font-medium text-slate-900 dark:text-white">{session?.phone || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Upcoming Payments (live) */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                                <div className="p-6 border-b border-border-light dark:border-border-dark">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Upcoming Payments</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">Scheduled payments from your employers</p>
                                </div>
                                {claimFeedback && (
                                    <div className={`px-6 py-2 text-xs font-medium ${claimFeedback.toLowerCase().includes('fail') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        {claimFeedback}
                                    </div>
                                )}
                                <div className="divide-y divide-border-light dark:divide-border-dark">
                                    {workerSchedules.length === 0 && (
                                        <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                            No upcoming scheduled payments.
                                        </div>
                                    )}
                                    {workerSchedules.map((sched) => {
                                        const isOverdue = new Date(sched.next_payment_date) <= new Date();
                                        const alreadyClaimed = workerClaims.some(
                                            c => c.schedule_id === sched.schedule_id && c.status === 'pending'
                                        );
                                        return (
                                            <div key={sched.schedule_id} className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                            isOverdue
                                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                                        }`}>
                                                            <span className="material-icons-outlined">
                                                                {isOverdue ? 'warning' : 'payments'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                                From <span className="font-mono">{sched.employer_id}</span>
                                                            </p>
                                                            <div className="flex items-center gap-2 text-xs text-secondary dark:text-slate-500 mt-0.5">
                                                                <span className="flex items-center gap-1">
                                                                    <span className="material-icons-outlined text-[10px]">event_repeat</span>
                                                                    {sched.frequency}
                                                                </span>
                                                                <span>·</span>
                                                                <span className={isOverdue ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                                                                    {isOverdue ? 'Overdue:' : 'Next:'} {sched.next_payment_date}
                                                                </span>
                                                                {sched.memo && <><span>·</span><span className="italic">{sched.memo}</span></>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <p className="font-bold text-slate-900 dark:text-white">
                                                                {parseFloat(sched.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH
                                                            </p>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                                                isOverdue
                                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                                    : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                            }`}>
                                                                {isOverdue ? 'overdue' : 'scheduled'}
                                                            </span>
                                                        </div>
                                                        {!alreadyClaimed ? (
                                                            <button
                                                                onClick={() => setClaimingScheduleId(
                                                                    claimingScheduleId === sched.schedule_id ? null : sched.schedule_id
                                                                )}
                                                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                                            >
                                                                <span className="material-icons-outlined text-sm">front_hand</span>
                                                                Claim
                                                            </button>
                                                        ) : (
                                                            <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium uppercase">
                                                                Claimed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Claim form inline */}
                                                {claimingScheduleId === sched.schedule_id && (
                                                    <div className="mt-3 ml-14 flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={claimMessage}
                                                            onChange={(e) => setClaimMessage(e.target.value)}
                                                            placeholder="Optional message to employer..."
                                                            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:border-transparent"
                                                        />
                                                        <button
                                                            onClick={() => handleClaimPayment(sched)}
                                                            disabled={claimSubmitting}
                                                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1"
                                                        >
                                                            {claimSubmitting && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                                            Send Request
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* My Claims */}
                            {workerClaims.length > 0 && (
                                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                                    <div className="p-6 border-b border-border-light dark:border-border-dark">
                                        <h3 className="font-semibold text-slate-800 dark:text-white">My Payment Requests</h3>
                                        <p className="text-sm text-secondary dark:text-slate-400 mt-1">Claims you've submitted to employers</p>
                                    </div>
                                    <div className="divide-y divide-border-light dark:divide-border-dark">
                                        {workerClaims.map((claim) => (
                                            <div key={claim.claim_id} className="p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                                                        claim.status === 'pending'
                                                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                                            : claim.status === 'approved'
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                                    }`}>
                                                        <span className="material-icons-outlined text-sm">
                                                            {claim.status === 'pending' ? 'hourglass_top' : claim.status === 'approved' ? 'check' : 'close'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                            {parseFloat(claim.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH
                                                            <span className="text-slate-400 font-normal"> to </span>
                                                            <span className="font-mono text-xs">{claim.employer_id}</span>
                                                        </p>
                                                        {claim.message && (
                                                            <p className="text-xs text-slate-400 italic mt-0.5">"{claim.message}"</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                                    claim.status === 'pending'
                                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                        : claim.status === 'approved'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                }`}>
                                                    {claim.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Row 3: Recent Transactions */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm flex flex-col">
                                <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Recent Transactions</h3>
                                    <div className="flex gap-2">
                                    </div>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-border-dark">
                                    {transactions.slice(0, 3).map((tx) => (
                                        <a
                                            key={tx.id}
                                            href={tx.explorer_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group block"
                                        >
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
                                                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                        {tx.type === 'income'
                                                            ? <>From {tx.from_worker_id ?? tx.from_account.slice(0, 8) + '…'}</>
                                                            : <>To {tx.to_worker_id ?? tx.to_account.slice(0, 8) + '…'}</>
                                                        }
                                                    </p>
                                                    <p className="text-xs text-secondary dark:text-slate-500">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-sm ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                                                    {tx.type === 'income' ? '+' : '-'} {parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="material-icons-outlined text-sm text-slate-400 group-hover:text-primary transition-colors">open_in_new</span>
                                            </div>
                                        </a>
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
                                            {transactions.map((tx) => {
                                                const amt = parseFloat(tx.amount);
                                                const dt = new Date(tx.created_at);
                                                return (
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
                                                                <p className="font-medium text-slate-900 dark:text-white">
                                                                    {tx.type === 'income'
                                                                        ? <>From {tx.from_worker_id ?? tx.from_account.slice(0, 8) + '…'}</>
                                                                        : <>To {tx.to_worker_id ?? tx.to_account.slice(0, 8) + '…'}</>
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-secondary dark:text-slate-500 font-mono">
                                                                    {tx.type === 'income'
                                                                        ? tx.from_worker_id ?? `${tx.from_account.slice(0, 8)}…`
                                                                        : tx.to_worker_id ?? `${tx.to_account.slice(0, 8)}…`}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-secondary dark:text-slate-400">
                                                        {dt.toLocaleDateString()}<br />
                                                        <span className="text-xs text-slate-400">{dt.toLocaleTimeString()}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'
                                                            }`}>
                                                            {tx.type === 'income' ? '+' : '-'} {amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH
                                                        </span>
                                                        <p className="text-xs text-slate-400">≈ ${(amt * 0.125).toFixed(2)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Completed
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <a href={tx.explorer_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors">
                                                            <span className="material-icons-outlined">open_in_new</span>
                                                        </a>
                                                    </td>
                                                </tr>
                                                );
                                            })}
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

                    {activeTab === 'reviews' && (
                        <div className="space-y-8 max-w-4xl">
                            {/* My Rating */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
                                        <span className="material-icons-outlined text-3xl">star</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                            {myRating.count > 0 ? myRating.avg_rating.toFixed(1) : '—'}
                                            <span className="text-base font-normal text-slate-400 ml-1">/ 5</span>
                                        </h3>
                                        <p className="text-sm text-secondary dark:text-slate-400">
                                            {myRating.count > 0 ? `Based on ${myRating.count} review${myRating.count !== 1 ? 's' : ''}` : 'No reviews received yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Review Feedback */}
                            {reviewFeedback && (
                                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                                    reviewFeedback.toLowerCase().includes('fail') || reviewFeedback.toLowerCase().includes('error')
                                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600'
                                        : 'bg-green-50 dark:bg-green-900/20 text-green-600'
                                }`}>
                                    {reviewFeedback}
                                </div>
                            )}

                            {/* Write a Review for Employers */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                                <div className="p-6 border-b border-border-light dark:border-border-dark">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Review Your Employers</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">
                                        You can review employers who have had a payment schedule with you for 3+ months
                                    </p>
                                </div>
                                {eligibleReviewees.length === 0 && !reviewTarget && (
                                    <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                        <span className="material-icons-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-2">hourglass_empty</span>
                                        No employers eligible for review yet. Reviews unlock after 3 months of a payment schedule.
                                    </div>
                                )}
                                {eligibleReviewees.length > 0 && !reviewTarget && (
                                    <div className="divide-y divide-border-light dark:divide-border-dark">
                                        {eligibleReviewees.map((er) => (
                                            <div key={`${er.reviewee_id}-${er.schedule_id}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs font-mono">
                                                        {er.reviewee_id.slice(0, 6)}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                            {er.reviewee_name || er.reviewee_id}
                                                        </p>
                                                        <p className="text-xs text-secondary dark:text-slate-500">
                                                            <span className="font-mono">{er.reviewee_id}</span> · Since {new Date(er.relationship_since).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => setReviewTarget(er)}
                                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-icons-outlined text-sm">rate_review</span>
                                                    Write Review
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {reviewTarget && (
                                    <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs font-mono">
                                                {reviewTarget.reviewee_id.slice(0, 6)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                    Reviewing: {reviewTarget.reviewee_name || reviewTarget.reviewee_id}
                                                </p>
                                                <p className="text-xs text-secondary dark:text-slate-500 font-mono">{reviewTarget.reviewee_id}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReviewTarget(null)}
                                                className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-icons-outlined">close</span>
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Rating</label>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setReviewRating(star)}
                                                        className="focus:outline-none transition-transform hover:scale-110"
                                                    >
                                                        <span className={`material-icons-outlined text-3xl ${
                                                            star <= reviewRating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'
                                                        }`}>star</span>
                                                    </button>
                                                ))}
                                                <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">{reviewRating}/5</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Comment (optional)</label>
                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) => setReviewComment(e.target.value)}
                                                maxLength={500}
                                                rows={3}
                                                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                                placeholder="Share your experience working with this employer..."
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={reviewSubmitting}
                                            className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-60 flex items-center gap-2"
                                        >
                                            {reviewSubmitting ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                            ) : (
                                                <span className="material-icons-outlined text-sm">send</span>
                                            )}
                                            Submit Review
                                        </button>
                                    </form>
                                )}
                            </div>

                            {/* Received Reviews */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-border-light dark:border-border-dark">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Reviews About You</h3>
                                    <p className="text-secondary dark:text-slate-400 text-sm mt-1">What employers are saying about your work</p>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-border-dark">
                                    {receivedReviews.length === 0 && reviews.length === 0 && (
                                        <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                            No reviews received yet.
                                        </div>
                                    )}
                                    {/* App-based reviews */}
                                    {receivedReviews.map((review) => (
                                        <div key={review.review_id} className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                    {(review.reviewer_name || review.reviewer_id).slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                                            {review.reviewer_name || review.reviewer_id}
                                                        </p>
                                                        <span className="text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 mb-2">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <span key={s} className={`material-icons-outlined text-[16px] ${s <= review.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}>star</span>
                                                        ))}
                                                    </div>
                                                    {review.comment && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{review.comment}</p>
                                                    )}
                                                    {review.nft_asset_code && (
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 font-mono">
                                                                <span className="material-icons-outlined text-[10px]">token</span>
                                                                {review.nft_asset_code}
                                                            </span>
                                                            {review.explorer_url && (
                                                                <a
                                                                    href={review.explorer_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-1 text-primary hover:underline"
                                                                >
                                                                    <span className="material-icons-outlined text-[12px]">open_in_new</span>
                                                                    Verify on Stellar
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Legacy NFT reviews */}
                                    {reviews.map((review, idx) => (
                                        <div key={`nft-${idx}`} className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                                    {review.reviewer_type.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-slate-900 dark:text-white capitalize text-sm">{review.role} &ndash; {review.reviewer_type}</h4>
                                                        <span className="text-xs text-secondary dark:text-slate-500">{review.duration_months}mo</span>
                                                    </div>
                                                    <div className="flex items-center gap-0.5 mb-2">
                                                        {[...Array(5)].map((_, i) => (
                                                            <span key={i} className={`material-icons-outlined text-[16px] ${i < review.rating ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}>star</span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 font-mono">{review.stellar_asset}</span>
                                                        <span className={`capitalize ${review.status === 'claimable' ? 'text-yellow-600' : 'text-green-600'}`}>{review.status}</span>
                                                        {review.pdf_url && (
                                                            <a href={review.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">PDF</a>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
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
