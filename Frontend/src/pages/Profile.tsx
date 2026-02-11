import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { MOCK_PROFILES } from '../data/mockProfiles';

export default function Profile() {
    const { accountId } = useParams<{ accountId: string }>();
    const profile = accountId ? MOCK_PROFILES[accountId] : null;

    if (!profile) {
        return (
            <div className="bg-background-light dark:bg-background-dark min-h-screen">
                <Navbar />
                <div className="pt-32 pb-20 px-4 text-center">
                    <p className="text-gray-600 dark:text-gray-400">Account not found.</p>
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
                                {profile.avatar}
                            </p>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {profile.name}
                            </h1>
                            <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-800">
                                {profile.role}
                            </span>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Account ID: {accountId}</p>

                            <div className="grid grid-cols-2 gap-4 mt-8 py-6 border-t border-b border-slate-100 dark:border-slate-800">
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-center gap-2 text-yellow-500 mb-1">
                                        <span className="material-icons-outlined text-2xl">star</span>
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{profile.rating}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Rating</div>
                                </div>
                                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <div className="flex items-center justify-center gap-2 text-blue-500 mb-1">
                                        <span className="material-icons-outlined text-2xl">work</span>
                                        <span className="text-2xl font-bold text-slate-900 dark:text-white">{profile.jobsCompleted ?? profile.jobsContracted}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                                        {profile.jobsCompleted !== undefined ? 'Jobs Completed' : 'Jobs Contracted'}
                                    </div>
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
