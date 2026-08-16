/** Wire-safe types shared by the Host catalog and browser Settings section. */

import type { RpcResult } from '@deepseek-ai/dsh-host-apiproxy/api'

export type SkillManagerScope = 'project' | 'global'

export interface SkillManagerEntry {
  readonly entryId: string
  readonly name: string
  readonly description?: string
  readonly source: string
  readonly root: string
  readonly path: string
  readonly storageName: string
  readonly rank: number
  readonly active: boolean
  readonly valid: boolean
  readonly diagnostic?: string
  readonly shadowed?: boolean
}

export interface SkillManagerSnapshot {
  readonly workspaceId?: string
  readonly projectRoot?: string
  readonly entries: readonly SkillManagerEntry[]
}

export interface SkillManagerListRequest { readonly workspaceId?: string }
export interface SkillManagerToggleRequest {
  readonly workspaceId?: string
  readonly entryId: string
  readonly enabled: boolean
}
export interface SkillManagerUploadRequest {
  readonly workspaceId?: string
  readonly scope: SkillManagerScope
  readonly filename: string
  readonly contentBase64: string
}

export type SkillManagerWireResult<T> = RpcResult<T>
