import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { TextDecoder } from 'node:util'
import { parseSkillMarkdown } from '../shared/validation.ts'
import type { SkillManagerEntry, SkillManagerSnapshot } from '../shared/types.ts'
import { disabledDirectory } from './disabled.ts'

interface RootSpec { readonly path: string; readonly source: string; readonly rank: number; readonly skipSystem?: boolean }
export interface DiscoverOptions { readonly workspacePath?: string; readonly dshHome: string; readonly agentsHome: string }
const ROOT_FLAT_ENTRY = 'SKILL.md'

/** Find the nearest ancestor containing `.git`, falling back to workspacePath. */
export async function resolveProjectRoot(workspacePath: string): Promise<string> {
  let current = resolve(workspacePath)
  try {
    if (!(await stat(current)).isDirectory()) current = dirname(current)
  } catch { /* workspace path may be created after selection; ancestor walk still applies */ }
  while (true) {
    try {
      if ((await stat(join(current, '.git'))).isDirectory() || (await stat(join(current, '.git'))).isFile()) return current
    } catch { /* absent marker */ }
    const parent = dirname(current)
    if (parent === current) return resolve(workspacePath)
    current = parent
  }
}

/** Discover active and disabled local skills from the four shipped roots. */
export async function discoverSkills(options: DiscoverOptions): Promise<SkillManagerSnapshot> {
  const projectRoot = options.workspacePath === undefined ? undefined : await resolveProjectRoot(options.workspacePath)
  const roots: RootSpec[] = [
    ...(projectRoot === undefined ? [] : [
      { path: join(projectRoot, '.dsh', 'skills'), source: 'project-dsh', rank: 100 },
      { path: join(projectRoot, '.agents', 'skills'), source: 'project-agents', rank: 200 },
    ]),
    { path: join(resolve(options.dshHome), 'skills'), source: 'global-dsh', rank: 400, skipSystem: true },
    { path: join(resolve(options.agentsHome), 'skills'), source: 'global-agents', rank: 500 },
  ]
  const entries: SkillManagerEntry[] = []
  for (const root of roots) await scanRoot(root, entries)
  const winners = new Map<string, SkillManagerEntry>()
  for (const entry of [...entries].sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path) || a.entryId.localeCompare(b.entryId))) {
    if (!entry.active || !entry.valid || winners.has(entry.name)) continue
    winners.set(entry.name, entry)
  }
  const normalized = entries.map(entry => ({
    ...entry,
    shadowed: entry.active && entry.valid && winners.get(entry.name)?.entryId !== entry.entryId,
  }))
  normalized.sort((a, b) => a.rank - b.rank || a.entryId.localeCompare(b.entryId))
  return { ...(projectRoot === undefined ? {} : { projectRoot }), entries: normalized }
}

async function scanRoot(root: RootSpec, output: SkillManagerEntry[]): Promise<void> {
  const active = await listRoot(root.path, root.skipSystem)
  const disabledRoot = await disabledDirectory(root.path, { onUnsafe: 'ignore' })
  const disabled = disabledRoot === undefined ? [] : await listRoot(disabledRoot, root.skipSystem)
  for (const item of active) await inspectItem(root, item, true, output)
  for (const item of disabled) {
    const legacyRootFlat = item.storageName === ROOT_FLAT_ENTRY && item.path === join(root.path, '.disabled', ROOT_FLAT_ENTRY)
    await inspectItem(root, item, legacyRootFlat, output, legacyRootFlat)
  }
}

interface RootItem { readonly storageName: string; readonly path: string; readonly label: string; readonly kind: 'directory' | 'file' }

async function listRoot(path: string, skipSystem: boolean | undefined): Promise<RootItem[]> {
  try {
    const names = await readdir(path, { withFileTypes: true })
    const items: RootItem[] = []
    for (const name of names) {
      if (name.name === '.disabled' || (skipSystem === true && name.name === '.system')) continue
      let kind: 'directory' | 'file' | undefined
      try {
        const target = await stat(join(path, name.name))
        kind = target.isDirectory() ? 'directory' : target.isFile() ? 'file' : undefined
      } catch (error) {
        const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
        if (code !== 'ENOENT' && code !== 'ENOTDIR' && code !== 'ELOOP') throw error
      }
      if (kind === 'directory') items.push({ storageName: name.name, path: join(path, name.name), label: name.name, kind })
      else if (kind === 'file' && name.name.endsWith('.md')) items.push({ storageName: name.name, path: join(path, name.name), label: name.name, kind })
    }
    return items
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
    if (code === 'ENOENT' || code === 'ENOTDIR') return []
    throw error
  }
}

async function inspectItem(root: RootSpec, item: RootItem, active: boolean, output: SkillManagerEntry[], legacyRootFlat = false): Promise<void> {
  const skillPath = item.kind === 'file' ? item.path : join(item.path, 'SKILL.md')
  let parsed: ReturnType<typeof parseSkillMarkdown> | undefined
  let diagnostic: string | undefined
  try {
    parsed = parseSkillMarkdown(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(skillPath)))
  } catch (error) {
    diagnostic = error instanceof Error ? error.message : 'SKILL.md could not be parsed'
  }
  const entryId = `${root.source}:${legacyRootFlat ? 'legacy-active' : active ? 'active' : 'disabled'}:${item.storageName}`
  output.push({
    entryId,
    name: parsed?.name ?? item.label.replace(/\.md$/, ''),
    ...(parsed === undefined ? {} : { description: parsed.description }),
    source: root.source,
    root: root.path,
    storageName: item.storageName,
    path: skillPath,
    rank: root.rank,
    active,
    valid: parsed !== undefined,
    ...(diagnostic === undefined ? {} : { diagnostic }),
  })
}
