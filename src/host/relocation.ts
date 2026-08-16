import { lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { disabledDirectory } from './disabled.ts'
import { moveEntryNoClobber } from './move.ts'
import { enqueueMutation } from './mutation-queue.ts'

const ROOT_FLAT_ENTRY = 'SKILL.md'
const ROOT_FLAT_DISABLED_ALIAS = '.dsh-skill-manager-root-SKILL.md'

/** Move an rc.6 legacy disabled root-level SKILL.md to the provider-safe alias. */
export function relocateLegacyRootFlatSkill(root: string): Promise<void> {
  return enqueueMutation(root, async () => {
    const disabledRoot = await disabledDirectory(root)
    if (disabledRoot === undefined) throw new Error('legacy disabled skill is no longer present')
    const from = join(disabledRoot, ROOT_FLAT_ENTRY)
    const to = join(disabledRoot, ROOT_FLAT_DISABLED_ALIAS)
    try { await lstat(from) } catch { throw new Error('legacy disabled skill is no longer present') }
    try {
      await lstat(to)
      throw new Error('skill relocation conflicts with an existing entry')
    } catch (error) {
      if (error instanceof Error && !('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) throw error
    }
    await moveEntryNoClobber(from, to)
  })
}

/** Move one entry between a root and its private `.disabled` directory. */
export function relocateSkill(root: string, entry: string, disable: boolean): Promise<void> {
  if (!isSafeStorageName(entry)) throw new Error('invalid skill entry')
  if (disable && entry === ROOT_FLAT_DISABLED_ALIAS) throw new Error('skill entry uses the reserved root-level alias')
  return enqueueMutation(root, async () => {
    const disabledRoot = await disabledDirectory(root, { create: disable })
    if (disabledRoot === undefined) throw new Error(disable ? 'reserved .disabled directory is unavailable' : 'skill entry is no longer present')
    const from = disable
      ? join(root, entry)
      : join(disabledRoot, entry === ROOT_FLAT_DISABLED_ALIAS ? ROOT_FLAT_DISABLED_ALIAS : entry)
    const to = disable
      ? join(disabledRoot, entry === ROOT_FLAT_ENTRY ? ROOT_FLAT_DISABLED_ALIAS : entry)
      : join(root, entry === ROOT_FLAT_DISABLED_ALIAS ? ROOT_FLAT_ENTRY : entry)
    try { await lstat(from) } catch { throw new Error('skill entry is no longer present') }
    try {
      await lstat(to)
      throw new Error('skill relocation conflicts with an existing entry')
    } catch (error) {
      if (error instanceof Error && !('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) throw error
    }
    await moveEntryNoClobber(from, to)
  })
}

function isSafeStorageName(value: string): boolean {
  if (value === '' || value === '.' || value === '..' || value === '.disabled') return false
  return !/[\\/\0]/.test(value)
}
