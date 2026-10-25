import { siteContent } from "@/content";
import SiteLayout, { Asset, Newsletter, useStoredSiteAsset } from "@/components/SiteLayout";

export default function Home() {
  const audio = useStoredSiteAsset("trailer.mp3");
  const video = useStoredSiteAsset("trailer.mp4");

  return (
    <SiteLayout>
      <section aria-labelledby="home-heading">
        <h2 id="home-heading">Home</h2>
        <div className="home-intro">
          <p>{siteContent.home.introStart}</p>
          <div style={{ textAlign: "center", margin: "1.5rem 0" }}>
            <Asset asset={siteContent.home.yanagiSketch} alt="Cute sketch of Yanagi" className="inline-art" />
          </div>
          <p>{siteContent.home.introMiddle}:</p>
          <div style={{ textAlign: "center", margin: "1.5rem 0" }}>
            <Asset asset={siteContent.home.firebeetSketch} alt="Cute sketch of Firebeet" className="inline-art firebeet-art" />
          </div>
        </div>
        <blockquote>{siteContent.home.verse}</blockquote>
        <div className="trailer-block">
          <h3>Trailer:</h3>
          <video controls preload="metadata" src={`${import.meta.env.BASE_URL}site-assets/trailer.mp4`} className="trailer-video" style={{ maxWidth: "100%", height: "auto" }}>
              Your browser does not support the video element.
            </video>
        </div>
        <Newsletter id="home" />
      </section>
    </SiteLayout>
  );
}
