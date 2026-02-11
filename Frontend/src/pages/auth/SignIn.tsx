import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SignIn() {
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Check if user exists in local storage (simulating backend)
        const users = JSON.parse(localStorage.getItem('paytrace_users') || '{}');
        const user = users[identifier.toLowerCase()];

        // Use stored role if found, otherwise fallback to mock logic
        const role = user?.role || (
            identifier.toLowerCase().includes('admin') || identifier.toLowerCase().includes('boss')
                ? 'employer'
                : 'worker'
        );

        localStorage.setItem('paytrace_role', role);
        navigate('/dashboard');
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-body min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-200 relative">
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
                            alt="Paytrace Logo"
                            className="h-12 w-12 object-contain dark:invert md:hidden"
                            src="/logo.png"
                        />
                        {/* Desktop Logo */}
                        <img
                            alt="Paytrace Logo"
                            className="h-16 w-48 object-contain dark:invert hidden md:block"
                            src="/logo1.png"
                        />
                    </Link>
                </div>
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden transition-colors duration-200">
                    <div className="pt-10 pb-6 px-8 text-center">
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">Sign in to your account</h1>
                        <p className="text-subtext-light dark:text-subtext-dark text-sm">
                            Welcome back to Paytrace.
                        </p>
                    </div>

                    <form className="px-8 pb-10 space-y-5" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Phone number or Email</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">person_outline</span>
                                </div>
                                <input
                                    id="identifier"
                                    name="identifier"
                                    type="text"
                                    autoComplete="email"
                                    required
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                    placeholder="user@example.com or +1234567890"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Password</label>
                                <div className="text-sm">
                                    <a href="#" className="font-medium text-primary hover:text-primary-hover transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">lock_outline</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <div className="flex items-start">
                            <div className="flex items-center h-5">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                />
                            </div>
                            <div className="ml-2 text-sm">
                                <label htmlFor="remember-me" className="font-medium text-text-light dark:text-text-dark">
                                    Remember me
                                </label>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-[1.01]"
                            >
                                Sign In
                            </button>
                        </div>
                    </form>

                    <div className="px-8 pb-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-card-light dark:bg-card-dark text-subtext-light dark:text-subtext-dark">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div>
                                <a
                                    href="#"
                                    className="w-full inline-flex justify-center py-2 px-4 border border-border-light dark:border-border-dark rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="sr-only">Sign in with Google</span>
                                    <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"></path>
                                    </svg>
                                </a>
                            </div>
                            <div>
                                <a
                                    href="#"
                                    className="w-full inline-flex justify-center py-2 px-4 border border-border-light dark:border-border-dark rounded-lg shadow-sm bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <span className="sr-only">Sign in with Wallet</span>
                                    <span className="material-icons-outlined w-5 h-5 text-center leading-5 text-gray-500 dark:text-gray-300">account_balance_wallet</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-t border-border-light dark:border-border-dark text-center">
                        <p className="text-sm text-subtext-light dark:text-subtext-dark">
                            Don't have an account?{' '}
                            <Link to="/auth/signup" className="font-medium text-primary hover:text-primary-hover transition-colors">
                                Create Account
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-xs text-subtext-light dark:text-subtext-dark opacity-75">
                        <span className="material-icons-outlined text-sm">shield</span>
                        <span>Secured by Stellar Network</span>
                    </div>
                    <p className="text-xs text-subtext-light dark:text-subtext-dark opacity-50">© 2026 Paytrace Inc.</p>
                </div>
            </main>

            <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary opacity-5 rounded-full blur-3xl dark:opacity-10"></div>
                <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-300 opacity-5 rounded-full blur-3xl dark:opacity-5"></div>
            </div>
        </div>
    );
}
