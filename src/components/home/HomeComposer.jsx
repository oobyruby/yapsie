import { useRef } from "react";
import { FiImage, FiMapPin, FiX } from "react-icons/fi";

export default function HomeComposer({
  ownComposerAvatarSrc,
  currentUserProfile,
  composerInitial,
  postText,
  setPostText,
  maxCharacters,
  characterCount,
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
  selectedImage,
}) {
  // ref lets us trigger the hidden file input from the image button
  const fileInputRef = useRef(null);

  const handleChooseImage = () => {
    // open file picker when image button is clicked
    fileInputRef.current?.click();
  };

  return (
    <div className="composer">
      {/* show user's avatar if there is one, otherwise fallback initial */}
      {ownComposerAvatarSrc ? (
        <img
          src={ownComposerAvatarSrc}
          alt={currentUserProfile?.name || currentUserProfile?.username || "user"}
          className="composer-avatar composer-avatar-image"
        />
      ) : (
        <div className="composer-avatar">{composerInitial}</div>
      )}

      <div className="composer-main">
        {/* main post input */}
        <input
          type="text"
          placeholder="what’s happening?"
          value={postText}
          maxLength={maxCharacters}
          onChange={(e) => setPostText(e.target.value)}
          className="composer-input"
        />

        {/* hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onImageChange}
          style={{ display: "none" }}
        />

        {/* image preview shows after user picks an image */}
        {selectedImagePreview ? (
          <div className="composer-image-preview-wrap">
            <img
              src={selectedImagePreview}
              alt="selected upload preview"
              className="composer-image-preview"
            />

            {/* remove selected image */}
            <button
              type="button"
              className="composer-remove-image"
              onClick={onClearSelectedImage}
              aria-label="remove image"
            >
              <FiX />
            </button>
          </div>
        ) : null}

        {/* location tag shows if a location has been added */}
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

            {/* remove location from post */}
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

        <div className="composer-footer">
          <div
            className="composer-left-actions"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {/* button to choose image */}
            <button
              type="button"
              className="profile-small-icon-btn"
              onClick={handleChooseImage}
              aria-label="add image"
            >
              <FiImage />
            </button>

            {/* button to add current location */}
            <button
              type="button"
              className="profile-small-icon-btn"
              onClick={onAddLocation}
              aria-label="add location"
              disabled={isGettingLocation}
              title="add location"
              style={{
                opacity: isGettingLocation ? 0.6 : 1,
              }}
            >
              <FiMapPin />
            </button>

            {/* save current post text as a draft */}
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

            {/* live character count */}
            <span className="composer-count">
              {characterCount}/{maxCharacters}
            </span>
          </div>

          {/* main post button */}
          <button
            type="button"
            className="post-btn"
            disabled={(!postText.trim() && !selectedImage) || isPosting}
            onClick={onPost}
          >
            {isPosting ? "posting..." : "post"}
          </button>
        </div>
      </div>
    </div>
  );
}