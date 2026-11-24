"use client";

import { useActionState } from "react";
import { Field, inputClass, Notice, SubmitButton } from "./form";

type CodeState = { error: string | null };

export function CodeForm({
  action,
  label,
}: {
  action: (previous: CodeState, formData: FormData) => Promise<CodeState>;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field htmlFor="code" label="Code from your authenticator app">
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          required
          className={inputClass}
        />
      </Field>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending}>{label}</SubmitButton>
    </form>
  );
}
