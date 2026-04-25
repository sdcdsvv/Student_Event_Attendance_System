'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    EnvelopeIcon, 
    LockClosedIcon, 
    EyeIcon, 
    EyeSlashIcon,
    ArrowRightOnRectangleIcon,
    UserGroupIcon,
    CheckBadgeIcon,
    BoltIcon,
    LightBulbIcon,
    DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Hardcoded credentials
    const ADMIN_CREDENTIALS = {
        email: 'sdc@dsvv.ac.in',
        password: 'SdcDsvv@2027'
    };

    const USER_CREDENTIALS = {
        email: 'sdc@gmail.com',
        password: 'sdc@123'
    };

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

        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
            localStorage.setItem('dsvv_auth', 'true');
            localStorage.setItem('dsvv_role', 'admin');
            router.push('/dashboard');
        } else if (email === USER_CREDENTIALS.email && password === USER_CREDENTIALS.password) {
            localStorage.setItem('dsvv_auth', 'true');
            localStorage.setItem('dsvv_role', 'user');
            router.push('/dashboard');
        } else {
            setError('Invalid email or password. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-white overflow-x-hidden">
            {/* Left Side - Branding & Image */}
            <div className="flex w-full lg:w-3/4 min-h-[45vh] lg:min-h-screen relative overflow-hidden bg-blue-900 justify-center items-center py-10 lg:py-0">
                {/* Background Image with Overlay */}
                <div 
                    className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-10000 hover:scale-110"
                    style={{ backgroundImage: "url('/images/campus-bg.jpg')" }}
                />
                <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#172f5d]/95 via-[#172f5d]/85 to-[#172f5d]/40" />
                
                {/* Content */}
                <div className="relative z-20 flex flex-col items-center justify-center text-white w-full max-w-4xl px-8 text-center">
                    <div className="flex items-center justify-center mb-6 lg:mb-10 border-[2px] border-[#b89c4a]/80 rounded-[50%] bg-[#0a1930]/20 backdrop-blur-md mx-auto shadow-2xl animate-border-glow w-[280px] h-[105px] sm:w-[320px] sm:h-[120px]">
                        <img src="/dsvv-logo.png" alt="DSVV Logo" className="h-[45px] sm:h-[55px] w-auto object-contain brightness-110" />
                    </div>

                    <p className="text-yellow-400 font-bold tracking-[0.1em] sm:tracking-[0.12em] text-[15px] sm:text-[20px] lg:text-[24px] mb-6 sm:mb-8 uppercase drop-shadow-md px-4">Student Event Attendance System</p>
                    
                    <div className="flex flex-col items-center mt-2 sm:mt-6 px-4">
                        <p className="text-[11px] sm:text-[13px] uppercase tracking-wider font-medium text-gray-200 mb-1">Dev Sanskriti Vishwavidyalaya</p>
                        <p className="text-[18px] sm:text-[22px] font-bold text-white tracking-wide">Department of Computer Science</p>
                        <div className="h-[3px] w-12 sm:w-16 bg-yellow-400/90 mt-4 sm:mt-5 mx-auto rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)]" />
                    </div>

                    <div className="hidden lg:flex mt-12 flex-col space-y-5 items-center">
                        {[
                            { text: "Comprehensive Student Database", Icon: UserGroupIcon, color: "text-blue-400" },
                            { text: "One-Tap Attendance Marking", Icon: CheckBadgeIcon, color: "text-green-400" },
                            { text: "Gain Instant Visibility", Icon: EyeIcon, color: "text-purple-400" },
                            { text: "Reduce Manual Workload", Icon: BoltIcon, color: "text-amber-400" },
                            { text: "Improve Decision-Making", Icon: LightBulbIcon, color: "text-orange-400" },
                            { text: "One-Click Data Export", Icon: DocumentArrowDownIcon, color: "text-cyan-400" }
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-5 text-left w-full max-w-[360px] hover:translate-x-2 transition-transform duration-300">
                                <div className="p-2.5 bg-white/10 rounded-full shadow-inner flex-shrink-0 backdrop-blur-sm">
                                    <feature.Icon className={`w-6 h-6 ${feature.color} drop-shadow-md`} />
                                </div>
                                <span className="text-[15px] font-semibold tracking-wide text-gray-50">{feature.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/4 flex-shrink-0 flex items-center justify-center p-6 md:p-8 bg-white overflow-y-auto">
                <div className="w-full max-w-sm sm:scale-95 origin-center">
                    <div className="mb-10 text-center lg:text-left">
                        <h2 className="text-3xl font-extrabold text-blue-900 mb-2">Welcome back 👋</h2>
                        <p className="text-slate-500 font-small">Sign in with your credentials to continue</p>
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
                            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest pl-1" htmlFor="email">
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
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-blue-500 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                                    placeholder="sdc@dsvv.ac.in"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-widest pl-1" htmlFor="password">
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
                                    className="block w-full pl-11 pr-12 py-3.5 bg-white border border-blue-500 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
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
                            <p className="text-[12px] text-slate-400">Department of Computer Science</p>
                            <p className="text-sm font-semibold text-slate-600">Student Event Attendance System</p>
                        </div>
                        <div className="pt-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Powered by:</p>
                            <p className="text-[14px] font-black text-blue-900/80">Software Development Cell</p>
                            <p className="text-[12px] text-slate-500">Dev Sanskriti Vishwavidyalaya, Haridwar</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
