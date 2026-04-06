'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('dsvv_auth');
    if (auth !== 'true') {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f4f6fb]">
        <div className="h-10 w-10 border-4 border-blue-900/10 border-t-blue-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-screen relative">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 bg-[#f4f6fb]">
        {/* Page header bar */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shrink-0 sticky top-0 z-30">
          <div>
            <h1 className="text-base font-bold text-blue-900 leading-tight">
              Department of Computer Science
            </h1>
            <p className="text-xs text-gray-500">Dev Sanskriti Vishwavidyalaya &mdash; Event Attendance System</p>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
