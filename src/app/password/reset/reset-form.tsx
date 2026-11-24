"use client";

import { useActionState } from "react";
import { Field, inputClass, Notice, SubmitButton } from "@/components/form";
import { type ResetState, resetAction } from "../actions";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetAction, {
    error: null,
  });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field htmlFor="password" label="New password">
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </Field>
      <Field htmlFor="confirm" label="Type it again">
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
        />
      </Field>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending}>Set the password</SubmitButton>
    </form>
  );
}
