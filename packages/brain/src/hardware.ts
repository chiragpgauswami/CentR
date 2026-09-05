import os from 'node:os';
import type { HardwareInfo, HardwareRecommendation } from './types.js';

export function detectHardware(): HardwareInfo {
  const totalBytes = os.totalmem();
  const totalMemoryGb = Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10;

  let availableMemoryGb: number | undefined;
  try {
    const freeBytes = os.freemem();
    availableMemoryGb = Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10;
  } catch {
    // freemem may not be supported on all environments
  }

  const cpus = os.cpus() || [];
  const cpuCores = cpus.length;
  const platform = os.platform();
  const arch = os.arch();
  const isAppleSilicon = platform === 'darwin' && arch === 'arm64';

  return {
    os: platform,
    arch,
    totalMemoryGb,
    availableMemoryGb,
    cpuCores,
    isAppleSilicon,
    hasGpu: isAppleSilicon, // Apple Silicon provides unified memory GPU
    gpuName: isAppleSilicon ? 'Apple Silicon Metal (Unified Memory)' : undefined,
  };
}

export function recommendProfile(hw?: HardwareInfo): HardwareRecommendation {
  const info = hw || detectHardware();

  if (info.totalMemoryGb < 6) {
    return {
      hardware: info,
      recommendedProfile: 'minimal',
      recommendedModels: ['qwen2.5:0.5b', 'qwen2.5:1.5b', 'llama3.2:1b'],
      rationale:
        'System has under 6 GB RAM. Low-resource 0.5B-1.5B quantized models on CPU ensure smooth, non-blocking operation.',
    };
  }

  if (info.totalMemoryGb < 14) {
    return {
      hardware: info,
      recommendedProfile: 'balanced',
      recommendedModels: ['qwen2.5:1.5b', 'llama3.2:3b', 'qwen2.5:3b'],
      rationale:
        'System has 8-12 GB RAM. 1.5B-3B models provide fast semantic reasoning with moderate memory footprint.',
    };
  }

  return {
    hardware: info,
    recommendedProfile: info.isAppleSilicon || info.hasGpu ? 'quality' : 'balanced',
    recommendedModels: ['llama3.2:3b', 'qwen2.5:3b', 'qwen2.5:7b'],
    rationale:
      'System has 16+ GB RAM. 3B-7B models provide deep reasoning capabilities with high quality outputs.',
  };
}
