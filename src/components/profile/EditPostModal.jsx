import { FiX } from "react-icons/fi";

export default function EditPostModal({
  editingPostId,
  editingText,
  setEditingText,
  editLoadingId,
  onClose,
  onSave,
}) {
  // don't show modal if nothing is being edited
  if (!editingPostId) return null;

  return (
    <div
      style={{
        // full screen overlay
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          // modal card
          width: "100%",
          maxWidth: "360px",
          background: "#0d0d12",
          border: "1px solid #25252d",
          borderRadius: "20px",
          padding: "18px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        {/* top header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "14px",
          }}
        >
          {/* modal title */}
          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            edit post
          </h3>

          {/* close button */}
          <button
            type="button"
            onClick={onClose}
            disabled={!!editLoadingId}
            style={{
              border: "none",
              background: "transparent",
              color: "#b8b8b8",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* explanation text */}
        <p
          style={{
            margin: "0 0 10px 0",
            fontSize: "12px",
            color: "#9d9d9d",
            lineHeight: "1.5",
          }}
        >
          this shows underneath your tweet as:
          <br />
          (edit: your text here)
        </p>

        {/* edit textarea */}
        <textarea
          value={editingText}
          maxLength={160}
          onChange={(e) => setEditingText(e.target.value)}
          placeholder="write your edit note"
          rows={4}
          style={{
            width: "100%",
            resize: "none",
            borderRadius: "14px",
            border: "1px solid #2c2c35",
            background: "#15151d",
            color: "#fff",
            padding: "12px",
            fontSize: "14px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* bottom buttons */}
        <div
          style={{
            marginTop: "14px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {/* cancel button */}
          <button
            type="button"
            onClick={onClose}
            disabled={!!editLoadingId}
            style={{
              border: "1px solid #2d2d36",
              background: "transparent",
              color: "#d2d2d2",
              borderRadius: "999px",
              padding: "9px 14px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            cancel
          </button>

          {/* save button */}
          <button
            type="button"
            onClick={onSave}
            disabled={!!editLoadingId}
            style={{
              border: "none",
              background: "#f1f1f1",
              color: "#111",
              borderRadius: "999px",
              padding: "9px 14px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {editLoadingId ? "saving..." : "save"}
          </button>
        </div>
      </div>
    </div>
  );
}