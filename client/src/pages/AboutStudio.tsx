import { siteContent } from "@/content";
import SiteLayout, { Asset } from "@/components/SiteLayout";

export default function AboutStudio() {
  return (
    <SiteLayout>
      <section aria-labelledby="about-studio-heading">
        <h2>About Pages</h2>
        <h3 id="about-studio-heading">About uptoYou Studios</h3>
        <Asset asset={siteContent.assets.logoStudio} alt="uptoYou Studios logo" className="studio-logo" />
        <p>{siteContent.aboutStudio}</p>
      </section>
    </SiteLayout>
  );
}
