import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Student Event Attendance System | DSVV",
  description: "Event Attendance Management System for the Department of Computer Science, DSVV",
  icons: {
    icon: "/dsvv-short-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col bg-[#f4f6fb]">
        <div className="flex flex-col md:flex-row flex-1 min-h-screen">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            {/* Page header bar */}
            <header className="hidden md:flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 shrink-0">
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
      </body>
    </html>
  );
}
