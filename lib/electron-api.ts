/**
 * Electron API Abstraction Layer
 *
 * This module provides a unified API that works in both:
 * - Web mode: Uses Next.js API routes via fetch()
 * - Electron mode: Uses IPC via window.electronAPI
 *
 * Components import from here instead of calling APIs directly.
 */

import { BCContainer, ContainerStats, ContainerLog, BackupInfo } from './types';

// Type definitions for Electron API exposed via preload
interface DockerConnectionStatus {
  connected: boolean;
  error?: string;
  suggestion?: string;
}

interface ElectronAPI {
  docker: {
    checkConnection: () => Promise<DockerConnectionStatus>;
    listContainers: () => Promise<ApiResponse<BCContainer[]>>;
    getContainer: (id: string) => Promise<ApiResponse<BCContainer>>;
    getContainerStats: (id: string) => Promise<ApiResponse<ContainerStats>>;
    getContainerLogs: (id: string, options?: LogOptions) => Promise<ApiResponse<ContainerLog[]>>;
    startContainer: (id: string) => Promise<ApiResponse<void>>;
    stopContainer: (id: string) => Promise<ApiResponse<void>>;
    restartContainer: (id: string) => Promise<ApiResponse<void>>;
    removeContainer: (id: string, force?: boolean) => Promise<ApiResponse<void>>;
    getDockerInfo: () => Promise<ApiResponse<DockerInfo>>;
  };
  backups: {
    list: (containerName?: string) => Promise<ApiResponse<BackupInfo[]>>;
    create: (containerId: string) => Promise<ApiResponse<BackupInfo>>;
    delete: (filePath: string) => Promise<ApiResponse<void>>;
    getPath: () => Promise<ApiResponse<string>>;
  };
  ai: {
    chat: (messages: ChatMessage[], containerContext?: BCContainer) => Promise<ApiResponse<ChatMessage>>;
  };
  powershell: {
    run: (script: string, args: string[]) => Promise<PowerShellResult>;
    onOutput: (callback: (data: { type: string; data: string }) => void) => () => void;
  };
  settings: {
    get: (key: string) => Promise<ApiResponse<unknown>>;
    set: (key: string, value: unknown) => Promise<ApiResponse<void>>;
    getAll: () => Promise<ApiResponse<Record<string, unknown>>>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  app: {
    getInfo: () => Promise<AppInfo>;
  };
  platform: string;
  isElectron: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LogOptions {
  tail?: number;
  since?: number;
}

interface DockerInfo {
  version: string;
  containers: number;
  running: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PowerShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface AppInfo {
  version: string;
  name: string;
  platform: string;
  arch: string;
}

// Window type extension is declared in electron.d.ts

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

/**
 * Get the Electron API if available
 */
function getElectronAPI(): ElectronAPI | null {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  return null;
}

// ============================================
// Docker API
// ============================================

export async function checkDockerConnection(): Promise<DockerConnectionStatus> {
  const electron = getElectronAPI();

  if (electron) {
    return electron.docker.checkConnection();
  }

  // Web mode: try to fetch containers to check connection
  try {
    const response = await fetch('/api/containers');
    const data = await response.json();
    return { connected: data.success };
  } catch {
    return { connected: false, error: 'Failed to connect to API' };
  }
}

export async function listContainers(): Promise<BCContainer[]> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.docker.listContainers();
    if (!result.success) throw new Error(result.error);
    return result.data || [];
  }

  const response = await fetch('/api/containers');
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getContainer(id: string): Promise<BCContainer | null> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.docker.getContainer(id);
    if (!result.success) return null;
    return result.data || null;
  }

  const response = await fetch(`/api/containers/${id}`);
  const data = await response.json();
  if (!data.success) return null;
  return data.data;
}

