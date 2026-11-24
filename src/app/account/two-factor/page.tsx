import { requireActor } from "@/auth";
import { Notice, Page } from "@/components/form";
import { secondFactorEnabled } from "@/server/services/accounts";
import { DisableForm, EnrolForm } from "./forms";

export default async function TwoFactorPage() {
  const actor = await requireActor();
  const enabled = await secondFactorEnabled(actor.userId);
  return (
    <Page title="Second factor">
      {enabled ? (
        <>
          <Notice tone="info">Sign-in asks for a code from your authenticator app.</Notice>
          <DisableForm />
        </>
      ) : (
        <>
          <Notice tone="info">Add a code from an authenticator app to every sign-in.</Notice>
          <EnrolForm />
        </>
      )}
      <a href="/notes" className="text-sm underline">
        Back
      </a>
    </Page>
  );
}
