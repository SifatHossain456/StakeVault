'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function NavBar() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px', borderBottom: '1px solid #1e1e3f',
      background: 'rgba(5,5,20,0.95)', backdropFilter: 'blur(10px)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <span style={{ fontWeight: 800, fontSize: 20, color: '#e2e8f0', letterSpacing: '-0.5px' }}>
          🏦 StakeVault
        </span>
        <span style={{ marginLeft: 8, fontSize: 11, color: '#64748b', fontWeight: 500 }}>Base Sepolia</span>
      </Link>
      <ConnectButton />
    </nav>
  );
}
