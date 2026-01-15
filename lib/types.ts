/**
 * Type definitions for BC Docker Manager
 */

export interface BCContainer {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'paused' | 'restarting' | 'exited' | 'dead';
  image: string;
  created: string;
  ports: PortMapping[];
  bcVersion?: string;
  webClientUrl?: string;
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none';
  memoryUsage?: string;
  cpuUsage?: string;
  uptime?: string;
  statsError?: string; // Error message if stats fetch failed
}

export interface PortMapping {
  privatePort: number;
  publicPort: number;
  type: 'tcp' | 'udp';
}

export interface ContainerStats {
  cpuPercent: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  networkRx: number;
  networkTx: number;
}

export interface ContainerLog {
  timestamp: string;
  stream: 'stdout' | 'stderr';
  message: string;
}

export interface BackupInfo {
  id: string;
  containerName: string;
  fileName: string;
  filePath: string;
  backupFolder?: string; // Timestamped directory containing backup files
  size: number;
  createdAt: string;
  status: 'completed' | 'in_progress' | 'failed';
}

export interface BackupSchedule {
  containerName: string;
  enabled: boolean;
  time: string;
  retentionDays: number;
  lastRun?: string;
  nextRun?: string;
}

export interface ContainerAction {
  type: 'start' | 'stop' | 'restart' | 'remove' | 'backup';
  containerId: string;
  timestamp: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TroubleshootingContext {
  containerName?: string;
  errorLog?: string;
  action?: string;
}

export interface DashboardStats {
  totalContainers: number;
  runningContainers: number;
  stoppedContainers: number;
  totalBackups: number;
  lastBackupDate?: string;
  healthyContainers: number;
  unhealthyContainers: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
