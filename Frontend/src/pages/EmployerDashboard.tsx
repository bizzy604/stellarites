import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSession, clearSession } from '../services/session';
import { getBalance, resolveAccount, fundAccount } from '../services/accounts';
import { getPaymentHistory, sendPayment } from '../services/payments';
import { getEmployerSchedules, createSchedule, updateScheduleStatus, getEmployerClaims, updateClaimStatus } from '../services/schedules';
import { getEligibleReviewees, submitReview, getReviewsFor, getUserRating } from '../services/reviews';
import type { PaymentRecord, BalanceItem, SendPaymentResponse, ResolveResponse, Schedule, PaymentClaim, EligibleReviewee, UserReview, UserRating } from '../types';

export default function EmployerDashboard() {
    const navigate = useNavigate();
    const session = getSession();
    const publicKey = session?.stellar_public_key ?? '';

    const handleLogout = () => { clearSession(); navigate('/auth/signin'); };

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'connect' | 'reviews'>('overview');
    const [showBalance, setShowBalance] = useState(true);

    // Copy-to-clipboard feedback
    const [copiedField, setCopiedField] = useState('');

    // ── Friendbot funding ─────────────────────────────────────────
    const [funding, setFunding] = useState(false);
    const [fundMsg, setFundMsg] = useState('');

    const handleFund = async () => {
        if (!publicKey || funding) return;
        setFunding(true);
        setFundMsg('');
        try {
            const res = await fundAccount(publicKey);
            setFundMsg(res.message);
            // Refresh balance
            const balRes = await getBalance(publicKey);
            setBalances(balRes.balances);
            const xlm = balRes.balances.find(b => b.asset_type === 'native');
            setBalance(xlm ? parseFloat(xlm.balance) : 0);
        } catch (err: unknown) {
            setFundMsg(err instanceof Error ? err.message : 'Funding failed.');
        } finally {
            setFunding(false);
            setTimeout(() => setFundMsg(''), 5000);
        }
    };

    // ── Live data ────────────────────────────────────────────────
    const [balance, setBalance] = useState<number>(0);
    const [balances, setBalances] = useState<BalanceItem[]>([]);
    const [transactions, setTransactions] = useState<(PaymentRecord & { type: string })[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!publicKey) return;
        let cancelled = false;

        async function load() {
            setLoadingData(true);
            try {
                const [balRes, histRes] = await Promise.allSettled([
                    getBalance(publicKey),
                    getPaymentHistory(publicKey, 20),
                ]);

                if (cancelled) return;

                if (balRes.status === 'fulfilled') {
                    setBalances(balRes.value.balances);
                    const xlm = balRes.value.balances.find(b => b.asset_type === 'native');
                    setBalance(xlm ? parseFloat(xlm.balance) : 0);
                }

                if (histRes.status === 'fulfilled') {
                    const enriched = histRes.value.payments.map(p => ({
                        ...p,
                        type: p.to_account === publicKey ? 'income' : 'expense',
                    }));
                    setTransactions(enriched);
                }
            } catch { /* best-effort */ }
            finally { if (!cancelled) setLoadingData(false); }
        }

        load();
        return () => { cancelled = true; };
    }, [publicKey]);

    // ── Pay Worker state ─────────────────────────────────────────
    const [payWorkerKey, setPayWorkerKey] = useState('');
    const [payAmount, setPayAmount] = useState('');
    const [payMemo, setPayMemo] = useState('');
    const [payStep, setPayStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');
    const [payResult, setPayResult] = useState<SendPaymentResponse | null>(null);
    const [payError, setPayError] = useState('');

    // Live-resolve worker ID as user types
    const [resolvedDest, setResolvedDest] = useState<ResolveResponse | null>(null);
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        const id = payWorkerKey.trim();
        if (!id || id.length < 3) { setResolvedDest(null); return; }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setResolving(true);
            try {
                const r = await resolveAccount(id);
                if (!cancelled) setResolvedDest(r);
            } catch {
                if (!cancelled) setResolvedDest(null);
            } finally {
                if (!cancelled) setResolving(false);
            }
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [payWorkerKey]);

    const handlePayWorker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!publicKey) return;
        setPayStep('processing');
        setPayError('');
        try {
            const result = await sendPayment({
                sender: session?.worker_id ?? publicKey,
                destination: payWorkerKey.trim(),
                amount: payAmount,
                memo: payMemo || undefined,
            });
            setPayResult(result);
            setPayStep('success');
            // Refresh transactions
            getPaymentHistory(publicKey, 20).then((res) => {
                setTransactions(res.payments.map(p => ({ ...p, type: p.to_account === publicKey ? 'income' : 'expense' })));
            });
            // Refresh balance
            getBalance(publicKey).then((res) => {
                const xlm = res.balances.find(b => b.asset_type === 'native');
                setBalance(xlm ? parseFloat(xlm.balance) : 0);
            });
        } catch (err: unknown) {
            setPayError(err instanceof Error ? err.message : 'Payment failed.');
            setPayStep('error');
        }
    };

    // ── Schedules & Claims state ───────────────────────────────────
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [claims, setClaims] = useState<PaymentClaim[]>([]);
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [schedWorker, setSchedWorker] = useState('');
    const [schedAmount, setSchedAmount] = useState('');
    const [schedFreq, setSchedFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
    const [schedDate, setSchedDate] = useState('');
    const [schedMemo, setSchedMemo] = useState('');
    const [schedSubmitting, setSchedSubmitting] = useState(false);
    const [schedError, setSchedError] = useState('');

    // Resolve schedule worker ID live
    const [schedResolved, setSchedResolved] = useState<ResolveResponse | null>(null);
    const [schedResolving, setSchedResolving] = useState(false);
    useEffect(() => {
        const id = schedWorker.trim();
        if (!id || id.length < 3) { setSchedResolved(null); return; }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setSchedResolving(true);
            try {
                const r = await resolveAccount(id);
                if (!cancelled) setSchedResolved(r);
            } catch {
                if (!cancelled) setSchedResolved(null);
            } finally {
                if (!cancelled) setSchedResolving(false);
            }
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [schedWorker]);

    // Load schedules & claims
    useEffect(() => {
        if (!session?.worker_id) return;
        let cancelled = false;
        async function load() {
            try {
                const [s, c] = await Promise.allSettled([
                    getEmployerSchedules(session!.worker_id),
                    getEmployerClaims(session!.worker_id),
                ]);
                if (cancelled) return;
                if (s.status === 'fulfilled') setSchedules(s.value);
                if (c.status === 'fulfilled') setClaims(c.value);
            } catch { /* best-effort */ }
        }
        load();
        return () => { cancelled = true; };
    }, [session?.worker_id]);

    const handleCreateSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.worker_id) return;
        setSchedSubmitting(true);
        setSchedError('');
        try {
            const newSched = await createSchedule({
                employer_id: session.worker_id,
                worker_id: schedWorker.trim().toUpperCase(),
                amount: schedAmount,
                frequency: schedFreq,
                next_payment_date: schedDate || undefined,
                memo: schedMemo || undefined,
            });
            setSchedules(prev => [...prev, newSched]);
            setShowScheduleForm(false);
            setSchedWorker(''); setSchedAmount(''); setSchedMemo(''); setSchedDate('');
        } catch (err: unknown) {
            setSchedError(err instanceof Error ? err.message : 'Failed to create schedule.');
        } finally {
            setSchedSubmitting(false);
        }
    };

    const handleToggleSchedule = async (sched: Schedule) => {
        const newStatus = sched.status === 'active' ? 'paused' : 'active';
        try {
            const updated = await updateScheduleStatus(sched.schedule_id, newStatus);
            setSchedules(prev => prev.map(s => s.schedule_id === updated.schedule_id ? updated : s));
        } catch { /* ignore */ }
    };

    const handleCancelSchedule = async (scheduleId: string) => {
        try {
            const updated = await updateScheduleStatus(scheduleId, 'cancelled');
            setSchedules(prev => prev.map(s => s.schedule_id === updated.schedule_id ? updated : s));
        } catch { /* ignore */ }
    };

    const handleClaimAction = async (claimId: string, action: 'approved' | 'rejected') => {
        try {
            const updated = await updateClaimStatus(claimId, action);
            setClaims(prev => prev.map(c => c.claim_id === updated.claim_id ? updated : c));
        } catch { /* ignore */ }
    };

    // ── Reviews state ─────────────────────────────────────────────
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
            const newReview = await submitReview({
                reviewer_id: session.worker_id,
                reviewee_id: reviewTarget.reviewee_id,
                rating: reviewRating,
                comment: reviewComment,
                schedule_id: reviewTarget.schedule_id,
            });
            setReceivedReviews(prev => prev); // doesn't change received, but refresh
            setEligibleReviewees(prev => prev.filter(
                er => !(er.reviewee_id === reviewTarget.reviewee_id && er.schedule_id === reviewTarget.schedule_id)
            ));
            setReviewFeedback(`Review submitted for ${reviewTarget.reviewee_name || reviewTarget.reviewee_id}!`);
            setReviewTarget(null);
            setReviewRating(5);
            setReviewComment('');
            // Refresh received reviews
            getReviewsFor(session.worker_id).then(setReceivedReviews).catch(() => {});
            void newReview;
        } catch (err: unknown) {
            setReviewFeedback(err instanceof Error ? err.message : 'Failed to submit review.');
        } finally {
            setReviewSubmitting(false);
            setTimeout(() => setReviewFeedback(''), 5000);
        }
    };

    void balances; void loadingData;

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
                            <span className="material-icons-outlined text-2xl mr-3">send</span>
                            <span className="font-medium">Pay Worker</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('reviews')}
                            className={`w-full flex items-center px-4 py-3 rounded-lg group transition-colors text-left ${activeTab === 'reviews'
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
                        </button>
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
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employer Dashboard</h1>
                            <p className="text-secondary dark:text-slate-400 mt-1 text-sm">Welcome back. Manage your domestic workers.</p>
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
                                        <span className="bg-white/60 dark:bg-slate-700/60 px-2 py-1 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">KSH</span>
                                    </div>
                                    <div className="mb-6">
                                        <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                            {showBalance ? balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '••••••'}
                                        </h2>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                            {showBalance ? `≈ $${(balance * 0.125).toFixed(2)} USD` : '≈ $•••••• USD'}
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
                                        <button
                                            onClick={handleFund}
                                            disabled={funding}
                                            className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 px-4 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {funding ? (
                                                <>
                                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    Funding…
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-icons-outlined text-sm">add</span>
                                                    Add Funds
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {fundMsg && (
                                        <p className={`text-xs mt-3 text-center ${fundMsg.toLowerCase().includes('fail') || fundMsg.toLowerCase().includes('error') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                            {fundMsg}
                                        </p>
                                    )}
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
                                    {transactions.slice(0, 5).map((tx) => (
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
                    )}

                    {/* Account Details Card */}
                    {activeTab === 'overview' && (
                        <div className="mt-8 max-w-4xl bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <span className="material-icons-outlined">badge</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Account Details</h3>
                                    <p className="text-xs text-secondary dark:text-slate-400">Your account info &mdash; share your Employer ID with workers</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {/* Employer / Worker ID */}
                                <div className="flex items-center justify-between p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <span className="material-icons-outlined text-slate-400 text-lg">tag</span>
                                        <div>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Account ID</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{session?.worker_id ?? '—'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(session?.worker_id ?? ''); setCopiedField('worker_id'); setTimeout(() => setCopiedField(''), 2000); }}
                                        className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-primary"
                                        title="Copy Account ID"
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
                                {/* Name, Role, Phone */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Name</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{session?.name || '—'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Role</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5 capitalize">{session?.role || '—'}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-slate-800/50">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-0.5">{session?.phone || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Scheduled Payments (live) ──────────────────────── */}
                    {activeTab === 'overview' && (
                        <div className="mt-8 max-w-4xl bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Scheduled Payments</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">Recurring automated payments to your workers</p>
                                </div>
                                <button
                                    onClick={() => setShowScheduleForm(!showScheduleForm)}
                                    className="text-primary text-sm hover:underline font-medium flex items-center gap-1"
                                >
                                    <span className="material-icons-outlined text-sm">{showScheduleForm ? 'close' : 'add'}</span>
                                    {showScheduleForm ? 'Cancel' : 'Add Schedule'}
                                </button>
                            </div>

                            {/* Create Schedule Form */}
                            {showScheduleForm && (
                                <form onSubmit={handleCreateSchedule} className="p-6 border-b border-border-light dark:border-border-dark bg-blue-50/50 dark:bg-slate-800/30 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Worker ID</label>
                                            <input
                                                type="text"
                                                value={schedWorker}
                                                onChange={(e) => setSchedWorker(e.target.value)}
                                                required
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="NW-XXXXXXXX"
                                            />
                                            {schedResolving && <p className="text-xs text-slate-400 mt-1">Looking up...</p>}
                                            {schedResolved && !schedResolving && (
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                                    <span className="material-icons-outlined text-sm">check_circle</span>
                                                    {schedResolved.name || schedResolved.worker_id}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Amount (KSH)</label>
                                            <input
                                                type="number"
                                                value={schedAmount}
                                                onChange={(e) => setSchedAmount(e.target.value)}
                                                required
                                                step="0.01"
                                                min="0.01"
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Frequency</label>
                                            <select
                                                value={schedFreq}
                                                onChange={(e) => setSchedFreq(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            >
                                                <option value="weekly">Weekly</option>
                                                <option value="biweekly">Bi-weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={schedDate}
                                                onChange={(e) => setSchedDate(e.target.value)}
                                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Memo (optional)</label>
                                        <input
                                            type="text"
                                            value={schedMemo}
                                            onChange={(e) => setSchedMemo(e.target.value)}
                                            maxLength={60}
                                            className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="e.g. Monthly salary"
                                        />
                                    </div>
                                    {schedError && <p className="text-xs text-red-500">{schedError}</p>}
                                    <button
                                        type="submit"
                                        disabled={schedSubmitting}
                                        className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-60 flex items-center gap-2"
                                    >
                                        {schedSubmitting ? (
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        ) : (
                                            <span className="material-icons-outlined text-sm">schedule</span>
                                        )}
                                        Create Schedule
                                    </button>
                                </form>
                            )}

                            {/* Schedules list */}
                            <div className="divide-y divide-border-light dark:divide-border-dark">
                                {schedules.filter(s => s.status !== 'cancelled').length === 0 && (
                                    <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                        No scheduled payments yet. Click "Add Schedule" to create one.
                                    </div>
                                )}
                                {schedules.filter(s => s.status !== 'cancelled').map((sched) => (
                                    <div key={sched.schedule_id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
                                                {sched.worker_id.slice(0, 6)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white font-mono text-sm">{sched.worker_id}</p>
                                                <div className="flex items-center gap-2 text-xs text-secondary dark:text-slate-500 mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-icons-outlined text-[10px]">event_repeat</span>
                                                        {sched.frequency}
                                                    </span>
                                                    <span>·</span>
                                                    <span>Next: {sched.next_payment_date}</span>
                                                    {sched.memo && <><span>·</span><span className="italic">{sched.memo}</span></>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <p className="font-bold text-slate-900 dark:text-white">{parseFloat(sched.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</p>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                                    sched.status === 'active'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                                }`}>
                                                    {sched.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleToggleSchedule(sched)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-primary transition-colors"
                                                    title={sched.status === 'active' ? 'Pause' : 'Resume'}
                                                >
                                                    <span className="material-icons-outlined text-sm">
                                                        {sched.status === 'active' ? 'pause' : 'play_arrow'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleCancelSchedule(sched.schedule_id)}
                                                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Cancel schedule"
                                                >
                                                    <span className="material-icons-outlined text-sm">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Worker Claims ─────────────────────────────────── */}
                    {activeTab === 'overview' && claims.length > 0 && (
                        <div className="mt-8 max-w-4xl bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                            <div className="p-6 border-b border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Payment Requests from Workers</h3>
                                    {claims.filter(c => c.status === 'pending').length > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                                            {claims.filter(c => c.status === 'pending').length}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-secondary dark:text-slate-400 mt-1">Workers requesting payment or reminders</p>
                            </div>
                            <div className="divide-y divide-border-light dark:divide-border-dark">
                                {claims.map((claim) => (
                                    <div key={claim.claim_id} className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                                                claim.status === 'pending'
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                                    : claim.status === 'approved'
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                                <span className="material-icons-outlined text-lg">
                                                    {claim.status === 'pending' ? 'hourglass_top' : claim.status === 'approved' ? 'check' : 'close'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white text-sm">
                                                    <span className="font-mono">{claim.worker_id}</span> requests <span className="font-bold">{parseFloat(claim.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                                </p>
                                                {claim.message && (
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 italic">"{claim.message}"</p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-0.5">{new Date(claim.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {claim.status === 'pending' ? (
                                                <>
                                                    <button
                                                        onClick={() => handleClaimAction(claim.claim_id, 'approved')}
                                                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleClaimAction(claim.claim_id, 'rejected')}
                                                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 text-xs font-semibold rounded-lg transition-colors"
                                                    >
                                                        Reject
                                                    </button>
                                                </>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide ${
                                                    claim.status === 'approved'
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                                }`}>
                                                    {claim.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Reviews Tab ─────────────────────────────── */}
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
                                            {myRating.count > 0 ? `Based on ${myRating.count} review${myRating.count !== 1 ? 's' : ''}` : 'No reviews yet'}
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

                            {/* Write a Review */}
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                                <div className="p-6 border-b border-border-light dark:border-border-dark">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Review Your Workers</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">
                                        You can review workers you've had a payment schedule with for 3+ months
                                    </p>
                                </div>
                                {eligibleReviewees.length === 0 && !reviewTarget && (
                                    <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                        <span className="material-icons-outlined text-4xl text-slate-300 dark:text-slate-600 block mb-2">hourglass_empty</span>
                                        No workers eligible for review yet. Reviews unlock after 3 months of a payment schedule.
                                    </div>
                                )}
                                {eligibleReviewees.length > 0 && !reviewTarget && (
                                    <div className="divide-y divide-border-light dark:divide-border-dark">
                                        {eligibleReviewees.map((er) => (
                                            <div key={`${er.reviewee_id}-${er.schedule_id}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
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
                                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs font-mono">
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
                                                placeholder="Share your experience working with this person..."
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
                            <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm">
                                <div className="p-6 border-b border-border-light dark:border-border-dark">
                                    <h3 className="font-semibold text-slate-800 dark:text-white">Reviews About You</h3>
                                    <p className="text-sm text-secondary dark:text-slate-400 mt-1">What workers are saying about you</p>
                                </div>
                                <div className="divide-y divide-border-light dark:divide-border-dark">
                                    {receivedReviews.length === 0 && (
                                        <div className="p-8 text-center text-secondary dark:text-slate-400 text-sm">
                                            No reviews received yet.
                                        </div>
                                    )}
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
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'connect' && (
                        <div className="max-w-2xl mx-auto mt-8 px-4">
                            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-2xl shadow-lg border border-border-light dark:border-border-dark relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-icons-outlined text-3xl">send</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pay Worker</h2>
                                        <p className="text-secondary dark:text-slate-400 mt-1">Send KSH using a Worker ID (e.g. NW-63A758A8).</p>
                                    </div>
                                </div>

                                {payStep === 'input' && (
                                    <form className="space-y-5 relative z-10" onSubmit={handlePayWorker}>
                                        <div>
                                            <label htmlFor="workerAccount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Worker ID
                                            </label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    id="workerAccount"
                                                    value={payWorkerKey}
                                                    onChange={(e) => setPayWorkerKey(e.target.value)}
                                                    required
                                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono text-sm"
                                                    placeholder="NW-XXXXXXXX"
                                                />
                                                <span className="material-icons-outlined absolute left-4 top-4 text-slate-400 group-focus-within:text-primary transition-colors">badge</span>
                                            </div>
                                            {resolving && (
                                                <p className="text-xs text-slate-400 mt-1">Looking up account...</p>
                                            )}
                                            {resolvedDest && !resolving && (
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                                    <span className="material-icons-outlined text-sm">check_circle</span>
                                                    {resolvedDest.name || resolvedDest.worker_id} &mdash; {resolvedDest.role}
                                                </p>
                                            )}
                                            {!resolvedDest && !resolving && payWorkerKey.trim().length >= 3 && (
                                                <p className="text-xs text-red-500 mt-1">Account not found</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="payAmount" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Amount (KSH)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    id="payAmount"
                                                    value={payAmount}
                                                    onChange={(e) => setPayAmount(e.target.value)}
                                                    required
                                                    step="0.01"
                                                    min="0.01"
                                                    className="w-full pl-4 pr-16 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium"
                                                    placeholder="0.00"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                                    <span className="text-slate-500 font-medium">KSH</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="payMemo" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                                Memo <span className="font-normal text-slate-400">(optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="payMemo"
                                                value={payMemo}
                                                onChange={(e) => setPayMemo(e.target.value)}
                                                maxLength={28}
                                                className="w-full pl-4 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
                                                placeholder="e.g. Salary Jan 2026"
                                            />
                                        </div>

                                        <button type="submit" className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                                            <span className="material-icons-outlined">send</span>
                                            Send Payment
                                        </button>
                                    </form>
                                )}

                                {payStep === 'processing' && (
                                    <div className="text-center py-12">
                                        <div className="w-14 h-14 border-4 border-blue-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="font-medium text-slate-900 dark:text-white">Signing & submitting transaction…</p>
                                        <p className="text-xs text-slate-400 mt-1">This may take a few seconds</p>
                                    </div>
                                )}

                                {payStep === 'success' && payResult && (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                            <span className="material-icons-outlined text-3xl">check_circle</span>
                                        </div>
                                        <div>
                                            <p className="text-xl font-bold text-slate-900 dark:text-white">Payment Sent!</p>
                                            <p className="text-sm text-slate-500 mt-1">{payResult.amount} KSH sent successfully</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-left space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">To</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {payResult.to_worker_id ?? payResult.to_account.slice(0, 12) + '…' + payResult.to_account.slice(-6)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Amount</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{payResult.amount} KSH</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500">Tx Hash</span>
                                                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{payResult.tx_hash?.slice(0, 16)}…</span>
                                            </div>
                                        </div>
                                        <a
                                            href={payResult.explorer_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-primary font-semibold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                        >
                                            <span className="material-icons-outlined text-lg">open_in_new</span>
                                            View on Stellar Explorer
                                        </a>
                                        <div>
                                            <button
                                                onClick={() => { setPayStep('input'); setPayWorkerKey(''); setPayAmount(''); setPayMemo(''); setPayResult(null); }}
                                                className="text-sm text-primary hover:underline mt-2"
                                            >
                                                Make another payment
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {payStep === 'error' && (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                                            <span className="material-icons-outlined text-3xl">error</span>
                                        </div>
                                        <p className="font-bold text-slate-900 dark:text-white">Payment Failed</p>
                                        <p className="text-sm text-red-500">{payError}</p>
                                        <button
                                            onClick={() => setPayStep('input')}
                                            className="text-sm text-primary hover:underline"
                                        >
                                            Try again
                                        </button>
                                    </div>
                                )}
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
