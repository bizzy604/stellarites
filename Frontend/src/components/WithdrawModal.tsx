import { useState, useEffect } from 'react';
import { getSession } from '../services/session';
import { offrampToMpesa } from '../services/payments';
import type { OfframpResponse } from '../types';

interface WithdrawModalProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
}

export default function WithdrawModal({ isOpen, onClose, balance }: WithdrawModalProps) {
    const session = getSession();
    const [phone, setPhone] = useState(session?.phone ?? '');
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<'input' | 'processing' | 'success' | 'error'>('input');
    const [error, setError] = useState('');
    const [result, setResult] = useState<OfframpResponse | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setStep('input');
            setError('');
            setResult(null);
            setPhone(session?.phone ?? '');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
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
        if (!phone.trim()) {
            setError('Please enter your M-Pesa phone number');
            return;
        }

        setStep('processing');
        setError('');

        try {
            const res = await offrampToMpesa({
                sender: session?.worker_id ?? session?.stellar_public_key ?? '',
                phone: phone.trim(),
                amount: amount,
            });
            setResult(res);
            setStep('success');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Off-ramp failed. Please try again.');
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-green-50 dark:bg-green-900/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center p-1 shadow-sm">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                alt="M-Pesa"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Withdraw to M-Pesa</h3>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">Off-ramp KSH to your phone</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {step === 'input' && (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* M-Pesa Phone */}
                            <div>
                                <label htmlFor="mpesaPhone" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    M-Pesa Phone Number
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="material-icons-outlined text-green-500 text-lg">phone_android</span>
                                    </div>
                                    <input
                                        type="tel"
                                        id="mpesaPhone"
                                        value={phone}
                                        onChange={(e) => { setPhone(e.target.value); setError(''); }}
                                        className="block w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium"
                                        placeholder="0712 345 678"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Safaricom M-Pesa registered number</p>
                            </div>

                            {/* Amount */}
                            <div>
                                <label htmlFor="offrampAmt" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Amount (KSH)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        id="offrampAmt"
                                        value={amount}
                                        onChange={(e) => { setAmount(e.target.value); setError(''); }}
                                        className="block w-full pl-4 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all font-medium text-lg"
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <span className="text-gray-500 dark:text-gray-400 font-medium">KSH</span>
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
                                            Available: <span className="font-medium text-gray-900 dark:text-white">{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setAmount(Math.max(0, balance - 1.5).toFixed(2))}
                                        className="text-xs font-semibold text-green-600 hover:text-green-700 uppercase"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>

                            {/* Conversion Preview */}
                            {amount && parseFloat(amount) > 0 && (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                                    <span className="material-icons-outlined text-green-600 text-lg">swap_horiz</span>
                                    <div className="text-sm">
                                        <span className="font-bold text-gray-900 dark:text-white">{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                        <span className="text-gray-400 mx-2">&rarr;</span>
                                        <span className="font-bold text-green-700 dark:text-green-300">KES {parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
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

                    {step === 'processing' && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                                <div className="absolute inset-0 border-4 border-green-100 dark:border-green-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="material-icons-outlined text-4xl text-green-600 animate-pulse">phone_android</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Processing Off-Ramp</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                Converting <span className="font-bold text-gray-900 dark:text-white">{parseFloat(amount).toLocaleString()} KSH</span> and sending to M-Pesa...
                            </p>
                            <div className="mt-5 space-y-2.5 text-left max-w-xs mx-auto">
                                <div className="flex items-center gap-2 text-xs text-green-600">
                                    <span className="material-icons-outlined text-sm">check_circle</span>
                                    Burning KSH on Stellar
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <div className="w-4 h-4 border-2 border-slate-300 border-t-green-500 rounded-full animate-spin"></div>
                                    Sending KES to M-Pesa
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons-outlined text-4xl text-red-500">error</span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Off-Ramp Failed</h3>
                            <p className="text-sm text-red-500 mb-6">{error}</p>
                            <button
                                onClick={() => setStep('input')}
                                className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl transition-colors text-sm"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {step === 'success' && result && (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
                                <span className="material-icons-outlined text-5xl text-green-600 dark:text-green-400">check_circle</span>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sent to M-Pesa!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{result.message}</p>

                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5 text-left border border-gray-100 dark:border-gray-700 space-y-2.5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">M-Pesa Transaction</span>
                                    <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">{result.mpesa_transaction_id}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Phone</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{result.phone}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Amount Sent</span>
                                    <span className="font-bold text-green-600">KES {parseFloat(result.amount_kes).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">KSH Burned</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{parseFloat(result.amount_ksh).toLocaleString(undefined, { minimumFractionDigits: 2 })} KSH</span>
                                </div>
                                {result.provider === 'demo' && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                                        <span className="material-icons-outlined text-xs">info</span>
                                        Demo mode — no real M-Pesa payout sent
                                    </div>
                                )}
                            </div>

                            {result.stellar_explorer_url && (
                                <a
                                    href={result.stellar_explorer_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4"
                                >
                                    <span className="material-icons-outlined text-base">open_in_new</span>
                                    View burn transaction on Stellar
                                </a>
                            )}

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
