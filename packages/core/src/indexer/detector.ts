import fs from 'fs';
import path from 'path';

export interface ProjectInfo {
  name: string;
  rootPath: string;
  language: string;
  framework: string | null;
  packageManager: string | null;
  description: string | null;
}

export function detectProject(rootPath: string): ProjectInfo {
  const pkgPath = path.join(rootPath, 'package.json');
  let name = path.basename(rootPath);
  let description = null;
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      name = pkg.name || name;
      description = pkg.description || null;
    } catch (e) {
      // Ignore parse errors
    }
  }

  return {
    name,
    rootPath,
    language: fs.existsSync(path.join(rootPath, 'tsconfig.json')) ? 'typescript' : 'javascript',
    framework: detectFramework(rootPath),
    packageManager: detectPackageManager(rootPath),
    description
  };
}

export function detectFramework(rootPath: string): string | null {
  const pkgPath = path.join(rootPath, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['next']) return 'Next.js';
      if (deps['express']) return 'Express';
      if (deps['react']) return 'React';
      if (deps['vue']) return 'Vue';
      if (deps['@angular/core']) return 'Angular';
    } catch (e) {}
  }
  return null;
}

export function detectPackageManager(rootPath: string): string | null {
  if (fs.existsSync(path.join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(rootPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(rootPath, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(rootPath, 'bun.lockb'))) return 'bun';
  return null;
}

export function readDependencies(rootPath: string): Array<{name: string; version: string; isDev: boolean; isPeer: boolean}> {
  const pkgPath = path.join(rootPath, 'package.json');
  const deps: Array<{name: string; version: string; isDev: boolean; isPeer: boolean}> = [];
  
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
          deps.push({ name, version: String(version), isDev: false, isPeer: false });
        }
      }
      if (pkg.devDependencies) {
        for (const [name, version] of Object.entries(pkg.devDependencies)) {
          deps.push({ name, version: String(version), isDev: true, isPeer: false });
        }
      }
      if (pkg.peerDependencies) {
        for (const [name, version] of Object.entries(pkg.peerDependencies)) {
          deps.push({ name, version: String(version), isDev: false, isPeer: true });
        }
      }
    } catch (e) {}
  }
  return deps;
}
