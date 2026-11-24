"use client";

import { useActionState } from "react";
import { Field, inputClass, Notice, SubmitButton } from "@/components/form";
import { type ForgotState, forgotAction } from "../actions";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(forgotAction, {
    sent: false,
    error: null,
  });
  if (state.sent) {
    return <Notice tone="info">If an account has this email, a reset link is on its way.</Notice>;
  }
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field htmlFor="email" label="Email">
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className={inputClass}
        />
      </Field>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending}>Send a reset link</SubmitButton>
    </form>
  );
}
