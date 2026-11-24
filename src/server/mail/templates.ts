import type { Mail } from "./send";

export function resetPasswordMail(to: string, url: string): Mail {
  return {
    to,
    subject: "Reset your password",
    text: `Someone asked to reset the password of this account.\n\nOpen this link within 30 minutes to set a new password:\n${url}\n\nIf you did not ask, ignore this mail. Your password stays the same.\n`,
  };
}

export function passwordChangedMail(to: string): Mail {
  return {
    to,
    subject: "Your password changed",
    text: "The password of this account changed, and every session ended.\n\nIf you did not change it, reset it now and contact support.\n",
  };
}
