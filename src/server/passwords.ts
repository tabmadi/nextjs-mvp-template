import "server-only";

import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 hashes with Argon2id by default and returns a PHC string, per ADR-0304.
// Registration and the sign-in of Better Auth both use these two functions.
const argon2Options = { memoryCost: 65_536, timeCost: 3, parallelism: 1, outputLen: 32 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, argon2Options);
}

export function verifyPassword({
  hash: phc,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  return verify(phc, password);
}
