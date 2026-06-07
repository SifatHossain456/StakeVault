import PoolDashboard from '@/components/Pool/PoolDashboard';

interface Props { params: { address: string } }

export default function PoolPage({ params }: Props) {
  return <PoolDashboard address={params.address as `0x${string}`} />;
}
