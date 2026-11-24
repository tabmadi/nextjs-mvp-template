import { requireActor } from "@/auth";
import { Notice, Page } from "@/components/form";
import { allowed } from "@/server/domain/authorization";
import { listApiCredentials } from "@/server/services/api-credentials";
import { revokeAction } from "./actions";
import { CreateForm } from "./create-form";

export default async function ApiCredentialsPage() {
  const actor = await requireActor();
  if (!allowed(actor, "organization:manage", { organizationId: actor.organizationId })) {
    return (
      <Page title="API credentials">
        <Notice tone="info">Only an owner or an admin manages API credentials.</Notice>
      </Page>
    );
  }
  const credentials = await listApiCredentials(actor);
  return (
    <Page title="API credentials">
      <CreateForm />
      <ul className="flex flex-col gap-3 text-sm">
        {credentials.map((credential) => (
          <li key={credential.id} className="flex items-center justify-between gap-4">
            <span>
              {credential.name} <span className="font-mono">{credential.displayPrefix}</span>
              {credential.revokedAt ? " (revoked)" : null}
            </span>
            {credential.revokedAt ? null : (
              <form action={revokeAction}>
                <input type="hidden" name="id" value={credential.id} />
                <button type="submit" className="underline">
                  Revoke
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <a href="/notes" className="text-sm underline">
        Back
      </a>
    </Page>
  );
}
