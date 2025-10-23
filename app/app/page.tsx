'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, TrendingUp, Clock } from 'lucide-react';
import { WalletButton } from '@/components/ui/WalletButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                CHRONOS
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <Link href="/vaults" className="text-gray-300 hover:text-white transition">
                Vaults
              </Link>
              <Link href="/dex" className="text-gray-300 hover:text-white transition">
                DEX
              </Link>
              <Link href="/market" className="text-gray-300 hover:text-white transition">
                Market
              </Link>
              <Link href="/analytics" className="text-gray-300 hover:text-white transition">
                Analytics
              </Link>
            </div>
            <div>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-6xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Deterministic DeFi
              </span>
              <br />
              <span className="text-white">Orchestration</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
              The first Meta-Protocol leveraging Raiku's deterministic execution for
              guaranteed timing, zero MEV, and institutional-grade reliability.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/vaults">
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-2 transition">
                  Launch App
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link href="/docs">
                <button className="border border-purple-400 text-purple-400 hover:bg-purple-400/10 px-8 py-4 rounded-lg text-lg font-semibold transition">
                  Learn More
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Clock className="w-12 h-12" />}
              title="Temporal Vaults"
              description="DeFi vaults with time-guaranteed execution. Reserve slots in advance for MEV-resistant rebalancing."
              delay={0.2}
            />
            <FeatureCard
              icon={<Shield className="w-12 h-12" />}
              title="Zero MEV DEX"
              description="Deterministic order matching with FIFO based on slot reservation time. No gas auctions, no MEV."
              delay={0.4}
            />
            <FeatureCard
              icon={<TrendingUp className="w-12 h-12" />}
              title="Blockspace Futures"
              description="Trade Solana blockspace as an asset. Mint slot NFTs, run Dutch auctions, lease capacity."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="glass rounded-2xl p-12">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <StatCard number="95%" label="MEV Reduction" />
              <StatCard number="99.9%" label="Execution Guarantee" />
              <StatCard number="<30ms" label="Pre-Confirmations" />
              <StatCard number="40%" label="Higher Capital Efficiency" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="glass rounded-2xl p-12"
          >
            <h2 className="text-4xl font-bold mb-4 text-white">
              Ready to Experience Deterministic DeFi?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Join the future of DeFi with guaranteed execution and zero MEV.
            </p>
            <Link href="/vaults">
              <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-12 py-4 rounded-lg text-lg font-semibold transition">
                Get Started Now
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>© 2025 CHRONOS Protocol. Built for Raiku - Inevitable Ideathon.</p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="https://github.com/Panchu11/chronos" className="hover:text-white transition">
              GitHub
            </a>
            <a href="/docs" className="hover:text-white transition">
              Documentation
            </a>
            <a href="https://earn.superteam.fun/listing/raiku" className="hover:text-white transition">
              Hackathon
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass rounded-xl p-8 hover:bg-white/10 transition"
    >
      <div className="text-purple-400 mb-4">{icon}</div>
      <h3 className="text-2xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </motion.div>
  );
}

function StatCard({ number, label }: any) {
  return (
    <div>
      <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
        {number}
      </div>
      <div className="text-gray-400">{label}</div>
    </div>
  );
}

