//#region src/invariant.ts
const PACKAGE_NAME = "dsh-skill-manager";
const name = "dsh-skill-manager-invariant";
const inject = ["invariants"];
/** No runtime invariant: the bundle owns a user-facing filesystem catalog and generic RPC. */
const install = () => {};
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));

//#endregion
export { apply, inject, name };