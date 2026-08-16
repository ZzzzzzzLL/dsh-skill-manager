/** Browser Settings contribution for the standalone Web skill manager bundle. */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { SkillManagerSection, type SkillManagerInjected } from './SkillManagerSection.tsx'
import { createSkillManagerApi } from './api.ts'
import { en, zh, type SkillManagerLocaleKey } from './locales.ts'

const STYLE = `.dsh-skill-manager-section{display:flex;flex-direction:column;gap:12px;width:100%;max-width:760px;color:var(--dsw-alias-label-primary)}
.dsh-skill-manager-heading{margin:0;font-size:18px;line-height:24px;font-weight:600}
.dsh-skill-manager-intro{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-tabs{display:flex;align-items:flex-end;gap:22px;border-bottom:1px solid var(--dsw-alias-border-l2);margin-top:2px}
.dsh-skill-manager-tab{position:relative;border:0;padding:7px 1px 9px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:13px;line-height:20px;cursor:pointer}
.dsh-skill-manager-tab:hover,.dsh-skill-manager-tab[data-active=true]{color:var(--dsw-alias-label-primary)}
.dsh-skill-manager-tab[data-active=true]::after{position:absolute;right:0;bottom:-1px;left:0;height:2px;border-radius:2px 2px 0 0;background:var(--dsw-alias-label-primary);content:''}
.dsh-skill-manager-filters{display:flex;align-items:flex-end;gap:8px;min-width:0}
.dsh-skill-manager-field{display:flex;flex:0 1 190px;min-width:120px;flex-direction:column;gap:5px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-field select{box-sizing:border-box;width:100%;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);padding:0 10px;font:inherit;font-size:13px}
.dsh-skill-manager-search{box-sizing:border-box;display:flex;flex:1 1 180px;min-width:120px;height:36px;align-items:center;gap:7px;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;padding:0 12px;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-1)}
.dsh-skill-manager-search:focus-within{border-color:var(--dsw-alias-border-l3);box-shadow:0 0 0 2px var(--dsw-alias-interactive-bg-hover)}
.dsh-skill-manager-search input{min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-skill-manager-search input::placeholder{color:var(--dsw-alias-label-placeholder)}
.dsh-skill-manager-actions{display:flex;flex:none;gap:6px}
.dsh-skill-manager-refresh,.dsh-skill-manager-upload,.dsh-skill-manager-toggle{box-sizing:border-box;display:inline-flex;height:36px;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l2);border-radius:18px;padding:0 14px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;white-space:nowrap}
.dsh-skill-manager-refresh:hover:not(:disabled),.dsh-skill-manager-upload:hover:not([aria-disabled=true]),.dsh-skill-manager-toggle:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}
.dsh-skill-manager-refresh:disabled,.dsh-skill-manager-upload[aria-disabled=true],.dsh-skill-manager-toggle:disabled{opacity:.4;cursor:default}
.dsh-skill-manager-upload{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-skill-manager-upload:hover:not([aria-disabled=true]){background:var(--dsw-alias-button-primary-hover)}
.dsh-skill-manager-upload input{position:absolute;width:0;height:0;opacity:0}
.dsh-skill-manager-content{min-width:0;padding-top:2px}
.dsh-skill-manager-status{margin:28px 0 0;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)}
.dsh-skill-manager-emptyState{display:flex;min-height:190px;flex-direction:column;align-items:center;justify-content:center;border-radius:12px;background:var(--dsw-alias-bg-module-platform);padding:28px;text-align:center}
.dsh-skill-manager-emptyIcon{display:grid;width:42px;height:42px;place-items:center;border-radius:50%;margin-bottom:12px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:20px}
.dsh-skill-manager-emptyTitle{font-size:14px;line-height:22px;font-weight:500}
.dsh-skill-manager-emptyHint{max-width:320px;margin:4px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.dsh-skill-manager-list{display:flex;flex-direction:column;gap:10px;list-style:none;padding:0;margin:0}
.dsh-skill-manager-entry{box-sizing:border-box;display:flex;flex-direction:column;gap:9px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:13px 15px;background:var(--dsw-alias-bg-layer-1)}
.dsh-skill-manager-entryTop{display:flex;align-items:center;gap:10px;min-width:0}
.dsh-skill-manager-identity{display:flex;min-width:0;align-items:center;gap:8px}
.dsh-skill-manager-statusDot{flex:none;width:8px;height:8px;border-radius:50%}
.dsh-skill-manager-entryActive{background:var(--dsw-alias-state-success-primary)}
.dsh-skill-manager-entryDisabled{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l3);background:transparent}
.dsh-skill-manager-entryName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px;line-height:22px;font-weight:500}
.dsh-skill-manager-tags{display:flex;min-width:0;align-items:center;gap:5px;overflow:hidden}
.dsh-skill-manager-tag{flex:none;border:1px solid var(--dsw-alias-border-l3);border-radius:5px;padding:1px 6px;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px}
.dsh-skill-manager-warningTag{color:var(--dsw-alias-state-warn-label)}
.dsh-skill-manager-toggle{flex:none;height:28px;margin-left:auto;padding:0 10px;border-radius:14px;font-size:12px;line-height:18px}
.dsh-skill-manager-toggleEnable{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-skill-manager-entryDescription{display:-webkit-box;overflow:hidden;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:19px;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.dsh-skill-manager-entryMeta{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;line-height:17px}
.dsh-skill-manager-tab:focus-visible,.dsh-skill-manager-refresh:focus-visible,.dsh-skill-manager-upload:focus-within,.dsh-skill-manager-toggle:focus-visible,.dsh-skill-manager-field select:focus-visible{outline:none;box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}
@media (max-width:680px){.dsh-skill-manager-filters{flex-wrap:wrap}.dsh-skill-manager-field{flex-basis:100%}.dsh-skill-manager-search{order:2;flex-basis:100%}.dsh-skill-manager-actions{margin-left:auto}.dsh-skill-manager-tags{display:none}}`

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { skillManager: SkillManagerLocaleKey }
}

export const NS = 'skillManager'
export const inject = ['slots', 'locale', 'connection']

/** Register the localized Skills Settings section and its lazy generic RPC face. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-skill-manager: dictionaries')
  ctx.effect(() => {
    if (typeof document === 'undefined') return () => {}
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-skill-manager'
    tag.textContent = STYLE
    document.head.appendChild(tag)
    return () => { tag.remove() }
  }, 'dsh-skill-manager: styles')
  const t = ctx.locale.bind(NS)
  const manager = createSkillManagerApi(ctx.get('connection') as ConnectionHandle)
  const managerInjected: SkillManagerInjected = {
    ...manager,
  }
  const injected = (): { manager: SkillManagerInjected } => ({ manager: managerInjected })
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'skills', order: 30, label: () => t('nav'), locale: NS, inject: injected,
  }, SkillManagerSection))
}
