'use client';
import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseUnits, formatUnits } from 'viem';
import { STAKINGPOOL_ABI } from '@/lib/contracts/StakingPool';
import { SIMPLETOKEN_ABI } from '@/lib/contracts/SimpleToken';

interface Props { address: `0x${string}`; }

const SECONDS_PER_YEAR = 365n * 24n * 3600n;

function fmt(val: bigint | undefined, dec = 18): string {
  if (val === undefined) return '—';
  return parseFloat(formatUnits(val, dec)).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function timeLeft(finish: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (finish <= now) return 'Ended';
  const secs = Number(finish - now);
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`;
}

export default function PoolDashboard({ address }: Props) {
  const { address: userAddr, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [stakeAmt,  setStakeAmt]  = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [rewardAmt, setRewardAmt] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'withdraw' | 'reward'>('stake');
  // Track which step the stake flow is on so we don't clear stakeAmt after approve
  const [stakeStep, setStakeStep] = useState<'idle' | 'approving' | 'staking'>('idle');

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isSuccess: txDone, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  // Pool info
  const { data: poolInfo, refetch: refetchPool } = useReadContract({
    address, abi: STAKINGPOOL_ABI, functionName: 'getPoolInfo',
  });
  const [totalStaked, rewardRate, periodFinish, rewardsDuration, stakingTokenAddr, rewardTokenAddr, poolOwner] =
    (poolInfo as [bigint, bigint, bigint, bigint, string, string, string] | undefined) ?? [];

  // User info
  const { data: myStaked,  refetch: refetchMyStaked  } = useReadContract({ address, abi: STAKINGPOOL_ABI, functionName: 'staked',  args: userAddr ? [userAddr] : undefined });
  const { data: myEarned,  refetch: refetchMyEarned  } = useReadContract({ address, abi: STAKINGPOOL_ABI, functionName: 'earned',  args: userAddr ? [userAddr] : undefined });

  // Token balances
  const { data: stakeBalance, refetch: refetchBal } = useReadContract({
    address: stakingTokenAddr as `0x${string}` | undefined,
    abi: SIMPLETOKEN_ABI, functionName: 'balanceOf',
    args: userAddr ? [userAddr] : undefined,
  });
  const { data: stakeSymbol  } = useReadContract({ address: stakingTokenAddr as `0x${string}` | undefined, abi: SIMPLETOKEN_ABI, functionName: 'symbol' });
  const { data: rewardSymbol } = useReadContract({ address: rewardTokenAddr  as `0x${string}` | undefined, abi: SIMPLETOKEN_ABI, functionName: 'symbol' });
  const { data: rewardBalance } = useReadContract({
    address: rewardTokenAddr as `0x${string}` | undefined,
    abi: SIMPLETOKEN_ABI, functionName: 'balanceOf',
    args: userAddr ? [userAddr] : undefined,
  });

  useEffect(() => {
    if (txDone) {
      refetchPool(); refetchMyStaked(); refetchMyEarned(); refetchBal(); reset();
      // Don't clear stakeAmt after approve — user still needs it to call stake
      if (stakeStep !== 'approving') setStakeAmt('');
      setWithdrawAmt(''); setRewardAmt('');
      setStakeStep('idle');
    }
  }, [txDone]);

  const isOwner = userAddr && poolOwner && userAddr.toLowerCase() === (poolOwner as string).toLowerCase();

  // APR = (rewardRate * SECONDS_PER_YEAR / totalStaked) * 100
  let apr = '—';
  if (rewardRate !== undefined && totalStaked !== undefined && totalStaked > 0n) {
    const aprBps = rewardRate * SECONDS_PER_YEAR * 10000n / totalStaked;
    apr = (Number(aprBps) / 100).toFixed(1) + '%';
  }

  const stkSym  = (stakeSymbol  as string | undefined) ?? 'STK';
  const rwdSym  = (rewardSymbol as string | undefined) ?? 'RWD';
  const isActive = periodFinish !== undefined && BigInt(Math.floor(Date.now() / 1000)) < periodFinish;

  function doStake() {
    if (!isConnected) { openConnectModal?.(); return; }
    if (!stakingTokenAddr || !stakeAmt) return;
    setStakeStep('approving');
    writeContract({
      address: stakingTokenAddr as `0x${string}`,
      abi: SIMPLETOKEN_ABI, functionName: 'approve',
      args: [address, parseUnits(stakeAmt, 18)],
    });
  }

  function doStakeAfterApprove() {
    setStakeStep('staking');
    writeContract({ address, abi: STAKINGPOOL_ABI, functionName: 'stake', args: [parseUnits(stakeAmt, 18)] });
  }

  function doWithdraw() {
    if (!isConnected) { openConnectModal?.(); return; }
    writeContract({ address, abi: STAKINGPOOL_ABI, functionName: 'withdraw', args: [parseUnits(withdrawAmt, 18)] });
  }

  function doClaim() {
    if (!isConnected) { openConnectModal?.(); return; }
    writeContract({ address, abi: STAKINGPOOL_ABI, functionName: 'claimReward' });
  }

  function doExit() {
    if (!isConnected) { openConnectModal?.(); return; }
    writeContract({ address, abi: STAKINGPOOL_ABI, functionName: 'exit' });
  }

  function doApproveReward() {
    if (!rewardTokenAddr || !rewardAmt) return;
    writeContract({
      address: rewardTokenAddr as `0x${string}`,
      abi: SIMPLETOKEN_ABI, functionName: 'approve',
      args: [address, parseUnits(rewardAmt, 18)],
    });
  }

  function doNotifyReward() {
    writeContract({ address, abi: STAKINGPOOL_ABI, functionName: 'notifyRewardAmount', args: [parseUnits(rewardAmt, 18)] });
  }

  const tabStyle = (t: string) => ({
    padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
    background: activeTab === t ? '#8b5cf6' : '#16163a',
    color: activeTab === t ? 'white' : '#94a3b8',
    border: 'none',
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 16px' }}>
      {/* Pool address */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Pool</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', wordBreak: 'break-all' }}>{address}</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'TVL', value: `${fmt(totalStaked)} ${stkSym}` },
          { label: 'APR', value: apr },
          { label: 'Period', value: periodFinish !== undefined ? timeLeft(periodFinish) : '—' },
          { label: 'Status', value: isActive ? '🟢 Active' : '🔴 Ended' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 14 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* User stats */}
      {isConnected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Your Staked</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>{fmt(myStaked as bigint | undefined)}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{stkSym}</div>
          </div>
          <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Earned</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{fmt(myEarned as bigint | undefined)}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{rwdSym}</div>
          </div>
        </div>
      )}

      {/* Action tabs */}
      {isConnected ? (
        <div style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button style={tabStyle('stake')}    onClick={() => setActiveTab('stake')}>Stake</button>
            <button style={tabStyle('withdraw')} onClick={() => setActiveTab('withdraw')}>Withdraw</button>
            {isOwner && <button style={tabStyle('reward')} onClick={() => setActiveTab('reward')}>+ Rewards</button>}
          </div>

          {error && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#f87171', fontSize: 13 }}>
              {error.message.slice(0, 140)}
            </div>
          )}

          {activeTab === 'stake' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Wallet: {fmt(stakeBalance as bigint | undefined)} {stkSym}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} placeholder={`Amount to stake`} type="number" style={{ flex: 1 }} />
                <button
                  onClick={() => stakeBalance && setStakeAmt(formatUnits(stakeBalance as bigint, 18))}
                  style={{ padding: '0 14px', background: '#16163a', color: '#a78bfa', fontSize: 13, borderRadius: 8 }}
                >MAX</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doStake} disabled={isPending || txLoading || !stakeAmt}
                  style={{ flex: 1, padding: '12px 0', background: isPending ? '#16163a' : '#1e1e3f', color: '#a78bfa', fontWeight: 700, fontSize: 14, borderRadius: 10 }}>
                  {isPending ? 'Approving…' : '1. Approve'}
                </button>
                <button onClick={doStakeAfterApprove} disabled={isPending || txLoading || !stakeAmt}
                  style={{ flex: 1, padding: '12px 0', background: (isPending || txLoading) ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', fontWeight: 700, fontSize: 14, borderRadius: 10 }}>
                  {txLoading ? 'Staking…' : '2. Stake'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>Approve first, then stake in the same amount.</div>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Staked: {fmt(myStaked as bigint | undefined)} {stkSym}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)} placeholder="Amount to withdraw" type="number" style={{ flex: 1 }} />
                <button
                  onClick={() => myStaked && setWithdrawAmt(formatUnits(myStaked as bigint, 18))}
                  style={{ padding: '0 14px', background: '#16163a', color: '#a78bfa', fontSize: 13, borderRadius: 8 }}
                >MAX</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doWithdraw} disabled={isPending || txLoading || !withdrawAmt}
                  style={{ flex: 1, padding: '12px 0', background: (isPending || txLoading) ? '#16163a' : '#1e1e3f', color: '#f87171', fontWeight: 700, borderRadius: 10 }}>
                  {isPending ? 'Confirming…' : txLoading ? 'Withdrawing…' : 'Withdraw'}
                </button>
                <button onClick={doClaim} disabled={isPending || txLoading}
                  style={{ flex: 1, padding: '12px 0', background: (isPending || txLoading) ? '#16163a' : '#0a2a1a', color: '#4ade80', fontWeight: 700, borderRadius: 10, border: '1px solid #1e4a2e' }}>
                  Claim {fmt(myEarned as bigint | undefined)} {rwdSym}
                </button>
              </div>
              <button onClick={doExit} disabled={isPending || txLoading}
                style={{ padding: '12px 0', background: '#1a0a0a', color: '#f87171', fontWeight: 700, borderRadius: 10, border: '1px solid #4a1e1e', fontSize: 13 }}>
                Exit (Withdraw All + Claim)
              </button>
            </div>
          )}

          {activeTab === 'reward' && isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Your {rwdSym} balance: {fmt(rewardBalance as bigint | undefined)}
              </div>
              <input value={rewardAmt} onChange={e => setRewardAmt(e.target.value)} placeholder={`Reward amount (${rwdSym})`} type="number" />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={doApproveReward} disabled={isPending || txLoading || !rewardAmt}
                  style={{ flex: 1, padding: '12px 0', background: '#1e1e3f', color: '#a78bfa', fontWeight: 700, borderRadius: 10 }}>
                  {isPending ? 'Approving…' : '1. Approve'}
                </button>
                <button onClick={doNotifyReward} disabled={isPending || txLoading || !rewardAmt}
                  style={{ flex: 1, padding: '12px 0', background: (isPending || txLoading) ? '#16163a' : 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', fontWeight: 700, borderRadius: 10 }}>
                  {txLoading ? 'Funding…' : '2. Fund Pool'}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                Tokens will be distributed over {rewardsDuration ? Number(rewardsDuration) / 86400 : '?'} days.
              </div>
            </div>
          )}

          {txDone && (
            <div style={{ marginTop: 14, textAlign: 'center', color: '#4ade80', fontWeight: 700 }}>
              ✅ Transaction confirmed!
            </div>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 16 }}>Connect wallet to stake, withdraw, or claim rewards.</div>
          <button onClick={() => openConnectModal?.()} style={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', color: 'white', padding: '12px 32px', fontSize: 14, fontWeight: 700, borderRadius: 10 }}>
            Connect Wallet
          </button>
        </div>
      )}

      {/* Pool metadata */}
      <div style={{ marginTop: 24, background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 10, padding: 16, fontSize: 12, color: '#64748b' }}>
        <div style={{ marginBottom: 6 }}>Staking Token: <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{stakingTokenAddr ?? '…'}</span></div>
        <div style={{ marginBottom: 6 }}>Reward Token: <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{rewardTokenAddr ?? '…'}</span></div>
        <div>Reward Rate: <span style={{ color: '#e2e8f0' }}>{rewardRate !== undefined ? fmt(rewardRate) : '—'} {rwdSym}/sec</span></div>
      </div>
    </div>
  );
}
