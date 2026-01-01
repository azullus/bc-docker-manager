/**
 * Docker API Client for BC Container Management
 * Uses dockerode for native Docker Engine API access
 */

import Docker from 'dockerode';
import { BCContainer, ContainerStats, ContainerLog, PortMapping, BackupInfo } from './types';

/**
 * Get Docker connection options based on environment
 * Supports: Windows named pipe, Unix socket, WSL2 with Docker Desktop
 */
function getDockerOptions(): Docker.DockerOptions {
  // Check for explicit DOCKER_HOST environment variable first
  if (process.env.DOCKER_HOST) {
    const host = process.env.DOCKER_HOST;
    if (host.startsWith('tcp://')) {
      const url = new URL(host);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 2375,
      };
    }
    if (host.startsWith('unix://')) {
      return { socketPath: host.replace('unix://', '') };
    }
    if (host.startsWith('npipe://')) {
      return { socketPath: host.replace('npipe://', '') };
    }
  }

  // Windows: use named pipe
  if (process.platform === 'win32') {
    return { socketPath: '//./pipe/docker_engine' };
  }

  // Check for Docker socket in common locations
  const fs = require('fs');
  const socketPaths = [
    '/var/run/docker.sock',           // Standard Linux/macOS
    '/run/docker.sock',               // Alternative Linux location
    '/mnt/wsl/docker-desktop/docker.sock', // WSL2 Docker Desktop socket
  ];

  for (const socketPath of socketPaths) {
    try {
      fs.accessSync(socketPath, fs.constants.R_OK | fs.constants.W_OK);
      return { socketPath };
    } catch {
      // Socket not accessible, try next
    }
  }

  // Fallback: try TCP connection to Docker Desktop on Windows host from WSL
  // Docker Desktop exposes on localhost:2375 when "Expose daemon on tcp://localhost:2375" is enabled
  return {
    host: 'localhost',
    port: 2375,
  };
}

// Docker client - connects using best available method
const docker = new Docker(getDockerOptions());

/**
 * BC Container name pattern
 */
const BC_CONTAINER_PATTERN = /^bcserver/;

/**
 * Lists all BC containers
 */
export async function listBCContainers(): Promise<BCContainer[]> {
  const containers = await docker.listContainers({ all: true });

  const bcContainers = containers
    .filter(c => c.Names.some(n => BC_CONTAINER_PATTERN.test(n.replace('/', ''))))
    .map(c => mapContainerToBCContainer(c));

  // Fetch additional stats for running containers
  const enrichedContainers = await Promise.all(
    bcContainers.map(async (container) => {
      if (container.status === 'running') {
        try {
          const stats = await getContainerStats(container.id);
          return {
            ...container,
            cpuUsage: `${stats.cpuPercent.toFixed(1)}%`,
            memoryUsage: formatBytes(stats.memoryUsage),
          };
        } catch {
          return container;
        }
      }
      return container;
    })
  );

  return enrichedContainers;
}

/**
 * Gets a single BC container by ID or name
 */
export async function getContainer(idOrName: string): Promise<BCContainer | null> {
  try {
    const container = docker.getContainer(idOrName);
    const info = await container.inspect();

    return {
      id: info.Id,
      name: info.Name.replace('/', ''),
      status: mapStatus(info.State.Status),
      image: info.Config.Image,
      created: info.Created,
      ports: mapPorts(info.NetworkSettings.Ports),
      health: info.State.Health?.Status as BCContainer['health'],
      bcVersion: extractBCVersion(info.Config.Image),
      webClientUrl: buildWebClientUrl(info),
      uptime: info.State.Running ? calculateUptime(info.State.StartedAt) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Gets real-time stats for a container
 */
export async function getContainerStats(containerId: string): Promise<ContainerStats> {
  const container = docker.getContainer(containerId);
  const stats = await container.stats({ stream: false });

  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

  const memoryUsage = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
  const memoryLimit = stats.memory_stats.limit;

  return {
    cpuPercent: isNaN(cpuPercent) ? 0 : cpuPercent,
    memoryUsage,
    memoryLimit,
    memoryPercent: (memoryUsage / memoryLimit) * 100,
    networkRx: stats.networks?.eth0?.rx_bytes || 0,
    networkTx: stats.networks?.eth0?.tx_bytes || 0,
  };
}

/**
 * Gets container logs
 */
export async function getContainerLogs(
  containerId: string,
  options: { tail?: number; since?: number; follow?: boolean } = {}
): Promise<ContainerLog[]> {
  const container = docker.getContainer(containerId);

  const logStream = await container.logs({
    stdout: true,
    stderr: true,
    tail: options.tail || 100,
    since: options.since || 0,
    timestamps: true,
  });

  const logs: ContainerLog[] = [];
  const lines = logStream.toString().split('\n').filter(Boolean);

  for (const line of lines) {
    // Docker log format: 8-byte header + timestamp + message
    // Skip lines that are too short to contain valid log data
    if (line.length < 8) {
      continue;
    }

    // Skip header bytes and parse
    const cleanLine = line.substring(8);
    const match = cleanLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s(.*)$/);

    if (match) {
      logs.push({
        timestamp: match[1],
        stream: line.charCodeAt(0) === 1 ? 'stdout' : 'stderr',
        message: match[2],
      });
    }
  }

  return logs;
}

/**
 * Starts a container
 */
export async function startContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.start();
}

/**
 * Stops a container
 */
export async function stopContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.stop();
}

