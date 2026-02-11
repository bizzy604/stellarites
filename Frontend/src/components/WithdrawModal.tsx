import { useState, useEffect } from 'react';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
}

export default function WithdrawModal({ isOpen, onClose, balance }: WithdrawModalProps) {
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
    const [error, setError] = useState('');

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setStep('input');
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleWithdraw = (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);

        if (isNaN(val) || val <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (val > balance) {
            setError('Insufficient balance');
            return;
        }

        setStep('processing');

        // Simulate API call
        setTimeout(() => {
            setStep('success');
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Withdraw Funds</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {step === 'input' && (
                        <form onSubmit={handleWithdraw}>
                            {/* M-Pesa Method (Default/Fixed) */}
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                                    Withdraw To
                                </label>
                                <div className="flex items-center gap-4 p-4 rounded-xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm p-1">
                                        <img
                                            src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                            alt="M-Pesa"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            M-Pesa
                                            <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase">
                                                Default
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                                            +254 712 *** 789
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="material-icons-outlined text-green-600 dark:text-green-400">check_circle</span>
                                    </div>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="mb-6">
                                <label htmlFor="amount" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Amount (XLM)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id="amount"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError('');
                                        }}
                                        className="block w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-medium text-lg"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">XLM</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-2">
                                    {error ? (
                                        <p className="text-sm text-red-500 flex items-center gap-1">
                                            <span className="material-icons-outlined text-sm">error</span>
                                            {error}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Available: <span className="font-medium text-gray-900 dark:text-white">{balance.toLocaleString()} XLM</span>
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setAmount(balance.toString())}
                                        className="text-xs font-semibold text-primary hover:text-primary-dark uppercase"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <button
                                type="submit"
                                className="w-full py-3.5 px-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-icons-outlined">payments</span>
                                Confirm Withdrawal
                            </button>
                        </form>
                    )}

                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-blue-100 dark:border-blue-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                <span className="material-icons-outlined text-4xl text-primary animate-pulse">cloud_sync</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Processing Withdrawal</h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                Sending <span className="font-bold text-gray-900 dark:text-white">{parseFloat(amount).toLocaleString()} XLM</span> to M-Pesa...
                            </p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <span className="material-icons-outlined text-5xl text-green-600 dark:text-green-400">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Withdrawal Successful!</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                You have successfully withdrawn <span className="font-bold text-gray-900 dark:text-white">{parseFloat(amount).toLocaleString()} XLM</span> to your M-Pesa account.
                            </p>
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 text-left border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Transaction ID</span>
                                    <span className="text-sm font-mono text-gray-900 dark:text-white">MP-{Math.floor(Math.random() * 1000000000)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Time</span>
                                    <span className="text-sm text-gray-900 dark:text-white">{new Date().toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
