import { siteContent } from "@/content";
import SiteLayout, { Asset } from "@/components/SiteLayout";

export default function Characters() {
  return (
    <SiteLayout>
      <section aria-labelledby="characters-heading">
        <h2 id="characters-heading">Characters</h2>
        {siteContent.characters.map((character) => (
          <article className="character-entry" key={character.name}>
            <p><b>{character.name}:</b> {character.description}</p>
            <Asset asset={character.image} alt={`${character.name} character art`} className="character-image" />
          </article>
        ))}
      </section>
    </SiteLayout>
  );
}
