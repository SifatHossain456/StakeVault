'use client';
import { useState } from 'react';
import { useDeployContract, useWaitForTransactionReceipt } from 'wagmi';
import { SIMPLETOKEN_ABI, SIMPLETOKEN_BYTECODE } from '@/lib/contracts/SimpleToken';

export default function DeployTokenForm() {
  const [name, setName]     = useState('');
  const [symbol, setSymbol] = useState('');
  const [supply, setSupply] = useState('');

  const { deployContract, data: hash, isPending, error } = useDeployContract();
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({ hash });

  function handleDeploy() {
    if (SIMPLETOKEN_BYTECODE === '0x') { alert('Run: npm run compile'); return; }
    if (!name || !symbol || !supply) return;
    deployContract({
      abi: SIMPLETOKEN_ABI,
      bytecode: SIMPLETOKEN_BYTECODE,
      args: [name, symbol, BigInt(supply)],
    });
  }

  const deployed = receipt?.contractAddress;

  return (
    <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 14, padding: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0', marginBottom: 20 }}>🪙 Deploy Token</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Token name (e.g. Stake Token)" />
        <input value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="Symbol (e.g. STK)" />
        <input value={supply} onChange={e => setSupply(e.target.value)} placeholder="Supply (e.g. 1000000)" type="number" />
      </div>

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
          {error.message.slice(0, 120)}
        </div>
      )}

      {deployed ? (
        <div style={{ background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 10, padding: 16 }}>
          <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>✅ Deployed!</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Contract address:</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', wordBreak: 'break-all' }}>{deployed}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(deployed); }}
            style={{ marginTop: 10, padding: '6px 14px', background: '#1e1e3f', color: '#a78bfa', fontSize: 12, borderRadius: 6 }}
          >
            Copy Address
          </button>
        </div>
      ) : (
        <button
          onClick={handleDeploy}
          disabled={isPending || isLoading || !name || !symbol || !supply}
          style={{
            width: '100%', padding: '13px 0',
            background: (isPending || isLoading) ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
          }}
        >
          {isPending ? 'Confirm in Wallet…' : isLoading ? 'Deploying…' : 'Deploy Token'}
        </button>
      )}
    </div>
  );
}
