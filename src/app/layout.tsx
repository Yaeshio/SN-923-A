import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manufacturing Management System",
  description: "SN-923 Manufacturing Process Control",
};

import { FileUp, FilePlus, LayoutDashboard, Factory } from "lucide-react";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-14 items-center gap-4 px-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-md p-1">
                <Factory className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-bold tracking-tight text-lg">SN-923 System</span>
            </div>
            <nav className="flex items-center gap-6 text-sm font-medium ml-4">
              <a href="/import" className="flex items-center gap-1 transition-colors hover:text-primary">
                <FileUp className="h-4 w-4" />
                <span>インポート</span>
              </a>
              <a href="/order" className="flex items-center gap-1 transition-colors hover:text-primary">
                <FilePlus className="h-4 w-4" />
                <span>製造指示</span>
              </a>
              <a href="/board" className="flex items-center gap-1 transition-colors hover:text-primary">
                <LayoutDashboard className="h-4 w-4" />
                <span>工程ボード</span>
              </a>
            </nav>
          </div>
        </header>
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
      </body>
    </html>
  );
}
