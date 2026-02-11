import { Link } from 'react-router-dom';

export default function Navbar() {
    return (
        <nav className="fixed w-full z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex-shrink-0 flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="h-16 w-16 text-text-light dark:text-white">
                                <img
                                    alt="Paytrace Abstract Logo"
                                    className="h-full w-full object-contain dark:invert"
                                    src="/logo.png"
                                    onError={(e) => {
                                        e.currentTarget.src = "https://lh3.googleusercontent.com/aida-public/AB6AXuC-aTbWAdJDuEKoJ32n8Z6Y-4x6l1L6cOcT8ZGNTXOxreXpLTNzGF7m8ke3844E3h1HZzkRl6r7RJ6aVG4MmU2y1G1RSSo4g_K4P9yXo1Felohsy3yZsny2iZ6774HwL6nqWh79oZPBiRkGCsV8m6QvSupNnsv86JsCdGENJ2ogdQPd17AC7aVGpSF4WCnuC75UsNgxm3pSZtaiwbVKfyGo5__hNDiLbFCboFIOzHpjNcMux1saiU8j9hnWazse-7o2d5B1WcuPK9_A";
                                    }}
                                />
                            </div>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
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
                </div>
            </div>
        </nav>
    );
}
