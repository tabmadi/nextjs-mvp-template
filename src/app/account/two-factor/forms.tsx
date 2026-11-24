"use client";

import { useActionState } from "react";
import { CodeForm } from "@/components/code-form";
import { Field, inputClass, Notice, SubmitButton } from "@/components/form";
import { confirmAction, disableAction, type EnrolState, startAction } from "./actions";

function PasswordField() {
  return (
    <Field htmlFor="password" label="Your password">
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className={inputClass}
      />
    </Field>
  );
}

const initial: EnrolState = { error: null };

export function EnrolForm() {
  const [state, formAction, pending] = useActionState(startAction, initial);
  if (!state.enrolment) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <PasswordField />
        {state.error ? <Notice tone="error">{state.error}</Notice> : null}
        <SubmitButton pending={pending}>Continue</SubmitButton>
      </form>
    );
  }
  return (
    <>
      <ol className="flex flex-col gap-2 text-sm">
        <li>1. Open an authenticator app.</li>
        <li>2. Scan this code with the app.</li>
      </ol>
      <div
        className="w-56 rounded-md border border-zinc-300 bg-white p-3"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: the SVG comes from the qrcode library, not from input.
        dangerouslySetInnerHTML={{ __html: state.enrolment.qrSvg }}
      />
      <p className="text-sm">
        If you cannot scan it, type this key into the app:
        <span className="mt-1 block font-mono select-all">{state.enrolment.manualKey}</span>
      </p>
      <p className="text-sm">3. Enter the code that the app shows.</p>
      <CodeForm action={confirmAction} label="Turn on the second factor" />
    </>
  );
}

export function DisableForm() {
  const [state, formAction, pending] = useActionState(disableAction, { error: null });
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PasswordField />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <SubmitButton pending={pending}>Turn off the second factor</SubmitButton>
    </form>
  );
}
