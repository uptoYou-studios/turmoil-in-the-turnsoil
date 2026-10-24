import { siteContent } from "@/content";
import SiteLayout from "@/components/SiteLayout";

export default function AboutTurmoil() {
  return (
    <SiteLayout>
      <section aria-labelledby="about-turmoil-heading">
        <h2>About Pages</h2>
        <h3 id="about-turmoil-heading">About Turmoil in the Turnsoil</h3>
        <p>{siteContent.aboutTurmoil}</p>
      </section>
    </SiteLayout>
  );
}
