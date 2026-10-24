import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { cleanFilename, hasExpectedSignature } from "./siteAssets";
import { siteContent } from "../client/src/content";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 27,
    openId: "test-user",
    name: "Test user",
    email: "test@example.com",
    loginMethod: "test",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("site file storage validation", () => {
  it("uses the requested site title casing", () => {
    expect(siteContent.title).toBe("Turmoil in the Turnsoil");
  });

  it("reduces a path to a safe basename", () => {
    expect(cleanFilename("../../private/yanagi art.png")).toBe("yanagi art.png");
    expect(cleanFilename("../../file?.pdf")).toBe("file_.pdf");
  });

  it("checks file signatures against their selected media category", () => {
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const pdf = Buffer.from("%PDF-1.7");
    const fakePdf = Buffer.from("not a pdf");
    expect(hasExpectedSignature(png, "images", "image/png")).toBe(true);
    expect(hasExpectedSignature(pdf, "episodes", "application/pdf")).toBe(true);
    expect(hasExpectedSignature(fakePdf, "episodes", "application/pdf")).toBe(false);
  });

  it("blocks ordinary signed-in users from private upload endpoints", async () => {
    const caller = appRouter.createCaller(makeContext("user"));
    await expect(caller.siteAssets.admin.upload({
      filename: "cover.png",
      category: "images",
      mimeType: "image/png",
      dataBase64: "iVBORw0KGgo=",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps Episodes 0 and 1 configured with their PDF filenames and exact missing-file fallback", () => {
    expect(siteContent.episodes.map((episode) => episode.number)).toEqual(["0", "1"]);
    for (const episode of siteContent.episodes) {
      expect(episode.fileName).toMatch(/\.pdf$/i);
      expect(episode.missingMessage).toBe("We had trouble digging this one up! The creator is busy at work on this episode.");
    }
  });

  it("places Devos after Episodes and gives each devotional a PDF and fallback", () => {
    const labels = siteContent.navigation.map((item) => item.label);
    expect(labels.indexOf("Devos")).toBe(labels.indexOf("Episodes") + 1);
    expect(labels.indexOf("Characters")).toBe(labels.indexOf("Devos") + 1);
    expect(siteContent.devos.map((devo) => devo.number)).toEqual(["0", "1"]);
    expect(siteContent.devos).toHaveLength(siteContent.episodes.length);
    for (const devo of siteContent.devos) {
      expect(devo.fileName).toMatch(/^devo\d+\.pdf$/i);
      expect(devo.missingMessage).toBe("We had trouble digging this one up! The creator is busy at work on this episode.");
    }
  });
});
