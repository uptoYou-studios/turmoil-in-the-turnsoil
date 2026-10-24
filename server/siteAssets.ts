import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createSiteAsset,
  listAllSiteAssets,
  listPublishedSiteAssets,
  setSiteAssetPublished,
} from "./db";
import { storagePut } from "./storage";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";

const MAX_UPLOAD_BYTES = 35 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4;
const categories = ["images", "logos", "audio", "video", "episodes", "fonts"] as const;

const extensions: Record<(typeof categories)[number], Record<string, string>> = {
  images: { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" },
  logos: { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" },
  audio: { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", ogg: "audio/ogg" },
  video: { mp4: "video/mp4", webm: "video/webm" },
  episodes: { pdf: "application/pdf" },
  fonts: { ttf: "font/ttf", otf: "font/otf", woff: "font/woff", woff2: "font/woff2" },
};

export function cleanFilename(raw: string) {
  const basename = raw.split(/[\\/]/).pop() ?? "";
  return basename
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]/g, "_")
    .trim()
    .slice(0, 180) || "upload";
}

export function hasExpectedSignature(bytes: Buffer, category: (typeof categories)[number], mimeType: string) {
  if (category === "images" || category === "logos") {
    if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === "image/gif") return bytes.subarray(0, 3).toString("ascii") === "GIF";
    if (mimeType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (category === "episodes") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  if (category === "fonts") {
    const signature = bytes.subarray(0, 4).toString("ascii");
    if (mimeType === "font/otf") return signature === "OTTO";
    if (mimeType === "font/ttf") return signature === "\u0000\u0001\u0000\u0000" || signature === "true";
    if (mimeType === "font/woff") return signature === "wOFF";
    if (mimeType === "font/woff2") return signature === "wOF2";
  }
  if (category === "audio") {
    if (mimeType === "audio/wav") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WAVE";
    if (mimeType === "audio/mp4") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
    if (mimeType === "audio/ogg") return bytes.subarray(0, 4).toString("ascii") === "OggS";
    if (mimeType === "audio/mpeg") return bytes.subarray(0, 3).toString("ascii") === "ID3" || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0);
  }
  if (category === "video") {
    if (mimeType === "video/mp4") return bytes.subarray(4, 8).toString("ascii") === "ftyp";
    if (mimeType === "video/webm") return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  return false;
}

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const siteAssetsRouter = router({
  publicList: publicProcedure.query(async () => {
    const assets = await listPublishedSiteAssets();
    return assets.map((asset) => ({
      filename: asset.filename,
      category: asset.category,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      url: `/manus-storage/${asset.fileKey}`,
    }));
  }),

  admin: router({
    list: adminProcedure.query(async () => listAllSiteAssets()),

    upload: adminProcedure
      .input(z.object({
        filename: z.string().min(1).max(255),
        category: z.enum(categories),
        mimeType: z.string().max(100).optional(),
        dataBase64: z.string().min(1).max(MAX_BASE64_LENGTH),
      }))
      .mutation(async ({ ctx, input }) => {
        const filename = cleanFilename(input.filename);
        const extension = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";
        const expectedType = extensions[input.category][extension];
        if (!expectedType) badRequest(`Unsupported file extension for ${input.category}.`);

        const mimeType = input.mimeType && input.mimeType !== "application/octet-stream" ? input.mimeType : expectedType;
        if (mimeType !== expectedType) badRequest("The file type does not match its extension.");

        const data = Buffer.from(input.dataBase64, "base64");
        if (!data.length || data.length > MAX_UPLOAD_BYTES) badRequest("File is empty or exceeds the 35 MB upload limit.");
        if (!hasExpectedSignature(data, input.category, mimeType)) badRequest("The file contents do not match the selected file type.");

        const keyPrefix = `site-assets/${ctx.user.id}/${crypto.randomUUID()}`;
        const { key } = await storagePut(`${keyPrefix}/${filename}`, data, mimeType);
        await createSiteAsset({
          fileKey: key,
          filename,
          category: input.category,
          mimeType,
          sizeBytes: data.length,
          isPublished: false,
          uploadedBy: ctx.user.id,
        });
        return { filename, category: input.category, sizeBytes: data.length };
      }),

    setPublished: adminProcedure
      .input(z.object({ id: z.number().int().positive(), isPublished: z.boolean() }))
      .mutation(async ({ input }) => {
        await setSiteAssetPublished(input.id, input.isPublished);
        return { success: true };
      }),
  }),
});
