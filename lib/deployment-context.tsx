'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { onPowerShellOutput } from '@/lib/electron-api';

export type DeploymentStatus = 'idle' | 'running' | 'success' | 'error';

interface DeploymentState {
  status: DeploymentStatus;
  containerName: string | null;
  version: string | null;
  output: string[];
  startedAt: Date | null;
}

interface DeploymentContextType {
  deployment: DeploymentState;
  startDeployment: (containerName: string, version: string) => void;
  addOutput: (line: string) => void;
  setStatus: (status: DeploymentStatus) => void;
  clearDeployment: () => void;
  isDeploying: boolean;
}

const initialState: DeploymentState = {
  status: 'idle',
  containerName: null,
  version: null,
  output: [],
  startedAt: null,
};

const DeploymentContext = createContext<DeploymentContextType | null>(null);

export function DeploymentProvider({ children }: { children: React.ReactNode }) {
  const [deployment, setDeployment] = useState<DeploymentState>(initialState);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Subscribe to PowerShell output when component mounts
  useEffect(() => {
    unsubscribeRef.current = onPowerShellOutput((data) => {
      setDeployment((prev) => {
        // Only add output if we're in a deployment
        if (prev.status === 'running') {
          return {
            ...prev,
            output: [...prev.output, data.data],
          };
        }
        return prev;
      });
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  const startDeployment = useCallback((containerName: string, version: string) => {
    setDeployment({
      status: 'running',
      containerName,
      version,
      output: [`Starting deployment of ${containerName} (BC ${version})...`, ''],
      startedAt: new Date(),
    });
  }, []);

  const addOutput = useCallback((line: string) => {
    setDeployment((prev) => ({
      ...prev,
      output: [...prev.output, line],
    }));
  }, []);

  const setStatus = useCallback((status: DeploymentStatus) => {
    setDeployment((prev) => ({
      ...prev,
      status,
    }));
  }, []);

  const clearDeployment = useCallback(() => {
    setDeployment(initialState);
  }, []);

  const isDeploying = deployment.status === 'running';

  return (
    <DeploymentContext.Provider
      value={{
        deployment,
        startDeployment,
        addOutput,
        setStatus,
        clearDeployment,
        isDeploying,
      }}
    >
      {children}
    </DeploymentContext.Provider>
  );
}

export function useDeployment() {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error('useDeployment must be used within a DeploymentProvider');
  }
  return context;
}
