import { Page } from "@/components/form";
import { ForgotForm } from "./forgot-form";

export default function ForgotPage() {
  return (
    <Page title="Reset your password">
      <ForgotForm />
      <a href="/login" className="text-sm underline">
        Back to sign-in
      </a>
    </Page>
  );
}
