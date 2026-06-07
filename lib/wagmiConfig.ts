'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'StakeVault',
  projectId: 'stakevault-demo',
  chains: [baseSepolia],
  ssr: true,
});
