export function buildIdentity(base: string, env?: Record<string, string | undefined>): {
  version: string; kind: string; sourceCommit: string | null;
};
export const identityFor: (root: string, env?: Record<string, string | undefined>) => ReturnType<typeof buildIdentity>;
export function contentId(inventory: unknown, template: string, identity: ReturnType<typeof buildIdentity>): string;
