import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getProfile } from '../services/accounts';
import type { WorkerProfile } from '../types';

export default function Profile() {
    const { accountId } = useParams<{ accountId: string }>();
    const [profile, setProfile] = useState<WorkerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!accountId) return;
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const data = await getProfile(accountId!);
                if (!cancelled) setProfile(data);
            } catch {
                if (!cancelled) setError('Account not found.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [accountId]);

    if (loading) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen">
                <Navbar />
                <div className="pt-32 pb-20 px-4 text-center">
                    <p className="text-gray-600 dark:text-gray-400">Loading profile…</p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen">
                <Navbar />
                <div className="pt-32 pb-20 px-4 text-center">
                    <p className="text-gray-600 dark:text-gray-400">{error || 'Account not found.'}</p>
                    <Link to="/" className="mt-4 inline-block text-primary hover:underline">Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark min-h-screen">
            <Navbar />
            <main className="pt-32 pb-20 px-4 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-slate-800">
                    <div className="h-32 bg-gradient-to-br from-blue-600 via-primary to-purple-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    </div>
                    <div className="px-6 pb-8 pt-8">
                        <div className="text-center space-y-4">
                            <p className="text-3xl font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                                {(profile.name ?? 'NA').slice(0, 2).toUpperCase()}
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {profile.name ?? 'Unknown'}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-800">
                                {profile.role ?? profile.worker_type ?? 'Worker'}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono break-all">
                                {profile.public_key}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mt-8 py-6 border-t border-b border-slate-100 dark:border-slate-800">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-center gap-2 text-blue-500 mb-1">
                                        <span className="material-icons-outlined text-2xl">build</span>
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{profile.skills.length}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Skills</div>
                                    {profile.skills.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1 justify-center">
                                            {profile.skills.map((s, i) => (
                                                <span key={i} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-[10px] font-medium">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-center gap-2 text-yellow-500 mb-1">
                                        <span className="material-icons-outlined text-2xl">work</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-white">{profile.experience ?? '—'}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Experience</div>
                                </div>
                            </div>

                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm"
                            >
                                <span className="material-icons-outlined text-lg">arrow_back</span>
                                Back to Home
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
