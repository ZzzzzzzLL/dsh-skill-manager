import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SkillManagerEntry, SkillManagerSnapshot } from '../shared/types.ts'
import type { SkillManagerLocaleKey } from './locales.ts'

const css = {
  section: 'dsh-skill-manager-section', heading: 'dsh-skill-manager-heading', intro: 'dsh-skill-manager-intro', tabs: 'dsh-skill-manager-tabs', tab: 'dsh-skill-manager-tab', filters: 'dsh-skill-manager-filters', field: 'dsh-skill-manager-field', search: 'dsh-skill-manager-search', actions: 'dsh-skill-manager-actions', refresh: 'dsh-skill-manager-refresh', upload: 'dsh-skill-manager-upload', content: 'dsh-skill-manager-content', status: 'dsh-skill-manager-status', emptyState: 'dsh-skill-manager-emptyState', emptyIcon: 'dsh-skill-manager-emptyIcon', emptyTitle: 'dsh-skill-manager-emptyTitle', emptyHint: 'dsh-skill-manager-emptyHint', list: 'dsh-skill-manager-list', entry: 'dsh-skill-manager-entry', entryTop: 'dsh-skill-manager-entryTop', identity: 'dsh-skill-manager-identity', statusDot: 'dsh-skill-manager-statusDot', entryActive: 'dsh-skill-manager-entryActive', entryDisabled: 'dsh-skill-manager-entryDisabled', entryName: 'dsh-skill-manager-entryName', tags: 'dsh-skill-manager-tags', tag: 'dsh-skill-manager-tag', warningTag: 'dsh-skill-manager-warningTag', entryDescription: 'dsh-skill-manager-entryDescription', entryMeta: 'dsh-skill-manager-entryMeta', toggle: 'dsh-skill-manager-toggle', toggleEnable: 'dsh-skill-manager-toggleEnable',
} as const

export interface SkillManagerInjected {
  readonly list: (workspaceId?: string) => Promise<SkillManagerSnapshot>
  readonly toggle: (workspaceId: string | undefined, entryId: string, enabled: boolean) => Promise<SkillManagerSnapshot>
  readonly upload: (workspaceId: string | undefined, scope: 'project' | 'global', filename: string, contentBase64: string) => Promise<SkillManagerSnapshot>
}
export type SkillManagerSectionProps = PropsRuntime<'settings.section'> & PropsLocale<'skillManager'> & { readonly manager: SkillManagerInjected }

