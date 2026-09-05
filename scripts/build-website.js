import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('=== CentR Website Build & Verification Gate ===\n');

// 1. Build Docs HTML
console.log('1. Building docs HTML pages...');
execSync('node scripts/build-docs-html.js', { stdio: 'inherit' });

const WEBSITE_DIR = path.resolve('website');
const DOCS_DIR = path.resolve('website/docs');

// 2. Verify Essential Files
console.log('\n2. Verifying website directory structure and SEO assets...');
const essentialFiles = [
  'website/index.html',
  'website/robots.txt',
  'website/sitemap.xml',
  'website/styles/main.css',
  'website/scripts/main.js',
  'website/assets/logo.svg',
  'website/assets/logo-dark.svg',
  'website/assets/logo-light.svg',
  'website/assets/icon.svg',
  'website/assets/favicon.svg',
  'website/assets/architecture.svg',
  'website/assets/centr-overview.svg',
  'website/assets/social-preview.svg',
];

for (const file of essentialFiles) {
  if (!fs.existsSync(path.resolve(file))) {
    console.error(`[ERROR] Missing required file: ${file}`);
    process.exit(1);
  }
  console.log(`  ✓ Found: ${file}`);
}

// 3. Audit all HTML files for broken links and invalid image sources
console.log('\n3. Auditing HTML files for broken links, missing assets & anchors...');
const htmlFiles = [
  path.resolve(WEBSITE_DIR, 'index.html'),
  ...fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.endsWith('.html'))
    .map((f) => path.resolve(DOCS_DIR, f)),
];

let totalLinksChecked = 0;
let errors = 0;

for (const htmlPath of htmlFiles) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  const relPath = path.relative(process.cwd(), htmlPath);
  const fileDir = path.dirname(htmlPath);

  // Collect all element IDs for hash anchor verification
  const idMatches = content.matchAll(/id=["']([^"']+)["']/g);
  const existingIds = new Set();
  for (const m of idMatches) {
    existingIds.add(m[1]);
  }

  // Find all src="..." attributes
  const srcMatches = content.matchAll(/src=["']([^"']+)["']/g);
  for (const m of srcMatches) {
    const src = m[1];
    totalLinksChecked++;

    if (src.startsWith('http://') || src.startsWith('https://')) {
      // External URL - ok
      continue;
    }

    const cleanSrc = src.split('?')[0];
    const resolved = path.resolve(fileDir, cleanSrc);
    if (!fs.existsSync(resolved)) {
      console.error(`  ✗ [BROKEN SRC] ${relPath} -> ${src} (resolved: ${resolved})`);
      errors++;
    } else {
      // Verify file is not empty
      const stat = fs.statSync(resolved);
      if (stat.size === 0) {
        console.error(`  ✗ [EMPTY ASSET] ${relPath} -> ${src} is 0 bytes`);
        errors++;
      }
    }
  }

  // Find all href="..." attributes
  const hrefMatches = content.matchAll(/href=["']([^"']+)["']/g);
  for (const m of hrefMatches) {
    const href = m[1];
    totalLinksChecked++;

    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      continue;
    }

    if (href.startsWith('#')) {
      // Internal anchor
      const anchorId = href.slice(1);
      if (!existingIds.has(anchorId)) {
        console.error(`  ✗ [BROKEN ANCHOR] ${relPath} -> ${href} (id '${anchorId}' not found)`);
        errors++;
      }
      continue;
    }

    // Relative link, possibly with query or hash
    const [pathAndQuery, hash] = href.split('#');
    const filePath = pathAndQuery.split('?')[0];
    if (filePath) {
      const resolved = path.resolve(fileDir, filePath);
      if (!fs.existsSync(resolved)) {
        console.error(`  ✗ [BROKEN LINK] ${relPath} -> ${href} (resolved: ${resolved})`);
        errors++;
      } else if (hash) {
        const targetContent = fs.readFileSync(resolved, 'utf8');
        const targetIdPattern = new RegExp(`id=["']${hash}["']`);
        if (!targetIdPattern.test(targetContent)) {
          console.error(
            `  ✗ [BROKEN TARGET ANCHOR] ${relPath} -> ${href} (hash '${hash}' not in ${filePath})`,
          );
          errors++;
        }
      }
    }
  }
}

console.log(`\nAudited ${htmlFiles.length} HTML files across ${totalLinksChecked} references.`);

if (errors > 0) {
  console.error(`\n[FAILED] Found ${errors} broken link or asset reference errors.`);
  process.exit(1);
}

console.log('\n✓ All HTML files, assets, internal links, and anchor tags verified successfully!');
console.log('CentR website build ready for GitHub Pages deployment.');
