import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useState, useRef, useEffect } from 'react';

export default function Home() {
    const [scrollProgress, setScrollProgress] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (!scrollContainerRef.current) return;
            const { top, height } = scrollContainerRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Start calculating when the top of the container hits the top of the viewport (or slightly earlier/later)
            // Ideally, we want the sticky behavior to define the progress.
            // The container is large (e.g. 300vh). The content is sticky.
            // When top is 0, we start. When bottom is windowHeight, we end.
            const distance = height - windowHeight;
            const scrolled = -top;

            let progress = scrolled / distance;
            progress = Math.max(0, Math.min(1, progress));
            setScrollProgress(progress);
        };

        window.addEventListener('scroll', handleScroll);
        // Trigger once on mount
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Determine card state based on scroll progress
    const getCardState = () => {
        if (scrollProgress < 0.3) return 'idle'; // 0-30%
        if (scrollProgress < 0.7) return 'processing'; // 30-70%
        return 'completed'; // 70-100%
    };

    const cardState = getCardState();

    return (
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans transition-colors duration-300">
            <Navbar />

            {/* Hero Section (Non-sticky) */}
            <section className="relative pt-32 pb-10 lg:pt-48 lg:pb-20 overflow-hidden">
                <div className="absolute inset-0 tech-pattern z-0 pointer-events-none opacity-50"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white dark:to-background-dark z-0 pointer-events-none"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary text-xs font-semibold uppercase tracking-wide mb-6 border border-blue-100 dark:border-blue-800">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        Powered by Stellar Network
                    </div>
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-8 text-text-light dark:text-white leading-tight">
                        Secure payments for the <br className="hidden md:block" />
                        <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">modern workforce</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600 dark:text-gray-300 mb-10">
                        Paytrace leverages blockchain technology to provide instant, low-cost, and transparent cross-border payments for domestic workers and employers worldwide.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            to="/auth/signup"
                            className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-medium rounded-lg text-white bg-text-light dark:bg-white dark:text-background-dark hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            Create Free Account
                            <span className="material-icons-outlined ml-2 text-sm">arrow_forward</span>
                        </Link>
                        <a
                            href="#features"
                            className="inline-flex items-center justify-center px-8 py-3.5 border border-gray-200 dark:border-gray-700 text-base font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            How it works
                        </a>
                    </div>
                </div>
            </section>

            {/* Sticky Animation Section */}
            <div ref={scrollContainerRef} className="relative z-20 h-auto md:h-[300vh] bg-transparent -mt-20 md:mt-0">
                {/* This wrapper mimics the hero background to blend in if needed, or we rely on transparent */}
                <div className="relative md:sticky md:top-0 md:h-screen flex flex-col justify-center items-center overflow-hidden py-10 md:py-0">

                    {/* Dashboard Preview */}
                    <div className="relative w-full max-w-5xl px-4 sm:px-6 lg:px-8">
                        <div className="rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-surface-dark transform transition-all duration-500 ease-out"
                            style={{
                                // Only apply transform on desktop for effect.
                                // We use window width check assumption or standard CSS handling.
                                transform: `perspective(1000px) rotateX(${Math.max(0, (1 - scrollProgress) * 5)}deg) scale(${0.95 + (scrollProgress * 0.05)})`,
                                opacity: 1 // Keep it fully visible
                            }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="pt-10 pb-6 px-6 bg-surface-light dark:bg-surface-dark">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="col-span-2 space-y-4">
                                        <div className="h-32 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                <span className="text-green-500 text-sm font-medium">+2.4%</span>
                                            </div>
                                            <div className="h-8 w-32 bg-gray-800 dark:bg-gray-600 rounded"></div>
                                        </div>
                                        <div className="h-48 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                                            <div className="flex justify-between mb-4">
                                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                                <div className="h-4 w-16 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900"></div>
                                                    <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded"></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900"></div>
                                                    <div className="h-3 w-3/4 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900"></div>
                                                    <div className="h-3 w-5/6 bg-gray-100 dark:bg-gray-700 rounded"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Animated Instant Transfer Card */}
                                    <div className={`rounded-xl p-6 border flex flex-col items-center text-center justify-center transition-all duration-500 ${cardState === 'completed'
                                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                        : 'bg-primary/5 dark:bg-primary/10 border-primary/10'
                                        }`}>
                                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm transition-all duration-500 ${cardState === 'completed'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-white dark:bg-gray-800 text-primary'
                                            }`}>
                                            <span className={`material-icons-outlined text-3xl transition-transform duration-500 ${cardState === 'processing' ? 'animate-spin' : ''
                                                }`}>
                                                {cardState === 'idle' && 'bolt'}
                                                {cardState === 'processing' && 'autorenew'}
                                                {cardState === 'completed' && 'check'}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-lg mb-1 dark:text-white">
                                            {cardState === 'idle' && 'Instant Transfer'}
                                            {cardState === 'processing' && 'Sending...'}
                                            {cardState === 'completed' && 'Transfer Sent!'}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {cardState === 'idle' && 'Processing on Stellar'}
                                            {cardState === 'processing' && 'Confirming...'}
                                            {cardState === 'completed' && 'Funds Available'}
                                        </p>

                                        <div className="mt-6 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ease-out ${cardState === 'completed' ? 'bg-green-500' : 'bg-primary'
                                                    }`}
                                                style={{
                                                    width: cardState === 'idle' ? '5%' :
                                                        cardState === 'processing' ? `${30 + ((scrollProgress - 0.3) / 0.4) * 60}%` :
                                                            '100%'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="bg-surface-light dark:bg-surface-dark py-12 border-y border-gray-100 dark:border-gray-800 relative z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">5s</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Avg Settlement Time</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">&lt;$0.5</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Transaction Cost</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">100%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Transparent</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Network Uptime</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-background-light dark:bg-background-dark" id="features">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-text-light dark:text-white">Built for speed, designed for trust</h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Traditional banking is slow and expensive. Paytrace uses the Stellar network to move money like email—fast, cheap, and global.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="group p-8 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 hover:border-primary/30 dark:hover:border-primary/30 transition-all hover:shadow-lg dark:hover:shadow-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-icons-outlined text-9xl text-primary">speed</span>
                            </div>
                            <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 text-primary">
                                <span className="material-icons-outlined text-3xl">bolt</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-text-light dark:text-white">Lightning Speed</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Don't wait days for funds to clear. Payments on Paytrace settle in 3-5 seconds, ensuring workers get paid instantly when they need it most.
                            </p>
                        </div>
                        <div className="group p-8 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 hover:border-primary/30 dark:hover:border-primary/30 transition-all hover:shadow-lg dark:hover:shadow-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-icons-outlined text-9xl text-primary">savings</span>
                            </div>
                            <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 text-primary">
                                <span className="material-icons-outlined text-3xl">paid</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-text-light dark:text-white">Minimal Fees</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Keep more of your hard-earned money. By cutting out intermediaries, we offer transaction fees that are a fraction of a cent.
                            </p>
                        </div>
                        <div className="group p-8 rounded-2xl bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 hover:border-primary/30 dark:hover:border-primary/30 transition-all hover:shadow-lg dark:hover:shadow-none relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-icons-outlined text-9xl text-primary">visibility</span>
                            </div>
                            <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6 text-primary">
                                <span className="material-icons-outlined text-3xl">verified_user</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-text-light dark:text-white">Total Transparency</h3>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                Track every penny in real-time. The public ledger ensures that all payments are verifiable, immutable, and secure.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-surface-light dark:bg-surface-dark">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="md:w-1/2">
                            <h2 className="text-3xl font-bold mb-6 text-text-light dark:text-white">Trusted by domestic workers across the globe</h2>
                            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                                "Paytrace has changed how I send money home. It's instant, and I don't lose a chunk of my salary to fees anymore."
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-full bg-gray-300 dark:bg-gray-600 overflow-hidden">
                                    <img
                                        alt="User Avatar"
                                        className="h-full w-full object-cover"
                                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5a6Zj_RIdiTxOCdpZPBmN5Un7y5v-GH5Tzg3NJ5cHpRtUCE9x1OoIhQBFXufroL66oUQbxxCNQoUfFxmbHHaZ_uoGMSDZPqBAaZrqHXIZzT5tfRGYeTyyve_qJglMlBKLOHmIEj06jE4cI8v3075yH-7Q_icaK17Im37oYEVX0hZ6DKGVyyR_Ctqav_t2O9XY7b6tSyQPHkwhudTzXKZbdI7Tjb5eM-ZupfOVJWhO6B6I7_piNaG1BwwNjlkZI4O8Sp4h9yGxjXVx"
                                    />
                                </div>
                                <div>
                                    <div className="font-bold text-text-light dark:text-white">Sarah M.</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Nurse & Paytrace User</div>
                                </div>
                            </div>
                        </div>
                        <div className="md:w-1/2 relative">
                            <div className="grid grid-cols-2 gap-4">
                                <img
                                    alt="Payment Transaction"
                                    className="rounded-2xl shadow-lg transform translate-y-8"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjKpLe224gnyFsYgM0c26S0HA7jp9YYg1sH9vsAhPc2yXsR0w3UiseUsCbPtW17jqvPAQYB_n21dMta5kEBmxxyiBgDBs14Blml_GXJP14ih2ZlCJ5Wxabu57l13aeXAb8C8vExVtZ1h-4la-SdjafU1fEyc4U87tBuRR3IiqQt_kn2NTGS9_nJPxnSSvZMs1cZPTWCKgnn1HwVGyprBVWMdrEtlYon7aqWfIeUM3_3p0QoqUng_8KT6u8M4FQ8j2iXGQAV5UhAwLu"
                                />
                                <img
                                    alt="Happy User"
                                    className="rounded-2xl shadow-lg"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA1fCEqUJ7sUYVcyHsblhGSvTx6as6-TexNwEti3t3kcYlMJbhV327PFLH7Y68XfhQqEFMd5_2wuKNqUYVtnEg2Ug-nuwU-PTWPmDXpjXrQAPBgXSdFSNRd-vfKyYN9uYVdQGO37wjxRe-4dZFY9NNBhfjJZxGBT0CUQl8uGj9T7-jv8xz5_u19ZEuud2Kum0_ocDdKHb7y74O1mXF9OY3fTyiqVjfFJxTxYMinvBSoma6lqTi_cEEPKKXUdLMU7SPEmy2uj51g6-AS"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-24 bg-white dark:bg-background-dark relative overflow-hidden">
                <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 clip-path-slant z-0"></div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h2 className="text-4xl font-bold mb-6 text-text-light dark:text-white">Ready to experience the future of payments?</h2>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto">
                        Join thousands of users who are saving time and money with Paytrace's blockchain solution.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            to="/auth/signup"
                            className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-lg text-white bg-primary hover:bg-primary-dark transition-colors shadow-lg"
                        >
                            Get Started Now
                        </Link>
                    </div>
                    <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">No credit card required. Free to join.</p>
                </div>
            </section>

            <Footer />
        </div>
    );
}
