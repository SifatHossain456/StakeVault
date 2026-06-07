'use client';
import { useState } from 'react';
import DeployTokenForm from '@/components/Token/DeployTokenForm';
import DeployPoolForm from '@/components/Pool/DeployPoolForm';

const TABS = [
  { id: 'token', label: '🪙 Deploy Token' },
  { id: 'pool',  label: '🏗 Deploy Pool' },
];

export default function HomePage() {
  const [tab, setTab] = useState('token');

  return (
    <div style={{ maxWidth: 560, margin: '48px auto', padding: '0 16px' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>StakeVault</h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 380, margin: '0 auto', lineHeight: 1.6 }}>
          Deploy a token, launch a staking pool, earn rewards — Synthetix reward accumulator on Base Sepolia.
        </p>
      </div>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 36 }}>
        {[
          { step: '1', icon: '🪙', title: 'Deploy Token', desc: 'ERC-20 with custom name & supply' },
          { step: '2', icon: '🏗', title: 'Launch Pool', desc: 'Set staking + reward tokens, duration' },
          { step: '3', icon: '💰', title: 'Earn Rewards', desc: 'Stake → earn per second, claim anytime' },
        ].map(s => (
          <div key={s.step} style={{ background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13, marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: tab === t.id ? '#8b5cf6' : '#16163a',
            color: tab === t.id ? 'white' : '#94a3b8',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'token' && <DeployTokenForm />}
      {tab === 'pool'  && <DeployPoolForm />}

      {/* Open existing pool */}
      <OpenPoolCard />
    </div>
  );
}

function OpenPoolCard() {
  const [addr, setAddr] = useState('');
  return (
    <div style={{ marginTop: 24, background: '#0a0a1e', border: '1px solid #16163a', borderRadius: 14, padding: 20 }}>
      <div style={{ fontWeight: 600, color: '#94a3b8', fontSize: 14, marginBottom: 12 }}>🔍 Open Existing Pool</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="Pool contract address (0x...)" style={{ flex: 1 }} />
        <a
          href={addr.startsWith('0x') ? `/pool/${addr}` : '#'}
          style={{
            padding: '0 16px', background: addr.startsWith('0x') ? '#8b5cf6' : '#16163a',
            color: 'white', fontSize: 14, fontWeight: 600, borderRadius: 8,
            display: 'flex', alignItems: 'center', textDecoration: 'none',
            pointerEvents: addr.startsWith('0x') ? 'auto' : 'none', opacity: addr.startsWith('0x') ? 1 : 0.4,
          }}
        >
          Open →
        </a>
      </div>
    </div>
  );
}
