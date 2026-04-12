export default function DeletePostModal({
  deleteTargetPostId,
  deleteLoadingId,
  onClose,
  onDelete,
}) {
  // don't render anything if no post selected
  if (!deleteTargetPostId) return null;

  return (
    <div
      style={{
        // full screen dark overlay
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
          maxWidth: "340px",
          background: "#0d0d12",
          border: "1px solid #25252d",
          borderRadius: "20px",
          padding: "18px",
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        }}
      >
        {/* title */}
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "16px",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          delete post?
        </h3>

        {/* warning text */}
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            color: "#a8a8a8",
            lineHeight: "1.5",
          }}
        >
          this cannot be undone.
        </p>

        {/* action buttons */}
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {/* cancel button */}
          <button
            type="button"
            onClick={onClose}
            disabled={!!deleteLoadingId}
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

          {/* delete button */}
          <button
            type="button"
            onClick={onDelete}
            disabled={!!deleteLoadingId}
            style={{
              border: "none",
              background: "#f2c7c7",
              color: "#241313",
              borderRadius: "999px",
              padding: "9px 14px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {deleteLoadingId ? "deleting..." : "delete"}
          </button>
        </div>
      </div>
    </div>
  );
}