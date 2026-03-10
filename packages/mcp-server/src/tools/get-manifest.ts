import fs from 'node:fs';
import path from 'node:path';
import { slugify } from '../lib/slugify.js';
import type { LoomContext } from '../types.js';

interface GetManifestInput {
  name?: string;
}

interface ManifestListItem {
  name: string;
  slug: string;
  created_at: string;
  path: string;
}

interface GetManifestResult {
  manifests?: ManifestListItem[];
  name?: string;
  slug?: string;
  content?: string;
  launch_command?: string;
  error?: string;
}

export async function handleGetManifest(
  ctx: LoomContext,
  input: GetManifestInput
): Promise<GetManifestResult> {
  if (!input.name) {
    return listManifests(ctx);
  }
  return getManifest(ctx, input.name);
}

function listManifests(ctx: LoomContext): GetManifestResult {
  if (!fs.existsSync(ctx.manifestsDir)) {
    return { manifests: [] };
  }

  const files = fs.readdirSync(ctx.manifestsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  const manifests: ManifestListItem[] = files.map(filename => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(ctx.manifestsDir, filename);
    const content = fs.readFileSync(filePath, 'utf-8');

    const nameMatch = content.match(/^# Manifest: (.+)$/m);
    const name = nameMatch ? nameMatch[1] : slug;

    const dateMatch = content.match(/Generated: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
    const created_at = dateMatch ? dateMatch[1] : '';

    return {
      name,
      slug,
      created_at,
      path: path.join('docs', 'loom', 'manifests', filename),
    };
  });

  return { manifests };
}

function getManifest(ctx: LoomContext, name: string): GetManifestResult {
  const slug = slugify(name);
  const filename = `${slug}.md`;
  const filePath = path.join(ctx.manifestsDir, filename);

  if (!fs.existsSync(filePath)) {
    return { error: `Manifest "${name}" not found at ${filename}` };
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  const nameMatch = content.match(/^# Manifest: (.+)$/m);
  const manifestName = nameMatch ? nameMatch[1] : name;

  const launchMatch = content.match(/```bash\n(.+)\n```/);
  const launch_command = launchMatch ? launchMatch[1] : '';

  return {
    name: manifestName,
    slug,
    content,
    launch_command,
  };
}
