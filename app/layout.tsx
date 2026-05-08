import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hermes — Lead Intelligence | Boxly Digital",
  description: "Dashboard de lead generation para Boxly Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="light">
      <body className={`${inter.variable} bg-background text-on-surface antialiased`}>
        {children}
      </body>
    </html>
  );
}
