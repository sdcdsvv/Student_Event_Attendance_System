import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en" className="h-full" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`min-h-full flex flex-col bg-[#f4f6fb] ${inter.className}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
