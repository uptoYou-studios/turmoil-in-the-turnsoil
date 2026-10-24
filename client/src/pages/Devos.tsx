import { useState } from "react";
import { siteContent } from "@/content";
import SiteLayout, { Newsletter, useStoredSiteAsset } from "@/components/SiteLayout";

export default function Devos() {
  return (
    <SiteLayout>
      <section aria-labelledby="devos-heading">
        <h2 id="devos-heading">Devos</h2>
        <ol className="episode-list">
          {siteContent.devos.map((devo) => (
            <DevotionalItem key={devo.number} devo={devo} />
          ))}
        </ol>
        <Newsletter id="devos" />
      </section>
    </SiteLayout>
  );
}

function DevotionalItem({ devo }: { devo: (typeof siteContent.devos)[number] }) {
  const asset = useStoredSiteAsset(devo.fileName);
  const [showMissingMessage, setShowMissingMessage] = useState(false);
  const missingMessageId = `devotional-${devo.number}-missing-message`;

  return (
    <li>
      {asset?.url ? (
        <a href={asset.url} target="_blank" rel="noopener noreferrer">
          Devotional for Episode {devo.number}
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
            Devotional for Episode {devo.number}
          </button>
          {showMissingMessage && (
            <span id={missingMessageId} role="status">: {devo.missingMessage}</span>
          )}
        </>
      )}
    </li>
  );
}
