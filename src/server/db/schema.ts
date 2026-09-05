import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * One table, present so the seam is demonstrated rather than described.
 * Replace it; keep the shape — schema here, queries in a repository, rules in
 * `domain/`.
 */
export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