/**
 * Restarts a container
 */
export async function restartContainer(containerId: string): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.restart();
}

/**
 * Removes a container
 */
export async function removeContainer(containerId: string, force: boolean = false): Promise<void> {
  const container = docker.getContainer(containerId);
  await container.remove({ force });
}

/**
 * Executes a command inside a container
 */
export async function execInContainer(
  containerId: string,
  cmd: string[]
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const container = docker.getContainer(containerId);

  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start({ hijack: true, stdin: false });

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    stream.on('data', (chunk: Buffer) => {
      // Parse Docker multiplexed stream
      const streamType = chunk.readUInt8(0);
      const payload = chunk.slice(8).toString();

      if (streamType === 1) {
        stdout += payload;
      } else if (streamType === 2) {
        stderr += payload;
      }
    });

    stream.on('end', async () => {
      const inspection = await exec.inspect();
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: inspection.ExitCode || 0,
      });
    });

    stream.on('error', reject);
  });
}

/**
 * Creates a database backup for a BC container
 */
export async function createBackup(containerId: string, backupPath: string): Promise<BackupInfo> {
  const container = await getContainer(containerId);
  if (!container) {
    throw new Error(`Container ${containerId} not found`);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${container.name}_${timestamp}.bak`;

  // Execute backup command inside container
  const result = await execInContainer(containerId, [
    'powershell', '-Command',
    `Backup-SqlDatabase -ServerInstance localhost -Database CRONUS -BackupFile "C:\\Run\\my\\${fileName}" -CompressionOption On`
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Backup failed: ${result.stderr}`);
  }

  return {
    id: `backup_${Date.now()}`,
    containerName: container.name,
    fileName,
    filePath: `${backupPath}\\${fileName}`,
    size: 0, // Would need to copy and check
    createdAt: new Date().toISOString(),
    status: 'completed',
  };
}

/**
 * Gets Docker system info
 */
export async function getDockerInfo(): Promise<{ version: string; containers: number; running: number }> {
  const info = await docker.info();
  return {
    version: info.ServerVersion,
    containers: info.Containers,
    running: info.ContainersRunning,
  };
}

// Helper functions

function mapContainerToBCContainer(container: Docker.ContainerInfo): BCContainer {
  const name = container.Names[0]?.replace('/', '') || 'unknown';

  return {
    id: container.Id,
    name,
    status: mapStatus(container.State),
    image: container.Image,
    created: new Date(container.Created * 1000).toISOString(),
    ports: container.Ports.map(p => ({
      privatePort: p.PrivatePort,
      publicPort: p.PublicPort || 0,
      type: p.Type as 'tcp' | 'udp',
    })),
    bcVersion: extractBCVersion(container.Image),
    webClientUrl: buildWebClientUrlFromPorts(name, container.Ports),
  };
}

function mapStatus(state: string): BCContainer['status'] {
  const statusMap: Record<string, BCContainer['status']> = {
    running: 'running',
    exited: 'exited',
    paused: 'paused',
    restarting: 'restarting',
    dead: 'dead',
    created: 'stopped',
  };
  return statusMap[state.toLowerCase()] || 'stopped';
}

function mapPorts(ports: Record<string, any[]>): PortMapping[] {
  const mappings: PortMapping[] = [];

  for (const [key, bindings] of Object.entries(ports)) {
    if (bindings) {
      const [port, type] = key.split('/');
      const privatePort = parseInt(port, 10);

      // Skip invalid port entries
      if (Number.isNaN(privatePort)) {
        continue;
      }

      for (const binding of bindings) {
        const publicPort = parseInt(binding.HostPort, 10);

        // Skip bindings with invalid public ports
        if (Number.isNaN(publicPort)) {
          continue;
        }

        mappings.push({
          privatePort,
          publicPort,
          type: type as 'tcp' | 'udp',
        });
      }
    }
  }

  return mappings;
}

function extractBCVersion(image: string): string | undefined {
  // Try to extract version from image name
  const match = image.match(/bc(\d+)|businesscentral[:\-]?(\d+)/i);
  if (match) {
    return match[1] || match[2];
  }
  return undefined;
}

function buildWebClientUrl(info: any): string | undefined {
  const ports = info.NetworkSettings.Ports;
  const httpsPort = ports['443/tcp']?.[0]?.HostPort;
  const name = info.Name.replace('/', '');

  if (httpsPort) {
    return `https://${name}:${httpsPort}/BC/`;
  }
  return undefined;
}

function buildWebClientUrlFromPorts(name: string, ports: Docker.Port[]): string | undefined {
  const httpsPort = ports.find(p => p.PrivatePort === 443)?.PublicPort;
  if (httpsPort) {
    return `https://${name}:${httpsPort}/BC/`;
  }
  return undefined;
}

function calculateUptime(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
