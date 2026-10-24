import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const siteAssets = mysqlTable("siteAssets", {
  id: int("id").autoincrement().primaryKey(),
  fileKey: varchar("fileKey", { length: 255 }).notNull().unique(),
  filename: varchar("filename", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["images", "logos", "audio", "video", "episodes", "fonts"]).notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  isPublished: boolean("isPublished").default(false).notNull(),
  uploadedBy: int("uploadedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SiteAsset = typeof siteAssets.$inferSelect;
export type InsertSiteAsset = typeof siteAssets.$inferInsert;
