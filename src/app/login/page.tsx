'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    EnvelopeIcon, 
    LockClosedIcon, 
    EyeIcon, 
    EyeSlashIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Hardcoded credentials
    const VALID_EMAIL = 'sdc@dsvv.ac.in';
    const VALID_PASSWORD = 'SdcDsvv@2027';

    useEffect(() => {
        // Check if already logged in
        const auth = localStorage.getItem('dsvv_auth');
        if (auth === 'true') {
            router.push('/dashboard');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (email === VALID_EMAIL && password === VALID_PASSWORD) {
            localStorage.setItem('dsvv_auth', 'true');
            router.push('/dashboard');
        } else {
            setError('Invalid email or password. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white overflow-hidden">
            {/* Left Side - Branding & Image */}
            <div className="hidden lg:flex lg:w-7/12 relative overflow-hidden bg-blue-900">
                {/* Background Image with Overlay */}
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-110"
                    style={{ backgroundImage: "url('/images/campus-bg.png')" }}
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-br from-blue-900/90 via-blue-900/70 to-transparent" />
                
                {/* Content */}
                <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
                    <div className="flex flex-col items-center text-center mt-12">
                        <div className="mb-6 p-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl">
                            <img src="/dsvv-logo.png" alt="DSVV Logo" className="h-28 w-auto brightness-110" />
                        </div>
                        <p className="text-yellow-400 font-bold tracking-[0.2em] text-xs mb-2 uppercase">Campus Broadcast Platform</p>
                        <h1 className="text-6xl font-black tracking-tighter mb-4 drop-shadow-lg">CS-Connect</h1>
                        <div className="h-1 w-16 bg-yellow-400 rounded-full mb-6 mx-auto" />
                        <div className="space-y-1">
                            <p className="text-sm font-semibold tracking-widest uppercase text-blue-100">Dev Sanskriti Vishwavidyalaya</p>
                            <p className="text-lg font-medium text-blue-200/90">Department of Computer Science</p>
                        </div>
                    </div>

                    <div className="mt-auto space-y-6 max-w-md mx-auto">
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                "Instant Campus Broadcasts",
                                "Targeted Audience Messaging",
                                "Delivery & Engagement Analytics",
                                "Scheduled Message Planner"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-4 bg-white/5 hover:bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10 transition-all cursor-default group">
                                    <div className="p-2 bg-yellow-400/20 text-yellow-400 rounded-lg group-hover:bg-yellow-400 group-hover:text-blue-900 transition-colors">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium tracking-wide">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-8 md:p-16 bg-[#f8fafc]">
                <div className="w-full max-w-sm">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-4xl font-extrabold text-blue-900 mb-2">Welcome back 👋</h2>
                        <p className="text-slate-500 font-medium">Sign in with your credentials to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3 animate-shake">
                                <div className="text-red-500 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <p className="text-sm text-red-700 font-semibold">{error}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1" htmlFor="email">
                                Email Address
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-500 text-slate-400 transition-colors">
                                    <EnvelopeIcon className="h-5 w-5" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="admin@campus.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1" htmlFor="password">
                                Password
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-blue-500 text-slate-400 transition-colors">
                                    <LockClosedIcon className="h-5 w-5" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="block w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-blue-500 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 ${
                                isLoading 
                                ? 'bg-blue-800 cursor-not-allowed' 
                                : 'bg-[#1e3a8a] hover:bg-[#1e40af] hover:shadow-blue-900/20'
                            }`}
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 pt-8 border-t border-slate-100 text-center space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Department of Computer Science</p>
                            <p className="text-xs font-semibold text-slate-600">CS-Connect &mdash; Campus Broadcast Platform</p>
                        </div>
                        <div className="pt-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.1em]">Powered by:</p>
                            <p className="text-[11px] font-black text-blue-900/80">Software Development Cell</p>
                            <p className="text-[10px] text-slate-500 font-medium">Dev Sanskriti Vishwavidyalaya, Haridwar</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
