import type { Metadata } from 'next';
import Providers from '@/components/Layout/Providers';
import NavBar from '@/components/Layout/NavBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'StakeVault — Staking Rewards on Base Sepolia',
  description: 'Stake tokens, earn rewards. Synthetix-style staking pool on Base Sepolia.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <NavBar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
