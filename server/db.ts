import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertSiteAsset, InsertUser, siteAssets, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createSiteAsset(asset: InsertSiteAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(siteAssets).values(asset);
}

export async function listPublishedSiteAssets() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select({
      id: siteAssets.id,
      filename: siteAssets.filename,
      category: siteAssets.category,
      mimeType: siteAssets.mimeType,
      sizeBytes: siteAssets.sizeBytes,
      fileKey: siteAssets.fileKey,
    })
    .from(siteAssets)
    .where(eq(siteAssets.isPublished, true))
    .orderBy(desc(siteAssets.id));
}

export async function listAllSiteAssets() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db
    .select()
    .from(siteAssets)
    .orderBy(desc(siteAssets.id));
}

export async function isPublishedSiteAssetKey(fileKey: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ isPublished: siteAssets.isPublished })
    .from(siteAssets)
    .where(eq(siteAssets.fileKey, fileKey))
    .limit(1);
  return rows[0]?.isPublished === true;
}

export async function setSiteAssetPublished(id: number, isPublished: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(siteAssets).set({ isPublished }).where(eq(siteAssets.id, id));
}
