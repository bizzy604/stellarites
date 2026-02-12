import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createAccount } from '../../services/accounts';
import { saveSession, clearSession } from '../../services/session';

export default function SignUp() {
    const navigate = useNavigate();
    const [role, setRole] = useState<'worker' | 'employer'>('worker');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Clear any stale session so the user starts fresh
    useEffect(() => { clearSession(); }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;

        if (!phone) {
            setError('Phone number is required.');
            return;
        }

        setLoading(true);
        try {
            const result = await createAccount({ phone, name, role, send_sms: true });

            saveSession({
                worker_id: result.worker_id,
                stellar_public_key: result.stellar_public_key,
                phone: result.phone,
                name: result.name,
                role: result.role as 'worker' | 'employer',
            });

            navigate('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Account creation failed.';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-body min-h-screen h-full flex flex-col items-center justify-center p-4 py-12 transition-colors duration-200 relative overflow-y-auto">
            {/* Back Button */}
            <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-subtext-light dark:text-subtext-dark hover:text-primary transition-colors">
                <span className="material-icons-outlined">arrow_back</span>
                <span className="font-medium">Back to Home</span>
            </Link>

            <nav className="absolute top-0 right-0 w-full p-6 flex justify-end items-center pointer-events-none">
                <div className="hidden md:flex gap-4 text-sm font-medium text-subtext-light dark:text-subtext-dark pointer-events-auto">
                    <a href="#" className="hover:text-primary transition-colors">About</a>
                    <a href="#" className="hover:text-primary transition-colors">Support</a>
                </div>
            </nav>

            <main className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link to="/" className="flex items-center gap-3 transition-transform hover:scale-105">
                        {/* Mobile Logo */}
                        <img
                            alt="Kazi Chain Logo"
                            className="h-12 w-12 object-contain dark:invert md:hidden"
                            src="/logo.png"
                        />
                        {/* Desktop Logo */}
                        <img
                            alt="Kazi Chain Logo"
                            className="h-16 w-48 object-contain dark:invert hidden md:block"
                            src="/logo1.png"
                        />
                    </Link>
                </div>
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden transition-colors duration-200">
                    <div className="pt-10 pb-6 px-8 text-center">
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">Create your account</h1>
                        <p className="text-subtext-light dark:text-subtext-dark text-sm">
                            Join the secure payment network for domestic workers on Stellar.
                        </p>
                    </div>

                    <form className="px-8 pb-10 space-y-5" onSubmit={handleSubmit}>
                        {/* Role Selector */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">I am a...</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">work_outline</span>
                                </div>
                                <select
                                    id="role"
                                    name="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as 'worker' | 'employer')}
                                    className="block w-full pl-10 pr-10 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out appearance-none"
                                >
                                    <option value="worker">Domestic Worker</option>
                                    <option value="employer">Employer</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">expand_more</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Full Name</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">person</span>
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="John Doe"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Phone Number</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">phone</span>
                                </div>
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="+254 712 345 678"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                />
                            </div>
                            <p className="mt-1 text-xs text-subtext-light dark:text-subtext-dark">A Stellar wallet will be created for this number.</p>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">
                                {error}
                            </div>
                        )}

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    name="terms"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="terms" className="font-medium text-text-light dark:text-text-dark">
                                    I agree to the <a href="#" className="text-primary hover:text-primary-hover underline decoration-1 underline-offset-2">Terms of Service</a> and <a href="#" className="text-primary hover:text-primary-hover underline decoration-1 underline-offset-2">Privacy Policy</a>
                                </label>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Creating Account…' : 'Create Account'}
                        </button>
                    </form>
                </div>

                <p className="mt-8 text-center text-sm text-subtext-light dark:text-subtext-dark">
                    Already have an account?{' '}
                    <Link to="/auth/signin" className="font-medium text-primary hover:text-primary-hover transition-colors">
                        Sign in
                    </Link>
                </p>

                <div className="mt-8 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-subtext-light dark:text-subtext-dark opacity-75">
                        <span className="material-icons-outlined text-sm">shield</span>
                        <span>Secured by Stellar Network</span>
                    </div>
                    <p className="text-xs text-subtext-light dark:text-subtext-dark opacity-50">© 2026 Kazi Chain Inc.</p>
                </div>
            </main>

            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl dark:opacity-10"></div>
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-300 opacity-5 rounded-full blur-3xl dark:opacity-5"></div>
            </div>
        </div>
    );
}
