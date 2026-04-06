import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
