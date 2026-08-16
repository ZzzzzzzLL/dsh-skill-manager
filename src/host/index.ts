import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { SkillProvider } from '@deepseek-ai/dsh-skill'
import type { WorkspaceId } from '@deepseek-ai/dsh-workspace'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { discoverSkills } from './catalog.ts'
import { resolveProjectRoot } from './catalog.ts'
import { relocateLegacyRootFlatSkill, relocateSkill } from './relocation.ts'
import { installUpload } from './upload.ts'
import type {
  SkillManagerListRequest, SkillManagerSnapshot, SkillManagerToggleRequest, SkillManagerUploadRequest,
  SkillManagerWireResult,
} from '../shared/types.ts'

export interface Config {
  readonly dshHome?: string
  readonly agentsHome?: string
  readonly maxCompressedUploadBytes?: number
  readonly maxArchiveEntries?: number
  readonly maxExtractedBytes?: number
}

export const Config = z.object({
  dshHome: z.string(),
  agentsHome: z.string(),
  maxCompressedUploadBytes: z.natural().min(1).default(5 * 1024 * 1024),
  maxArchiveEntries: z.natural().min(1).default(256),
  maxExtractedBytes: z.natural().min(1).default(20 * 1024 * 1024),
})

const CHANNEL = '/skill-manager'
const brandWorkspaceId = (value: string): WorkspaceId => value as WorkspaceId
const errorResult = (_code: string, message: string): SkillManagerWireResult<never> => ({ ok: false, error: { code: 'internal', message, details: {} } })
type HostConnectionRpc = {
  handle: (channel: string, handler: (endpoint: string, payload: unknown) => Promise<SkillManagerWireResult<unknown>>, options: { authority: 'loopback' }) => unknown
}

export interface SkillManagerHomes { readonly dshHome: string; readonly agentsHome: string }
export function resolveSkillManagerHomes(config: Pick<Config, 'dshHome' | 'agentsHome'>, env: Record<string, string | undefined> = process.env): SkillManagerHomes {
  return {
    dshHome: resolveDshHome(config.dshHome, env),
    agentsHome: resolve(config.agentsHome ?? env.DSH_AGENTS_HOME ?? join(homedir(), '.agents')),
  }
}

/** Host plugin for local skill catalog management over a loopback RPC channel. */
export function apply(ctx: Context, config: Config = {}): void {
  const { dshHome, agentsHome } = resolveSkillManagerHomes(config)
  const limits = {
    maxCompressedBytes: config.maxCompressedUploadBytes ?? 5 * 1024 * 1024,
    maxEntries: config.maxArchiveEntries ?? 256,
    maxExtractedBytes: config.maxExtractedBytes ?? 20 * 1024 * 1024,
  }
  let invalidateProvider: (() => void) | undefined
  ctx.skills.registerProvider((control): SkillProvider => {
    invalidateProvider = control.invalidate
    return {
      name: 'dsh-skill-manager',
      list: async () => [],
      get: async () => undefined,
    }
  })
  const invalidateSkills = (): void => { invalidateProvider?.() }
  ctx.inject(['connection'], connectionCtx => {
    const typedContext = connectionCtx as Context & { readonly connection: { readonly rpc: HostConnectionRpc } }
    const rpc = typedContext.connection.rpc
    rpc.handle(CHANNEL, async (endpoint, payload) => {
      try {
        if (endpoint === 'list') return await list(ctx, payload, dshHome, agentsHome)
        if (endpoint === 'toggle') return await toggle(ctx, payload, dshHome, agentsHome, invalidateSkills)
        if (endpoint === 'upload') return await upload(ctx, payload, dshHome, agentsHome, limits, invalidateSkills)
        return errorResult('NOT_FOUND', 'unknown skill-manager endpoint')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'skill manager request failed'
        return errorResult('INVALID_REQUEST', message)
      }
    }, { authority: 'loopback' })
  })
}

async function list(ctx: Context, payload: unknown, dshHome: string, agentsHome: string): Promise<SkillManagerWireResult<SkillManagerSnapshot>> {
  const request = parseList(payload)
  const workspace = request.workspaceId === undefined ? undefined : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId))
  if (request.workspaceId !== undefined && workspace === undefined) return errorResult('WORKSPACE_NOT_FOUND', 'workspace was not found')
  const snapshot = await discoverSkills(workspace === undefined
    ? { dshHome, agentsHome }
    : { workspacePath: workspace.path, dshHome, agentsHome })
  return { ok: true, value: { ...snapshot, ...(workspace === undefined ? {} : { workspaceId: workspace.id }) } }
}

