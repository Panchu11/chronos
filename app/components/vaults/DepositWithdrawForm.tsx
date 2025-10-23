'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { useChronosVault } from '@/src/hooks/useChronosPrograms';
import { TOKEN_CONFIG } from '@/src/config/token';
import { getExplorerUrl } from '@/src/config/programs';

interface DepositWithdrawFormProps {
  onSuccess?: () => void;
}

export function DepositWithdrawForm({ onSuccess }: DepositWithdrawFormProps) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { deposit, withdraw } = useChronosVault();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const amountNum = parseFloat(amount);

      let result;
      if (mode === 'deposit') {
        result = await deposit(amountNum, TOKEN_CONFIG.mint);
      } else {
        result = await withdraw(amountNum, TOKEN_CONFIG.mint);
      }

      setTxSignature(result.signature);
      setSuccess(true);
      setAmount('');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error(`Error ${mode}ing:`, err);
      setError(err instanceof Error ? err.message : `Failed to ${mode}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-xl">Deposit / Withdraw</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={mode === 'deposit' ? 'primary' : 'outline'}
            onClick={() => setMode('deposit')}
            className="flex-1"
          >
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Deposit
          </Button>
          <Button
            type="button"
            variant={mode === 'withdraw' ? 'primary' : 'outline'}
            onClick={() => setMode('withdraw')}
            className="flex-1"
          >
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Withdraw
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount ({TOKEN_CONFIG.symbol})
            </label>
            <input
              type="number"
              step="0.000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter ${TOKEN_CONFIG.symbol} amount`}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              {mode === 'deposit' 
                ? 'Deposit tokens into your vault to earn yield'
                : 'Withdraw your shares from the vault'}
            </p>
          </div>

          {/* Token Info */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <div className="text-xs text-purple-300 mb-1">Token</div>
            <div className="text-sm font-semibold text-white">{TOKEN_CONFIG.name}</div>
            <div className="text-xs text-gray-400 font-mono mt-1">
              {TOKEN_CONFIG.mint.toBase58().slice(0, 8)}...{TOKEN_CONFIG.mint.toBase58().slice(-8)}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && txSignature && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-400 text-sm mb-2">
                ✅ {mode === 'deposit' ? 'Deposit' : 'Withdrawal'} successful!
              </p>
              <a
                href={getExplorerUrl(txSignature, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-400 hover:text-purple-300"
              >
                View Transaction →
              </a>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !amount}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'deposit' ? 'Depositing...' : 'Withdrawing...'}
              </>
            ) : (
              <>
                {mode === 'deposit' ? (
                  <>
                    <ArrowDownCircle className="w-4 h-4 mr-2" />
                    Deposit {TOKEN_CONFIG.symbol}
                  </>
                ) : (
                  <>
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Withdraw {TOKEN_CONFIG.symbol}
                  </>
                )}
              </>
            )}
          </Button>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
          <p className="text-xs text-gray-400">
            💡 <strong>Note:</strong> You have 1,000,000 {TOKEN_CONFIG.symbol} tokens in your wallet.
            {mode === 'deposit' 
              ? ' Depositing will mint vault shares based on the current share price.'
              : ' Withdrawing will burn your shares and return tokens based on the current share price.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

