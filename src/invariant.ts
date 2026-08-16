import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = 'dsh-skill-manager'
export const name = 'dsh-skill-manager-invariant'
export const inject = ['invariants']
/** No runtime invariant: the bundle owns a user-facing filesystem catalog and generic RPC. */
const install: InvariantInstaller = () => {}
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
