import { useRef } from "react";
import { FiImage, FiMapPin, FiX } from "react-icons/fi";

export default function ProfileComposer({
  postText,
  setPostText,
  selectedImagePreview,
  onImageChange,
  onClearSelectedImage,
  postLocationLabel,
  onClearPostLocation,
  onAddLocation,
  isGettingLocation,
  onSaveDraft,
  onPost,
  isPosting,
  canPost,
}) {
  // hidden file input ref for image upload
  const fileInputRef = useRef(null);

  // open file picker when image button clicked
  const handleChooseImage = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="profile-composer">
      {/* main text input */}
      <input
        type="text"
        className="profile-composer-input"
        placeholder="what's on your mind?"
        value={postText}
        maxLength={280}
        onChange={(e) => setPostText(e.target.value)}
      />

      {/* hidden image input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onImageChange}
        style={{ display: "none" }}
      />

      {/* image preview if one selected */}
      {selectedImagePreview ? (
        <div className="profile-composer-image-preview-wrap">
          <img
            src={selectedImagePreview}
            alt="selected upload preview"
            className="profile-composer-image-preview"
          />

          {/* remove selected image */}
          <button
            type="button"
            className="profile-composer-remove-image"
            onClick={onClearSelectedImage}
            aria-label="remove image"
          >
            <FiX />
          </button>
        </div>
      ) : null}

      {/* location pill */}
      {postLocationLabel ? (
        <div
          style={{
            marginTop: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "999px",
            padding: "7px 10px",
            color: "#e9e9e9",
            fontSize: "12px",
            maxWidth: "100%",
          }}
        >
          <FiMapPin size={13} />

          {/* location text */}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {postLocationLabel}
          </span>

          {/* remove location */}
          <button
            type="button"
            onClick={onClearPostLocation}
            aria-label="remove location"
            style={{
              border: "none",
              background: "transparent",
              color: "#c9c9c9",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <FiX size={12} />
          </button>
        </div>
      ) : null}

      {/* bottom action buttons */}
      <div className="profile-composer-actions">
        {/* add image */}
        <button
          type="button"
          className="profile-small-icon-btn"
          onClick={handleChooseImage}
          aria-label="add image"
        >
          <FiImage />
        </button>

        {/* add location */}
        <button
          type="button"
          className="profile-small-icon-btn"
          onClick={onAddLocation}
          aria-label="add location"
          disabled={isGettingLocation}
          title="add location"
          style={{ opacity: isGettingLocation ? 0.6 : 1 }}
        >
          <FiMapPin />
        </button>

        {/* save draft */}
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!postText.trim()}
          style={{
            height: "30px",
            borderRadius: "999px",
            padding: "0 12px",
            border: "none",
            background: "#2f3036",
            color: "#f0f0f0",
            cursor: "pointer",
            fontSize: "12px",
            opacity: !postText.trim() ? 0.5 : 1,
          }}
        >
          save draft
        </button>

        {/* post button */}
        <button
          type="button"
          className="profile-post-btn"
          onClick={onPost}
          disabled={!canPost || isPosting}
        >
          {isPosting ? "posting..." : "post"}
        </button>
      </div>
    </div>
  );
}