export async function getContainerStats(id: string): Promise<ContainerStats> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.docker.getContainerStats(id);
    if (!result.success) throw new Error(result.error);
    return result.data!;
  }

  const response = await fetch(`/api/containers/${id}/stats`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function getContainerLogs(id: string, options?: LogOptions): Promise<ContainerLog[]> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.docker.getContainerLogs(id, options);
    if (!result.success) throw new Error(result.error);
    return result.data || [];
  }

  const params = new URLSearchParams();
  if (options?.tail) params.set('tail', options.tail.toString());
  if (options?.since) params.set('since', options.since.toString());

  const response = await fetch(`/api/logs?containerId=${id}&${params}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function containerAction(
  id: string,
  action: 'start' | 'stop' | 'restart' | 'remove'
): Promise<void> {
  const electron = getElectronAPI();

  if (electron) {
    let result: ApiResponse<void>;
    switch (action) {
      case 'start':
        result = await electron.docker.startContainer(id);
        break;
      case 'stop':
        result = await electron.docker.stopContainer(id);
        break;
      case 'restart':
        result = await electron.docker.restartContainer(id);
        break;
      case 'remove':
        result = await electron.docker.removeContainer(id);
        break;
    }
    if (!result.success) throw new Error(result.error);
    return;
  }

  const response = await fetch('/api/containers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, containerId: id }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

export async function getDockerInfo(): Promise<DockerInfo> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.docker.getDockerInfo();
    if (!result.success) throw new Error(result.error);
    return result.data!;
  }

  const response = await fetch('/api/docker/info');
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ============================================
// Backup API
// ============================================

export async function listBackups(containerName?: string): Promise<BackupInfo[]> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.backups.list(containerName);
    if (!result.success) throw new Error(result.error);
    return result.data || [];
  }

  const url = containerName
    ? `/api/backups?containerName=${encodeURIComponent(containerName)}`
    : '/api/backups';
  const response = await fetch(url);
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function createBackup(containerId: string): Promise<BackupInfo> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.backups.create(containerId);
    if (!result.success) throw new Error(result.error);
    return result.data!;
  }

  const response = await fetch('/api/backups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ containerId }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

export async function deleteBackup(filePath: string): Promise<void> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.backups.delete(filePath);
    if (!result.success) throw new Error(result.error);
    return;
  }

  const response = await fetch('/api/backups', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filePath }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
}

// ============================================
// AI API
// ============================================

export async function sendAIMessage(
  messages: ChatMessage[],
  containerContext?: BCContainer
): Promise<ChatMessage> {
  const electron = getElectronAPI();

  if (electron) {
    const result = await electron.ai.chat(messages, containerContext);
    if (!result.success) throw new Error(result.error);
    return result.data!;
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, containerContext }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data.data;
}

// ============================================
// PowerShell API (Electron only)
// ============================================

export async function runPowerShell(
  script: string,
  args: string[] = []
): Promise<PowerShellResult> {
  const electron = getElectronAPI();

  if (!electron) {
    throw new Error('PowerShell execution is only available in the desktop app');
  }

  return electron.powershell.run(script, args);
}

export function onPowerShellOutput(
  callback: (data: { type: string; data: string }) => void
): () => void {
  const electron = getElectronAPI();

  if (!electron) {
    return () => {}; // No-op cleanup function
  }

  return electron.powershell.onOutput(callback);
}

// ============================================
// Settings API (Electron only)
// ============================================

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const electron = getElectronAPI();

  if (!electron) {
    // Fall back to localStorage in web mode
    if (typeof window !== 'undefined') {
      const value = localStorage.getItem(`bc-manager-${key}`);
      return value ? JSON.parse(value) : undefined;
    }
    return undefined;
  }

  const result = await electron.settings.get(key);
  return result.data as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const electron = getElectronAPI();

  if (!electron) {
    // Fall back to localStorage in web mode
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bc-manager-${key}`, JSON.stringify(value));
    }
    return;
  }

  await electron.settings.set(key, value);
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const electron = getElectronAPI();

  if (!electron) {
    return {};
  }

  const result = await electron.settings.getAll();
  return result.data || {};
}

// ============================================
// Shell API
// ============================================

export async function openExternal(url: string): Promise<void> {
  const electron = getElectronAPI();

  if (electron) {
    await electron.shell.openExternal(url);
  } else {
    window.open(url, '_blank');
  }
}

// ============================================
// App Info
// ============================================

export async function getAppInfo(): Promise<AppInfo | null> {
  const electron = getElectronAPI();

  if (!electron) {
    return null;
  }

  return electron.app.getInfo();
}
