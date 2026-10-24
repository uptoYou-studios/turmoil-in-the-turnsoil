import { useState } from "react";
import { siteContent } from "@/content";
import SiteLayout, { Newsletter, useStoredSiteAsset } from "@/components/SiteLayout";

export default function Episodes() {
  return (
    <SiteLayout>
      <section aria-labelledby="episodes-heading">
        <h2 id="episodes-heading">Episodes</h2>
        <ol className="episode-list">
          {siteContent.episodes.map((episode) => (
            <EpisodeItem key={episode.number} episode={episode} />
          ))}
        </ol>
        <Newsletter id="episodes" />
      </section>
    </SiteLayout>
  );
}

function EpisodeItem({ episode }: { episode: (typeof siteContent.episodes)[number] }) {
  const asset = useStoredSiteAsset(episode.fileName);
  const [showMissingMessage, setShowMissingMessage] = useState(false);
  const missingMessageId = `episode-${episode.number}-missing-message`;

  return (
    <li>
      {asset?.url ? (
        <a href={asset.url} target="_blank" rel="noopener noreferrer">
          Episode {episode.number}
        </a>
      ) : (
        <>
          <button
            type="button"
            className="text-link"
            aria-expanded={showMissingMessage}
            aria-controls={missingMessageId}
            onClick={() => setShowMissingMessage(true)}
          >
            Episode {episode.number}
          </button>
          {showMissingMessage && (
            <span id={missingMessageId} role="status">: {episode.missingMessage}</span>
          )}
        </>
      )}
    </li>
  );
}
