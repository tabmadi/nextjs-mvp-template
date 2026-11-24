import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";
import { GET, POST } from "@/app/api/v1/notes/route";
import { getDb } from "@/server/db/client";
import {
  authenticateApiCredential,
  createApiCredential,
  listApiCredentials,
  revokeApiCredential,
  runIdempotent,
} from "@/server/services/api-credentials";
import { registerActor, resetDatabase } from "../helpers";

beforeEach(resetDatabase);

async function credential() {
  const owner = await registerActor("owner@example.com");
  const created = await createApiCredential(owner, "CI");
  if (!created.ok) throw new Error(created.error);
  return { owner, secret: created.secret };
}

function request(method: string, secret: string | null, body?: unknown, key?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  if (key) headers.set("idempotency-key", key);
  return new Request("http://localhost/api/v1/notes", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("API credentials", () => {
  test("ACC-020 the database holds no secret of a credential", async () => {
    const { owner, secret } = await credential();
    const rows = await getDb().execute(sql`SELECT * FROM api_credentials`);
    expect(JSON.stringify(rows.rows).includes(secret)).toBe(false);
    expect((await listApiCredentials(owner))[0]?.displayPrefix).toBe(secret.slice(0, 10));
  });

  test("API-001 a credential acts as a member of its organization", async () => {
    const { owner, secret } = await credential();
    const actor = await authenticateApiCredential(secret);
    expect(actor).toMatchObject({ organizationId: owner.organizationId, role: "member" });
  });

  test("API-002 a revoked credential and a missing credential get 401", async () => {
    const { owner, secret } = await credential();
    const [row] = await listApiCredentials(owner);
    expect(await revokeApiCredential(owner, String(row?.id))).toBe(true);
    expect((await GET(request("GET", secret))).status).toBe(401);
    const missing = await GET(request("GET", null));
    expect(missing.status).toBe(401);
    expect(await missing.json()).toMatchObject({ error: { code: "unauthenticated" } });
  });
});

describe("the notes API", () => {
  test("API-003 a POST creates a note, and a GET lists it", async () => {
    const { secret } = await credential();
    const created = await POST(request("POST", secret, { title: "First", body: "Text" }));
    expect(created.status).toBe(201);
    const listed = await (await GET(request("GET", secret))).json();
    expect(listed.data.map((note: { title: string }) => note.title)).toEqual(["First"]);
  });

  test("API-004 a retry with the same Idempotency-Key and body returns the first response", async () => {
    const { secret } = await credential();
    const first = await POST(request("POST", secret, { title: "Once", body: "Text" }, "key-1"));
    const again = await POST(request("POST", secret, { title: "Once", body: "Text" }, "key-1"));
    expect(again.status).toBe(201);
    expect(await again.json()).toEqual(await first.json());
    const count = await getDb().execute(sql`SELECT count(*)::int AS n FROM notes`);
    expect(count.rows).toEqual([{ n: 1 }]);
  });

  test("API-005 an Idempotency-Key with another body gets 422", async () => {
    const { secret } = await credential();
    await POST(request("POST", secret, { title: "One", body: "Text" }, "key-2"));
    const other = await POST(request("POST", secret, { title: "Two", body: "Text" }, "key-2"));
    expect(other.status).toBe(422);
    expect(await other.json()).toMatchObject({ error: { code: "idempotency_key_reused" } });
  });

  test("API-006 a retry while the first request runs gets 409", async () => {
    const { owner } = await credential();
    let finish: () => void = () => undefined;
    const running = runIdempotent(owner.organizationId, "key-3", "{}", async () => {
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return { status: 201, body: {} };
    });
    const retry = await runIdempotent(owner.organizationId, "key-3", "{}", async () => ({
      status: 201,
      body: {},
    }));
    expect(retry.status).toBe(409);
    finish();
    await running;
  });

  test("API-007 a server error is not stored, so a retry runs again", async () => {
    const { owner } = await credential();
    const failed = await runIdempotent(owner.organizationId, "key-4", "{}", async () => ({
      status: 503,
      body: {},
    }));
    expect(failed.status).toBe(503);
    const retry = await runIdempotent(owner.organizationId, "key-4", "{}", async () => ({
      status: 201,
      body: { ok: true },
    }));
    expect(retry).toEqual({ status: 201, body: { ok: true } });
  });
});
