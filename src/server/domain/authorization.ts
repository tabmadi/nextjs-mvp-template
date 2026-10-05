export type Role = "owner" | "admin" | "member";

export type Actor = { userId: string; organizationId: string; role: Role };

export type Action = "note:read" | "note:create" | "organization:manage";

export type Resource = { organizationId: string };

const permissions: Record<Action, readonly Role[]> = {
  "note:read": ["owner", "admin", "member"],
  "note:create": ["owner", "admin", "member"],
  "organization:manage": ["owner", "admin"],
};

export class ForbiddenError extends Error {
  constructor(action: Action) {
    super(`The actor is not allowed to ${action}.`);
    this.name = "ForbiddenError";
  }
}

export function allowed(actor: Actor, action: Action, resource: Resource): boolean {
  return (
    actor.organizationId === resource.organizationId && permissions[action].includes(actor.role)
  );
}
