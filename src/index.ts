/** Host loader entry for the standalone Web skill manager bundle. */
export { apply, Config } from './host/index.ts'
export const name = 'dsh-skill-manager'
export const inject = ['connection', 'workspaceRegistry', 'skills']
