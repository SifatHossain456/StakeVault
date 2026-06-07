'use client';
import { useState } from 'react';
import { useDeployContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { STAKINGPOOL_ABI, STAKINGPOOL_BYTECODE } from '@/lib/contracts/StakingPool';

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export default function DeployPoolForm() {
  const router = useRouter();
  const [stakeToken,  setStakeToken]  = useState('');
  const [rewardToken, setRewardToken] = useState('');
  const [days,        setDays]        = useState('7');
  const [addrErr,     setAddrErr]     = useState('');

  const { deployContract, data: hash, isPending, error } = useDeployContract();
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({ hash });

  function handleDeploy() {
    if (STAKINGPOOL_BYTECODE === '0x') { alert('Run: npm run compile'); return; }
    if (!ADDR_RE.test(stakeToken))  { setAddrErr('Invalid staking token address'); return; }
    if (!ADDR_RE.test(rewardToken)) { setAddrErr('Invalid reward token address'); return; }
    if (!days || Number(days) <= 0) { setAddrErr('Duration must be > 0 days'); return; }
    setAddrErr('');
    deployContract({
      abi: STAKINGPOOL_ABI,
      bytecode: STAKINGPOOL_BYTECODE,
      args: [stakeToken as `0x${string}`, rewardToken as `0x${string}`, BigInt(Number(days) * 86400)],
    });
  }

  const deployed = receipt?.contractAddress;

  return (
    <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 14, padding: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0', marginBottom: 6 }}>🏗 Deploy Staking Pool</div>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
        Same token for staking + rewards is fine (e.g. use the same address twice)
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <input value={stakeToken} onChange={e => setStakeToken(e.target.value)} placeholder="Staking token address (0x...)" />
        <input value={rewardToken} onChange={e => setRewardToken(e.target.value)} placeholder="Reward token address (0x...)" />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={days} onChange={e => setDays(e.target.value)}
            placeholder="Reward period" type="number" min="1" style={{ flex: 1 }}
          />
          <span style={{ color: '#64748b', fontSize: 14, whiteSpace: 'nowrap' }}>days</span>
        </div>
      </div>

      {addrErr && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
          {addrErr}
        </div>
      )}

      {error && (
        <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
          {error.message.slice(0, 120)}
        </div>
      )}

      {deployed ? (
        <div style={{ background: '#0a1a0a', border: '1px solid #1e3a1e', borderRadius: 10, padding: 16 }}>
          <div style={{ color: '#4ade80', fontWeight: 700, marginBottom: 6 }}>✅ Pool Deployed!</div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', wordBreak: 'break-all', marginBottom: 12 }}>{deployed}</div>
          <button
            onClick={() => router.push(`/pool/${deployed}`)}
            style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', fontWeight: 700, borderRadius: 10 }}
          >
            Open Pool Dashboard →
          </button>
        </div>
      ) : (
        <button
          onClick={handleDeploy}
          disabled={isPending || isLoading || !stakeToken || !rewardToken || !days || Number(days) <= 0}
          style={{
            width: '100%', padding: '13px 0',
            background: (isPending || isLoading) ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            color: 'white', fontSize: 15, fontWeight: 700, borderRadius: 10,
          }}
        >
          {isPending ? 'Confirm in Wallet…' : isLoading ? 'Deploying…' : 'Deploy Pool'}
        </button>
      )}
    </div>
  );
}
