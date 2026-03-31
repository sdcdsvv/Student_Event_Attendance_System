'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    HomeIcon,
    UsersIcon,
    CalendarIcon,
    ClipboardDocumentCheckIcon,
    Bars3Icon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: HomeIcon },
    { href: '/students', label: 'Students', icon: UsersIcon },
    { href: '/events', label: 'Events', icon: CalendarIcon },
    { href: '/attendance', label: 'Attendance', icon: ClipboardDocumentCheckIcon },
    { href: '/reports', label: 'Reports', icon: ClipboardDocumentCheckIcon },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const NavLinks = () => (
        <nav className="flex flex-col gap-1 mt-6">
            {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${active
                            ? 'bg-yellow-400 text-blue-900'
                            : 'text-blue-100 hover:bg-blue-700'
                            }`}
                    >
                        <Icon className="w-5 h-5 shrink-0" />
                        {label}
                    </Link>
                );
            })}
        </nav>
    );

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden md:flex flex-col w-56 bg-blue-900 min-h-screen px-3 py-6 shrink-0">
                <div className="px-2 mb-4">
                    <img
                        src="/dsvv-logo.png"
                        alt="DSVV Logo"
                        className="w-full h-auto object-contain brightness-110 contrast-125"
                    />
                </div>
                <div className="border-b border-blue-700/50 mb-2" />
                <NavLinks />
            </aside>

            {/* Mobile Navbar */}
            <div className="md:hidden flex items-center justify-between bg-blue-900 px-4 py-3 sticky top-0 z-40 shadow-md">
                <div className="flex items-center gap-2">
                    <img
                        src="/dsvv-short-logo.png"
                        alt="DSVV Logo"
                        className="h-8 w-auto object-contain brightness-110"
                    />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white leading-none uppercase tracking-tighter">DSVV</span>
                        <span className="text-[8px] font-bold text-blue-200 leading-none">Attendance System</span>
                    </div>
                </div>
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="text-white p-2 hover:bg-blue-800 rounded-lg transition-colors active:scale-95"
                    aria-label="Toggle Menu"
                >
                    {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Drawer */}
            <div
                className={`md:hidden fixed inset-0 z-30 transition-all duration-300 ease-in-out ${mobileOpen ? 'visible opacity-100' : 'invisible opacity-0'
                    }`}
            >
                {/* Backdrop */}
                <div
                    className={`absolute inset-0 bg-blue-900/60 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                    onClick={() => setMobileOpen(false)}
                />

                {/* Drawer Content */}
                <div
                    className={`absolute left-0 top-0 h-full w-64 bg-blue-900 shadow-2xl transition-transform duration-300 ease-out p-5 flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <img src="/dsvv-short-logo.png" className="h-10 w-auto" alt="Logo" />
                        <div>
                            <p className="text-sm font-black text-white">CS Department</p>
                            <p className="text-[10px] text-blue-300">DSVV Haridwar</p>
                        </div>
                    </div>

                    <div className="border-b border-blue-800 mb-6" />

                    <NavLinks />

                    <div className="mt-auto pt-6 border-t border-blue-800">
                        <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest text-center">
                            Powered by SDC
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
