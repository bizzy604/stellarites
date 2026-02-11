import { useState } from 'react';
import { getSession } from '../services/session';
import { fundAccount, fundAccountMpesa } from '../services/accounts';

interface FundModalProps {
    isOpen: boolean;
    onClose: () => void;
    publicKey: string;
    onSuccess?: () => void;
}

type FundMethod = 'friendbot' | 'mpesa';
type Step = 'choose' | 'mpesa-form' | 'processing' | 'success' | 'error';

export default function FundModal({ isOpen, onClose, publicKey, onSuccess }: FundModalProps) {
    const session = getSession();
    const [method, setMethod] = useState<FundMethod | null>(null);
    const [step, setStep] = useState<Step>('choose');
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState(session?.phone ?? '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [mpesaResult, setMpesaResult] = useState<{
        transaction_id: string;
        amount_ksh: string;
        amount_kes: string;
        provider: string;
    } | null>(null);

    if (!isOpen) return null;

    const reset = () => {
        setMethod(null);
        setStep('choose');
        setAmount('');
        setPhone(session?.phone ?? '');
        setMessage('');
        setMpesaResult(null);
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFriendbot = async () => {
        setMethod('friendbot');
        setStep('processing');
        setLoading(true);
        setMessage('');
        try {
            const res = await fundAccount(publicKey);
            setMessage(res.message);
            setStep('success');
            onSuccess?.();
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : 'Funding failed');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    const handleMpesaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = parseFloat(amount);
        if (isNaN(val) || val < 10) {
            setMessage('Minimum amount is 10 KES');
            return;
        }
        if (!phone.trim()) {
            setMessage('Enter your M-Pesa phone number');
            return;
        }

        setStep('processing');
        setLoading(true);
        setMessage('');
        setMpesaResult(null);
        try {
            const res = await fundAccountMpesa(publicKey, {
                amount: val,
                phone: phone.trim(),
            });
            setMessage(res.message);
            setMpesaResult({
                transaction_id: res.transaction_id,
                amount_ksh: res.amount_ksh,
                amount_kes: res.amount_kes,
                provider: res.provider,
            });
            setStep('success');
            onSuccess?.();
        } catch (err: unknown) {
            setMessage(err instanceof Error ? err.message : 'M-Pesa funding failed');
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-700">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add Funds</h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                    >
                        <span className="material-icons-outlined">close</span>
                    </button>
                </div>

                <div className="p-6">
                    {/* Step 1: Choose method */}
                    {step === 'choose' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Choose how you want to add funds to your account.
                            </p>

                            {/* Friendbot option */}
                            <button
                                onClick={handleFriendbot}
                                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary bg-white dark:bg-gray-800 transition-all flex items-center gap-4 text-left group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                                    <span className="material-icons-outlined text-2xl text-primary">science</span>
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900 dark:text-white">Stellar Friendbot</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Free testnet KSH (10,000). Testnet only.
                                    </div>
                                </div>
                                <span className="material-icons-outlined text-gray-400 group-hover:text-primary">arrow_forward</span>
                            </button>

                            {/* M-Pesa option */}
                            <button
                                onClick={() => setStep('mpesa-form')}
                                className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-600 bg-white dark:bg-gray-800 transition-all flex items-center gap-4 text-left group"
                            >
                                <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center p-2 group-hover:bg-green-200 dark:group-hover:bg-green-900/50">
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                        alt="M-Pesa"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900 dark:text-white">M-Pesa</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Pay KES via M-Pesa, receive KSH on Stellar.
                                    </div>
                                </div>
                                <span className="material-icons-outlined text-gray-400 group-hover:text-green-500">arrow_forward</span>
                            </button>
                        </div>
                    )}

                    {/* Step 2: M-Pesa form */}
                    {step === 'mpesa-form' && (
                        <form onSubmit={handleMpesaSubmit} className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setStep('choose')}
                                className="text-xs text-gray-500 hover:text-primary flex items-center gap-1"
                            >
                                <span className="material-icons-outlined text-sm">arrow_back</span>
                                Back
                            </button>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    M-Pesa Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="block w-full pl-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500"
                                    placeholder="0712 345 678"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Amount (KES)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="block w-full pl-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500"
                                    placeholder="100"
                                    min={10}
                                    max={150000}
                                    step={1}
                                    required
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Min 10 KES, max 150,000 KES</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep('choose')}
                                    className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center justify-center gap-2"
                                >
                                    <img
                                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/M-PESA_LOGO-01.svg/1200px-M-PESA_LOGO-01.svg.png"
                                        alt=""
                                        className="w-5 h-5 object-contain brightness-0 invert"
                                    />
                                    Pay
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Processing */}
                    {(step === 'processing') && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="font-medium text-gray-900 dark:text-white">
                                {method === 'friendbot' ? 'Funding via Friendbot…' : 'Processing M-Pesa payment…'}
                            </p>
                        </div>
                    )}

                    {/* Success */}
                    {step === 'success' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons-outlined text-4xl text-green-600">check_circle</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Funded!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{message}</p>
                            {mpesaResult && (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-left text-xs space-y-1 mb-4 border border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Transaction</span>
                                        <span className="font-mono font-medium">{mpesaResult.transaction_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Credited</span>
                                        <span className="font-bold text-green-600">{mpesaResult.amount_ksh} KSH</span>
                                    </div>
                                    {mpesaResult.provider === 'demo' && (
                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 pt-1">
                                            <span className="material-icons-outlined text-xs">info</span>
                                            Demo mode
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={handleClose}
                                className="w-full py-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {step === 'error' && (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-icons-outlined text-4xl text-red-500">error</span>
                            </div>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Funding Failed</h3>
                            <p className="text-sm text-red-500 mb-4">{message}</p>
                            <button
                                onClick={() => setStep('choose')}
                                className="text-sm text-primary hover:underline"
                            >
                                Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
