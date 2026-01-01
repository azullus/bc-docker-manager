'use client';

import { DeploymentProvider } from '@/lib/deployment-context';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DeploymentProvider>
      {children}
    </DeploymentProvider>
  );
}
