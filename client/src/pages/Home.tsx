import { siteContent } from "@/content";
import SiteLayout, { Asset, Newsletter, useStoredSiteAsset } from "@/components/SiteLayout";

export default function Home() {
  const audio = useStoredSiteAsset("trailer.mp3");
  const video = useStoredSiteAsset("trailer.mp4");

  return (
    <SiteLayout>
      <section aria-labelledby="home-heading">
        <h2 id="home-heading">Home</h2>
        <p className="home-intro">
          {siteContent.home.introStart}{" "}
          <Asset asset={siteContent.home.yanagiSketch} alt="Cute sketch of Yanagi" className="inline-art" />
          {siteContent.home.introMiddle}{" "}
          <Asset asset={siteContent.home.firebeetSketch} alt="Cute sketch of Firebeet" className="inline-art" />.
        </p>
        <blockquote>{siteContent.home.verse}</blockquote>
        <div className="trailer-block">
          <h3>Trailer:</h3>
          {video ? (
            <video controls preload="metadata" src={video.url} className="trailer-video">
              Your browser does not support the video element.
            </video>
          ) : audio ? (
            <audio controls preload="metadata" src={audio.url}>
              Your browser does not support the audio element.
            </audio>
          ) : (
            <p><span className="asset-placeholder">[ {"trailer.mp3"} or {"trailer.mp4"} ]</span></p>
          )}
        </div>
        <Newsletter id="home" />
      </section>
    </SiteLayout>
  );
}
