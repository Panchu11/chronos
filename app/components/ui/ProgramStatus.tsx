'use client';

import { useEffect, useState } from 'react';
import { useAllPrograms } from '@/src/hooks/useChronosPrograms';
import { Card } from './Card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function ProgramStatus() {
  const programs = useAllPrograms();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      setLoading(true);
      const result = await programs.checkAllDeployed();
      setStatus(result);
      setLoading(false);
    };

    checkStatus();
  }, []);

  if (loading) {
    return (
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
          <span className="text-gray-300">Checking program deployment status...</span>
        </div>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card variant="glass" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Program Deployment Status</h3>
      <div className="space-y-3">
        <ProgramStatusItem
          name="Chronos Vault"
          deployed={status.vault}
          programId={programs.vault.programId.toBase58()}
        />
        <ProgramStatusItem
          name="Chronos DEX"
          deployed={status.dex}
          programId={programs.dex.programId.toBase58()}
        />
        <ProgramStatusItem
          name="Chronos Market"
          deployed={status.market}
          programId={programs.market.programId.toBase58()}
        />
        <ProgramStatusItem
          name="Chronos Orchestrator"
          deployed={status.orchestrator}
          programId={programs.orchestrator.programId.toBase58()}
        />
      </div>
      
      {status.allDeployed && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">All programs deployed successfully!</span>
          </div>
        </div>
      )}
    </Card>
  );
}

function ProgramStatusItem({ name, deployed, programId }: { name: string; deployed: boolean; programId: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
      <div className="flex items-center gap-3">
        {deployed ? (
          <CheckCircle className="w-5 h-5 text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <div>
          <div className="text-white font-medium">{name}</div>
          <div className="text-xs text-gray-400 font-mono">
            {programId.slice(0, 8)}...{programId.slice(-8)}
          </div>
        </div>
      </div>
      <div className={`text-sm font-semibold ${deployed ? 'text-green-400' : 'text-red-400'}`}>
        {deployed ? 'Deployed' : 'Not Found'}
      </div>
    </div>
  );
}