async function toggle(ctx: Context, payload: unknown, dshHome: string, agentsHome: string, invalidateSkills: () => void): Promise<SkillManagerWireResult<SkillManagerSnapshot>> {
  const request = parseToggle(payload)
  const workspace = request.workspaceId === undefined ? undefined : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId))
  if (request.workspaceId !== undefined && workspace === undefined) return errorResult('WORKSPACE_NOT_FOUND', 'workspace was not found')
  const snapshot = await discoverSkills(workspace === undefined
    ? { dshHome, agentsHome }
    : { workspacePath: workspace.path, dshHome, agentsHome })
  const entry = snapshot.entries.find(candidate => candidate.entryId === request.entryId)
  if (entry === undefined) return errorResult('ENTRY_NOT_FOUND', 'skill entry was not found in a fresh snapshot')
  if (entry.source.startsWith('project-') && workspace === undefined) return errorResult('WORKSPACE_REQUIRED', 'project workspace is required for toggle')
  if (entry.active === request.enabled) return await list(ctx, request.workspaceId === undefined ? {} : { workspaceId: workspace!.id }, dshHome, agentsHome)
  if (!request.enabled && entry.path === join(entry.root, '.disabled', 'SKILL.md')) {
    await relocateLegacyRootFlatSkill(entry.root)
  } else {
    await relocateSkill(entry.root, entry.storageName, !request.enabled)
  }
  invalidateSkills()
  return await list(ctx, request.workspaceId === undefined ? {} : { workspaceId: workspace!.id }, dshHome, agentsHome)
}

async function upload(ctx: Context, payload: unknown, dshHome: string, agentsHome: string, limits: { maxCompressedBytes: number; maxEntries: number; maxExtractedBytes: number }, invalidateSkills: () => void): Promise<SkillManagerWireResult<SkillManagerSnapshot>> {
  const request = parseUpload(payload)
  const workspace = request.workspaceId === undefined ? undefined : ctx.workspaceRegistry.get(brandWorkspaceId(request.workspaceId))
  if (request.scope === 'project' && workspace === undefined) return errorResult('WORKSPACE_REQUIRED', 'project workspace is required for upload')
  const root = request.scope === 'project'
    ? join(await resolveProjectRoot(workspace!.path), '.dsh', 'skills')
    : join(dshHome, 'skills')
  await installUpload(root, request.filename, request.contentBase64, limits, { skipSystem: request.scope === 'global' })
  invalidateSkills()
  return await list(ctx, request.workspaceId === undefined ? {} : { workspaceId: workspace!.id }, dshHome, agentsHome)
}

function parseList(value: unknown): SkillManagerListRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('payload must be an object')
  const workspaceId = (value as Record<string, unknown>).workspaceId
  if (workspaceId !== undefined && typeof workspaceId !== 'string') throw new Error('workspaceId must be a string')
  return workspaceId === undefined ? {} : { workspaceId }
}

function parseToggle(value: unknown): SkillManagerToggleRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('payload must be an object')
  const record = value as Record<string, unknown>
  if (typeof record.entryId !== 'string' || typeof record.enabled !== 'boolean') throw new Error('toggle payload is invalid')
  if (record.workspaceId !== undefined && typeof record.workspaceId !== 'string') throw new Error('workspaceId must be a string')
  return { entryId: record.entryId, enabled: record.enabled, ...(record.workspaceId === undefined ? {} : { workspaceId: record.workspaceId }) }
}

function parseUpload(value: unknown): SkillManagerUploadRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('payload must be an object')
  const record = value as Record<string, unknown>
  if ((record.scope !== 'project' && record.scope !== 'global') || typeof record.filename !== 'string' || typeof record.contentBase64 !== 'string') throw new Error('upload payload is invalid')
  if (record.workspaceId !== undefined && typeof record.workspaceId !== 'string') throw new Error('workspaceId must be a string')
  return {
    scope: record.scope,
    filename: record.filename,
    contentBase64: record.contentBase64,
    ...(record.workspaceId === undefined ? {} : { workspaceId: record.workspaceId }),
  }
}
