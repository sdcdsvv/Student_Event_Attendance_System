'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
    const router = useRouter();

    useEffect(() => {
        const auth = localStorage.getItem('dsvv_auth');
        if (auth === 'true') {
            router.push('/dashboard');
        } else {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#f4f6fb]">
            <div className="h-10 w-10 border-4 border-blue-900/10 border-t-blue-900 rounded-full animate-spin" />
        </div>
    );
}
