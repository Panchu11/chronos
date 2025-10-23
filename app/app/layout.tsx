import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/providers/WalletProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CHRONOS Protocol - Deterministic DeFi Orchestration",
  description: "Meta-Protocol for Deterministic DeFi Orchestration on Solana with Raiku integration",
  keywords: ["Solana", "DeFi", "Raiku", "MEV", "Deterministic", "Temporal Vaults", "Zero MEV DEX"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}