/** Settings section for local project/global skill discovery and reversible management. */
export function SkillManagerSection({ t, manager, useWorkspaces }: SkillManagerSectionProps): ReactNode {
  const frameworkWorkspaces = useWorkspaces(state => state.items)
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined)
  const [scope, setScope] = useState<'project' | 'global'>('project')
  const [snapshot, setSnapshot] = useState<SkillManagerSnapshot | undefined>()
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const generation = useRef(0)

  useEffect(() => {
    if (frameworkWorkspaces.every(item => item.workspaceId !== workspaceId)) setWorkspaceId(frameworkWorkspaces[0]?.workspaceId)
  }, [frameworkWorkspaces, workspaceId])

  const load = useCallback(async (): Promise<void> => {
    const current = ++generation.current
    setError(false)
    try {
      const next = await manager.list(scope === 'project' ? workspaceId : undefined)
      if (current === generation.current) setSnapshot(next)
    } catch { if (current === generation.current) setError(true) }
  }, [manager, scope, workspaceId])
  useEffect(() => { void load() }, [load])
  const entries = useMemo(() => (snapshot?.entries ?? [])
    .filter(entry => scope === 'project' ? entry.source.startsWith('project-') : entry.source.startsWith('global-'))
    .filter(entry => [entry.name, entry.description, entry.source, entry.path, entry.diagnostic].filter(Boolean).join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, scope, snapshot])

  const upload = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (file === undefined) return
    const current = ++generation.current
    setBusy(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      const next = await manager.upload(scope === 'project' ? workspaceId : undefined, scope, file.name, btoa(binary))
      if (current === generation.current) { setSnapshot(next); setError(false) }
    } catch { if (current === generation.current) setError(true) } finally {
      setBusy(false)
      event.target.value = ''
    }
  }
  const toggle = async (item: SkillManagerEntry): Promise<void> => {
    if (scope === 'project' && workspaceId === undefined) return
    const current = ++generation.current
    setBusy(true)
    try {
      const next = await manager.toggle(scope === 'project' ? workspaceId : undefined, item.entryId, !item.active)
      if (current === generation.current) setSnapshot(next)
    } catch { if (current === generation.current) setError(true) } finally {
      setBusy(false)
    }
  }
  const projectWithoutWorkspace = scope === 'project' && workspaceId === undefined
  return <section className={css.section} aria-busy={busy ? 'true' : undefined}>
    <h2 className={css.heading}>{t('nav')}</h2>
    <p className={css.intro}>{t('intro')}</p>
    <div className={css.tabs} role="tablist" aria-label={t('nav')}>
      <button type="button" className={css.tab} role="tab" aria-selected={scope === 'project'} data-active={scope === 'project' ? 'true' : undefined} onClick={() => setScope('project')}>{t('project')}</button>
      <button type="button" className={css.tab} role="tab" aria-selected={scope === 'global'} data-active={scope === 'global' ? 'true' : undefined} onClick={() => setScope('global')}>{t('global')}</button>
    </div>
    <div className={css.filters}>
      {scope === 'project' ? <label className={css.field}><span>{t('workspace')}</span><select aria-label={t('workspace')} value={workspaceId ?? ''} onChange={event => setWorkspaceId(event.target.value || undefined)}>{frameworkWorkspaces.map(item => <option key={item.workspaceId} value={item.workspaceId}>{item.title}</option>)}</select></label> : null}
      <label className={css.search}>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5"/><path d="m10.25 10.25 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input type="search" aria-label={t('search')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)} />
      </label>
      <div className={css.actions}>
        <button className={css.refresh} type="button" disabled={busy} onClick={() => { void load() }}>{t('refresh')}</button>
        <label className={css.upload} aria-disabled={projectWithoutWorkspace || busy}>{t('upload')}<input type="file" accept=".md,.zip" disabled={projectWithoutWorkspace || busy} onChange={event => { void upload(event) }} /></label>
      </div>
    </div>
    <div className={css.content}>
      {projectWithoutWorkspace ? <p className={css.status} role="status">{t('choose')}</p> : error ? <p className={css.status} role="alert">{t('error')}</p> : snapshot === undefined ? <p className={css.status}>{t('loading')}</p> : entries.length === 0 ? <div className={css.emptyState}><span className={css.emptyIcon} aria-hidden="true">✦</span><strong className={css.emptyTitle}>{t('empty')}</strong><p className={css.emptyHint}>{t('emptyHint')}</p></div> : <ul className={css.list}>{entries.map(item => <Entry key={item.entryId} entry={item} t={t} onToggle={() => toggle(item)} busy={busy} />)}</ul>}
    </div>
  </section>
}

function Entry({ entry, t, onToggle, busy }: { entry: SkillManagerEntry; t: (key: SkillManagerLocaleKey) => string; onToggle: () => Promise<void>; busy: boolean }): ReactNode {
  const summary = entry.valid ? entry.description : entry.diagnostic
  return <li className={css.entry}>
    <div className={css.entryTop}>
      <div className={css.identity}>
        <span className={`${css.statusDot} ${entry.active ? css.entryActive : css.entryDisabled}`} aria-hidden="true" />
        <strong className={css.entryName}>{entry.name}</strong>
      </div>
      <div className={css.tags}>
        <span className={css.tag}>{entry.active ? t('active') : t('disabled')}</span>
        <span className={css.tag}>{entry.source}</span>
        {!entry.valid ? <span className={`${css.tag} ${css.warningTag}`}>{t('invalid')}</span> : null}
        {entry.shadowed ? <span className={`${css.tag} ${css.warningTag}`}>{t('shadowed')}</span> : null}
      </div>
      <button className={`${css.toggle} ${entry.active ? '' : css.toggleEnable}`} type="button" disabled={busy} aria-pressed={entry.active} onClick={() => { void onToggle() }}>{entry.active ? t('disable') : t('enable')}</button>
    </div>
    {summary ? <p className={css.entryDescription} title={summary}>{summary}</p> : null}
    <div className={css.entryMeta} title={entry.path}>{entry.path}</div>
  </li>
}
