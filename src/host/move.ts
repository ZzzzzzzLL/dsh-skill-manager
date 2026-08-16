import { link, lstat, readlink, rename, stat, symlink, unlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

/**
 * Move one filesystem entry without replacing an existing non-directory target.
 * Relative symlink targets are rebased so the moved link keeps the same referent.
 * @param from - Existing source entry in the managed root.
 * @param to - Destination path on the same filesystem.
 * @returns A promise that resolves after the source has been unlinked.
 */
export async function moveEntryNoClobber(from: string, to: string): Promise<void> {
  const source = await lstat(from)
  if (source.isDirectory() && !source.isSymbolicLink()) {
    // Directory rename remains the provider-compatible operation. The caller
    // rejects a destination observed before this call; an external process can
    // still create an empty destination directory between those operations.
    await rename(from, to)
    return
  }
  if (source.isSymbolicLink()) {
    const target = await readlink(from)
    const adjustedTarget = isAbsolute(target)
      ? target
      : relative(dirname(to), resolve(dirname(from), target)) || '.'
    let type: 'dir' | 'file' | undefined
    try { type = (await stat(from)).isDirectory() ? 'dir' : 'file' } catch { /* preserve broken-link targets with the platform default */ }
    await symlink(adjustedTarget, to, type)
  } else {
    await link(from, to)
  }
  try {
    await unlink(from)
  } catch (error) {
    // Keep the destination: removing it by path could delete a different
    // entry installed by another process after the exclusive create.
    throw error
  }
}
