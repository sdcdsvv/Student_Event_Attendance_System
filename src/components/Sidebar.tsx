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

            {/* Mobile top bar */}
            <div className="md:hidden flex items-center justify-between bg-blue-900 px-4 py-3 sticky top-0 z-30">
                <img
                    src="/dsvv-logo.png"
                    alt="DSVV Logo"
                    className="h-8 w-auto object-contain brightness-110"
                />
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="text-white p-1"
                >
                    {mobileOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMobileOpen(false)}>
                    <div
                        className="w-56 bg-blue-900 min-h-full px-3 py-6 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <NavLinks />
                    </div>
                </div>
            )}
        </>
    );
}
