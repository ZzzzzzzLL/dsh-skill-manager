import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SkillManagerEntry, SkillManagerSnapshot, SkillManagerWireResult } from '../shared/types.ts'

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) }
function wireResult(value: unknown): SkillManagerWireResult<unknown> {
  if (!isRecord(value) || typeof value.ok !== 'boolean') throw new Error('skill-manager returned an invalid response')
  if (value.ok) return { ok: true, value: value.value }
  if (!isRecord(value.error) || value.error.code !== 'internal' || typeof value.error.message !== 'string' || !isRecord(value.error.details)) throw new Error('skill-manager returned an invalid error')
  return { ok: false, error: { code: 'internal', message: value.error.message, details: {} } }
}
function entry(value: unknown): SkillManagerEntry {
  if (!isRecord(value) || typeof value.entryId !== 'string' || typeof value.name !== 'string' || typeof value.source !== 'string'
    || typeof value.root !== 'string' || typeof value.storageName !== 'string' || typeof value.path !== 'string'
    || typeof value.rank !== 'number' || typeof value.active !== 'boolean' || typeof value.valid !== 'boolean'
    || (value.description !== undefined && typeof value.description !== 'string')
    || (value.diagnostic !== undefined && typeof value.diagnostic !== 'string')
    || (value.shadowed !== undefined && typeof value.shadowed !== 'boolean')) throw new Error('skill-manager returned an invalid entry')
  return value as unknown as SkillManagerEntry
}
function snapshot(value: unknown): SkillManagerSnapshot {
  if (!isRecord(value) || !Array.isArray(value.entries) || (value.workspaceId !== undefined && typeof value.workspaceId !== 'string')) throw new Error('skill-manager returned an invalid snapshot')
  return { entries: value.entries.map(entry), ...(value.workspaceId === undefined ? {} : { workspaceId: value.workspaceId }), ...(typeof value.projectRoot === 'string' ? { projectRoot: value.projectRoot } : {}) }
}

/** Browser-side validated generic RPC facade. */
export function createSkillManagerApi(connection: ConnectionHandle) {
  const call = async (endpoint: string, payload: unknown): Promise<unknown> => {
    const result = wireResult(await connection.rpc.call('/skill-manager', endpoint, payload))
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }
  return {
    list: async (workspaceId?: string) => snapshot(await call('list', workspaceId === undefined ? {} : { workspaceId })),
    toggle: async (workspaceId: string | undefined, entryId: string, enabled: boolean) => snapshot(await call('toggle', { ...(workspaceId === undefined ? {} : { workspaceId }), entryId, enabled })),
    upload: async (workspaceId: string | undefined, scope: 'project' | 'global', filename: string, contentBase64: string) => snapshot(await call('upload', { ...(workspaceId === undefined ? {} : { workspaceId }), scope, filename, contentBase64 })),
  }
}
