import { CodeForm } from "@/components/code-form";
import { Page } from "@/components/form";
import { verifyAction } from "./actions";

export default function VerifyPage() {
  return (
    <Page title="Enter your code">
      <CodeForm action={verifyAction} label="Sign in" />
      <a href="/login" className="text-sm underline">
        Start again
      </a>
    </Page>
  );
}
