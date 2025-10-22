import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { ThemeProvider as CustomThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Orchestration System - Agent Dashboard",
  description: "Multi-agent orchestration system with real-time monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased relative">
        <ThemeProvider>
          <CustomThemeProvider>
            {/* Animated Gradient Background - Global */}
            <div className="gradient-background fixed inset-0 pointer-events-none z-0" />

            {/* Content */}
            <div className="relative z-10">
              {children}
            </div>
          </CustomThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
