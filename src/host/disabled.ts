import { lstat, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

interface DisabledDirectoryOptions {
  readonly create?: boolean
  readonly onUnsafe?: 'throw' | 'ignore'
}

/** Resolve the reserved disabled directory without following a symlink. */
export async function disabledDirectory(root: string, options: DisabledDirectoryOptions = {}): Promise<string | undefined> {
  const path = join(root, '.disabled')
  const onUnsafe = options.onUnsafe ?? 'throw'
  let state = await readDisabledDirectory(path, onUnsafe)
  if (state !== undefined || options.create !== true) return state
  try {
    await mkdir(path, { mode: 0o700 })
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
    if (code !== 'EEXIST') throw error
  }
  state = await readDisabledDirectory(path, onUnsafe)
  if (state === undefined) throw new Error(`reserved .disabled directory is unavailable: ${path}`)
  return state
}

async function readDisabledDirectory(path: string, onUnsafe: 'throw' | 'ignore'): Promise<string | undefined> {
  let entry
  try {
    entry = await lstat(path)
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
    if (code === 'ENOENT' || code === 'ENOTDIR') return undefined
    throw error
  }
  if (entry.isDirectory() && !entry.isSymbolicLink()) return path
  if (onUnsafe === 'ignore') return undefined
  throw new Error(`unsafe reserved .disabled directory: ${path}`)
}
