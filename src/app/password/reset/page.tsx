import { Notice, Page } from "@/components/form";
import { ResetForm } from "./reset-form";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <Page title="Set a new password">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <Notice tone="error">This link is not complete. Ask for a new link.</Notice>
      )}
    </Page>
  );
}
