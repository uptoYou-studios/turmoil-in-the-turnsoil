import editableContent from "./site-content.json";

export type ImageAsset = { filename: string; url: string | null };
export type FontAsset = ImageAsset & { format: "opentype" | "truetype" | "woff" | "woff2" };
export type Episode = {
  number: string;
  fileName: string;
  missingMessage: string;
};
export type Character = {
  name: string;
  description: string;
  image: ImageAsset;
};

export type SiteContent = {
  title: string;
  studioName: string;
  navigation: Array<{ label: string; href: string }>;
  assets: {
    logoVertical: ImageAsset;
    logoStudio: ImageAsset;
    fonts: { title: FontAsset; body: FontAsset; emphasis: FontAsset };
  };
  home: {
    introStart: string;
    introMiddle: string;
    yanagiSketch: ImageAsset;
    firebeetSketch: ImageAsset;
    verse: string;
    trailer: { audioFileName: string; videoFileName: string };
  };
  newsletter: { heading: string; prompt: string };
  episodes: Episode[];
  devos: Episode[];
  characters: Character[];
  aboutTurmoil: string;
  aboutStudio: string;
};

export const siteContent = editableContent as SiteContent;
