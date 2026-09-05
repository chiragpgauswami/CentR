import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface IsolatedWorkspace {
  workspaceDir: string;
  cleanup: () => void;
}

export function createIsolatedWorkspace(fixturePath: string): IsolatedWorkspace {
  const runUuid = crypto.randomUUID().slice(0, 8);
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), `centr-bench-run-${runUuid}-`));

  // Copy fixture contents into the isolated working directory
  if (fs.existsSync(fixturePath)) {
    fs.cpSync(fixturePath, workspaceDir, { recursive: true });
  } else {
    // If not found, create minimal project structure
    fs.mkdirSync(path.join(workspaceDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, 'package.json'),
      JSON.stringify({ name: 'bench-workspace', version: '1.0.0', type: 'module' }, null, 2),
      'utf8',
    );
  }

  // Symlink root node_modules so npm test / vitest can execute inside the ephemeral directory
  const rootNodeModules = path.resolve('node_modules');
  const isolatedNodeModules = path.join(workspaceDir, 'node_modules');
  if (fs.existsSync(rootNodeModules) && !fs.existsSync(isolatedNodeModules)) {
    try {
      fs.symlinkSync(rootNodeModules, isolatedNodeModules, 'junction');
    } catch {
      // Ignore symlink errors in restricted environments
    }
  }

  const cleanup = () => {
    try {
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error on exit
    }
  };

  return { workspaceDir, cleanup };
}
