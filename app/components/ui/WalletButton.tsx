'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';

export function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration errors
  if (!mounted) {
    return (
      <div className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium">
        Loading...
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white !px-6 !py-2 !rounded-lg !transition !font-medium" />
  );
}

export function WalletInfo() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration errors
  if (!mounted) {
    return null;
  }

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-300">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="font-mono">
        {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
      </span>
    </div>
  );
}

