export default function useHomeDrafts(currentUser) {
  // save drafts array to localStorage for this user
  const saveHomeDraftsToStorage = (nextDrafts) => {
    if (!currentUser) return;

    localStorage.setItem(
      `yapsieDrafts_${currentUser.uid}`,
      JSON.stringify(nextDrafts)
    );
  };

  // save a new draft from the home composer
  const saveDraft = ({
    postText,
    selectedImage,
    postLocationLabel,
    postLocationCoords,
    clearSelectedImage,
    clearPostLocation,
    setPostText,
    showSaveToast,
  }) => {
    if (!currentUser) return;

    const trimmedText = postText.trim();

    // prevent empty drafts
    if (!trimmedText) {
      alert("write something before saving a draft");
      return;
    }

    // image drafts don't store image (offline friendly)
    const draftToastMessage = selectedImage
      ? "draft saved — image not included"
      : "draft saved";

    const now = Date.now();

    // build draft object
    const newDraft = {
      id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
      text: trimmedText,
      locationLabel: postLocationLabel || "",
      locationCoords: postLocationCoords || null,
      createdAt: now,
      updatedAt: now,
    };

    let existingDrafts = [];

    // read existing drafts from localStorage
    try {
      const savedDrafts = localStorage.getItem(
        `yapsieDrafts_${currentUser.uid}`
      );

      existingDrafts = savedDrafts ? JSON.parse(savedDrafts) : [];

      if (!Array.isArray(existingDrafts)) {
        existingDrafts = [];
      }
    } catch (error) {
      console.error("error reading existing home drafts:", error);
      existingDrafts = [];
    }

    // add new draft and sort newest first
    const nextDrafts = [newDraft, ...existingDrafts].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    // save drafts
    saveHomeDraftsToStorage(nextDrafts);

    // clear composer
    setPostText("");
    clearSelectedImage();
    clearPostLocation();

    // show toast
    showSaveToast(draftToastMessage);
  };

  return {
    saveHomeDraftsToStorage,
    saveDraft,
  };
}