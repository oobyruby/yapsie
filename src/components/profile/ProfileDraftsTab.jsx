import { FiMapPin } from "react-icons/fi";
import { formatDraftTime } from "../../utils/profileFormatters";

export default function ProfileDraftsTab({
  drafts,
  isPosting,
  onUseDraft,
  onPostDraft,
  onDeleteDraft,
}) {
  // show empty state if no drafts
  if (!drafts.length) {
    return (
      <div className="empty-feed">
        <p>no drafts yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
      }}
    >
      {/* loop through drafts */}
      {drafts.map((draft) => (
        <article
          key={draft.id}
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "16px",
            padding: "14px",
          }}
        >
          {/* saved time */}
          <div
            style={{
              color: "#a8a8a8",
              fontSize: "12px",
              marginBottom: "8px",
            }}
          >
            saved {formatDraftTime(draft.updatedAt)}
          </div>

          {/* optional location */}
          {draft.locationLabel ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "#d7d7d7",
                marginBottom: "8px",
              }}
            >
              <FiMapPin size={12} />
              <span>{draft.locationLabel}</span>
            </div>
          ) : null}

          {/* draft text */}
          <p
            style={{
              margin: 0,
              color: "#fff",
              fontSize: "14px",
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {draft.text}
          </p>

          {/* action buttons */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginTop: "12px",
            }}
          >
            {/* load draft back into composer */}
            <button
              type="button"
              onClick={() => onUseDraft(draft)}
              style={{
                height: "30px",
                borderRadius: "999px",
                padding: "0 12px",
                border: "none",
                background: "#2f3036",
                color: "#f0f0f0",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              use draft
            </button>

            {/* post draft immediately */}
            <button
              type="button"
              onClick={() => onPostDraft(draft)}
              disabled={isPosting}
              style={{
                height: "30px",
                borderRadius: "999px",
                padding: "0 12px",
                border: "none",
                background: "#9c9ca0",
                color: "#111",
                cursor: "pointer",
                fontSize: "12px",
                opacity: isPosting ? 0.6 : 1,
              }}
            >
              {isPosting ? "posting..." : "post now"}
            </button>

            {/* delete draft */}
            <button
              type="button"
              onClick={() => onDeleteDraft(draft.id)}
              style={{
                height: "30px",
                borderRadius: "999px",
                padding: "0 12px",
                border: "none",
                background: "#2a2325",
                color: "#f3c4cb",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}