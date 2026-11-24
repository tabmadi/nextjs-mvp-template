"use client";

import { useActionState } from "react";
import { Field, inputClass, Notice, SubmitButton } from "@/components/form";
import { type CreateState, createAction } from "./actions";

export function CreateForm() {
  const [state, formAction, pending] = useActionState<CreateState, FormData>(createAction, {
    error: null,
  });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field htmlFor="name" label="Name">
        <input id="name" name="name" required maxLength={60} className={inputClass} />
      </Field>
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      {state.secret ? (
        <p className="text-sm">
          Copy this secret now. It is not shown again.
          <span className="mt-1 block font-mono break-all select-all">{state.secret}</span>
        </p>
      ) : null}
      <SubmitButton pending={pending}>Create a credential</SubmitButton>
    </form>
  );
}
