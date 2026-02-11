import { Link } from 'react-router-dom';

export default function SignUp() {
    return (
        <div className="bg-background-light dark:bg-background-dark font-body min-h-screen flex flex-col items-center justify-center p-4 transition-colors duration-200">
            <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                <Link to="/" className="flex items-center gap-2">
                    <div className="h-16 w-16 relative">
                        <img
                            alt="Paytrace Logo"
                            className="w-full h-full object-contain filter dark:invert"
                            src="/logo.png"
                            onError={(e) => {
                                e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuBGFGqzXXPCto2dqHJxGuq4Z7OqK7yc835QuZOBR7McmNycFb-7CIrZQUZaGhX9PFRd1rIN_qba7seWNw0q5aMfpN2l7aoi_otVfxR-nteGV3LM0yMfNaDY14oTVJYAEA2E0pq7bGZpEw6J84MrUOknQ5k-Ljo3JNdLQN4pGDEvYlCyH3sg_izvNWsaDImGKX_62D76_TiyH4gP2ySn-iJ-iJTTnIrRLGFnJ6GrdMx0fshzHTPnC03ZfzjJmJpRdiYhBcSWbuUsu-Bj";
                            }}
                        />
                    </div>
                </Link>
                <div className="hidden md:flex gap-4 text-sm font-medium text-subtext-light dark:text-subtext-dark">
                    <a href="#" className="hover:text-primary transition-colors">About</a>
                    <a href="#" className="hover:text-primary transition-colors">Support</a>
                </div>
            </nav>

            <main className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <img
                        alt="Paytrace Logo"
                        className="h-32 w-auto dark:invert drop-shadow-lg"
                        src="/logo.png"
                        onError={(e) => {
                            e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuCIwP5nWxtJr5ezwSvcR8LGqgPU3-2i_MwzyGz6QPDja-uNwxgwXzhmzarGQmNub8H9WvrhjsbJxd0qOykTI9zUmX8oHfiebFM4i127W5ldGAhWYMc5sg7Zj_xQoeeIcr1V-73atEXVmv79yQ1ed864-wZz77dFbbGQsCZ2lhiTbY9eIA-W0JYoq_arebObLAG-p9Li73vlLD_PzP58937xXD8OFVaaFCTXBQ6XeweL7lmK0RvZIfw5wRqJFvUNdDxo9LdZpelOCH7e";
                        }}
                    />
                </div>
                <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark overflow-hidden transition-colors duration-200">
                    <div className="pt-10 pb-6 px-8 text-center">
                        <h1 className="text-2xl font-bold text-text-light dark:text-text-dark mb-2">Create your account</h1>
                        <p className="text-subtext-light dark:text-subtext-dark text-sm">
                            Join the secure payment network for domestic workers on Stellar.
                        </p>
                    </div>

                    <form className="px-8 pb-10 space-y-5">
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
                            <label htmlFor="email" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Email or Phone</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">email</span>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    className="block w-full pl-10 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1.5">Password</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="material-icons-outlined text-gray-400 text-lg">lock</span>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="block w-full pl-10 pr-10 py-2.5 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-text-light dark:text-text-dark placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition duration-150 ease-in-out"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                                    <span className="material-icons-outlined text-gray-400 text-lg hover:text-gray-600 dark:hover:text-gray-300">visibility_off</span>
                                </div>
                            </div>
                            <p className="mt-1 text-xs text-subtext-light dark:text-subtext-dark">Must be at least 8 characters.</p>
                        </div>

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

                        <div>
                            <Link to="/dashboard">
                                <button
                                    type="button"
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-[1.01]"
                                >
                                    Create Account
                                </button>
                            </Link>
                        </div>
                    </form>

                    <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-4 border-t border-border-light dark:border-border-dark text-center">
                        <p className="text-sm text-subtext-light dark:text-subtext-dark">
                            Already have an account?{' '}
                            <Link to="/auth/signin" className="font-medium text-primary hover:text-primary-hover transition-colors">
                                Log in
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
