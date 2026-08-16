import { chmod, lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  decodeCanonicalBase64, decodeUtf8, parseArchiveSkill, parseSkillMarkdown, validateUploadArchive,
  validateZipPath, type UploadLimits,
} from '../shared/validation.ts'
import { enqueueMutation } from './mutation-queue.ts'
import { disabledDirectory } from './disabled.ts'
import { moveEntryNoClobber } from './move.ts'

/** Install one validated Markdown or ZIP upload into a shipped local root. */
export async function installUpload(
  root: string,
  filename: string,
  contentBase64: string,
  limits: UploadLimits,
  options: { readonly skipSystem?: boolean } = {},
): Promise<{ name: string }> {
  return enqueueMutation(root, () => performUpload(root, filename, contentBase64, limits, options.skipSystem === true))
}

async function performUpload(
  root: string,
  filename: string,
  contentBase64: string,
  limits: UploadLimits,
  skipSystem: boolean,
): Promise<{ name: string }> {
  const maxBase64Length = Math.ceil(limits.maxCompressedBytes / 3) * 4
  if (contentBase64.length > maxBase64Length) throw new Error('compressed upload exceeds limit')
  const bytes = decodeCanonicalBase64(contentBase64)
  if (bytes.byteLength > limits.maxCompressedBytes) throw new Error('compressed upload exceeds limit')
  const lower = filename.toLowerCase()
  const isZip = lower.endsWith('.zip')
  if (!isZip && !lower.endsWith('.md')) throw new Error('upload must be .md or .zip')
  await mkdir(root, { recursive: true, mode: 0o700 })
  const stageParent = dirname(root)
  await mkdir(stageParent, { recursive: true, mode: 0o700 })
  const stage = await mkdtemp(join(stageParent, `.dsh-skill-manager-${randomBytes(8).toString('hex')}-`), { encoding: 'utf8' })
  try {
    await chmod(stage, 0o700)
    let name: string
    let destination: string
    if (isZip) {
      const files = validateUploadArchive(bytes, limits)
      const parsed = parseArchiveSkill(files)
      name = parsed.name
      destination = join(root, name)
      await assertNoConflict(root, name, skipSystem)
      const skillRoot = join(stage, name)
      await extractArchive(files, skillRoot)
      await rename(skillRoot, destination)
    } else {
      const parsed = parseSkillMarkdown(decodeUtf8(bytes))
      name = parsed.name
      destination = join(root, `${name}.md`)
      await assertNoConflict(root, name, skipSystem)
      await writeFile(join(stage, `${name}.md`), bytes, { mode: 0o600 })
      await moveEntryNoClobber(join(stage, `${name}.md`), destination)
    }
    return { name }
  } finally {
    await rm(stage, { recursive: true, force: true })
  }
}

async function assertNoConflict(root: string, name: string, skipSystem: boolean): Promise<void> {
  const disabledRoot = await disabledDirectory(root)
  const candidates = [join(root, name), join(root, `${name}.md`), ...(disabledRoot === undefined ? [] : [join(disabledRoot, name), join(disabledRoot, `${name}.md`)])]
  for (const path of candidates) {
    try { await lstat(path); throw new Error(`skill name conflicts with existing entry: ${name}`) } catch (error) {
      if (error instanceof Error && !('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) throw error
    }
  }
  for (const area of [root, ...(disabledRoot === undefined ? [] : [disabledRoot])]) {
    let names: import('node:fs').Dirent[]
    try { names = await readdir(area, { withFileTypes: true }) } catch (error) {
      const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
      if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') continue
      throw error
    }
    for (const item of names) {
      if (item.name === '.disabled' || (skipSystem && item.name === '.system')) continue
      const path = join(area, item.name)
      let target
      try { target = await stat(path) } catch (error) {
        const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
        if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') continue
        throw error
      }
      if (!target.isDirectory() && (!target.isFile() || !item.name.endsWith('.md'))) continue
      const markdown = target.isFile() ? path : join(path, 'SKILL.md')
      let content: Buffer
      try { content = await readFile(markdown) } catch (error) {
        const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
        if (code === 'ENOENT' || code === 'ENOTDIR' || code === 'ELOOP') continue
        throw error
      }
      let parsed
      try { parsed = parseSkillMarkdown(decodeUtf8(content)) } catch { continue }
      if (parsed.name === name) throw new Error(`skill name conflicts with existing entry: ${name}`)
    }
  }
}

async function extractArchive(files: Record<string, Uint8Array>, target: string): Promise<void> {
  await mkdir(target, { recursive: true, mode: 0o700 })
  const skillPath = Object.keys(files).find(path => path === 'SKILL.md' || path.endsWith('/SKILL.md'))
  if (skillPath === undefined) throw new Error('archive must contain SKILL.md')
  const prefix = skillPath === 'SKILL.md' ? '' : skillPath.slice(0, -'SKILL.md'.length)
  for (const [path, bytes] of Object.entries(files)) {
    if (path.endsWith('/')) continue
    const relative = prefix !== '' && path.startsWith(prefix) ? path.slice(prefix.length) : path
    if (relative === '') throw new Error('archive contains invalid path')
    validateZipPath(relative)
    const destination = join(target, relative)
    const parent = join(destination, '..')
    await mkdir(parent, { recursive: true, mode: 0o700 })
    await writeFile(destination, bytes, { mode: 0o600 })
  }
}
