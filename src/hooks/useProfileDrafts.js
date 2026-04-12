import { useEffect, useState } from "react";

export default function useProfileDrafts(currentUser) {
  // drafts state
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    // no user = no drafts
    if (!currentUser) {
      setDrafts([]);
      return;
    }

    try {
      // read drafts from localStorage
      const savedDrafts = localStorage.getItem(`yapsieDrafts_${currentUser.uid}`);
      const parsedDrafts = savedDrafts ? JSON.parse(savedDrafts) : [];

      // make sure it's valid array
      if (Array.isArray(parsedDrafts)) {
        // newest drafts first
        parsedDrafts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        setDrafts(parsedDrafts);
      } else {
        setDrafts([]);
      }
    } catch (error) {
      console.error("error loading drafts:", error);
      setDrafts([]);
    }
  }, [currentUser]);

  const saveDrafts = (nextDrafts) => {
    if (!currentUser) return;

    // sort newest first
    const sorted = [...nextDrafts].sort(
      (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
    );

    // save to localStorage
    localStorage.setItem(
      `yapsieDrafts_${currentUser.uid}`,
      JSON.stringify(sorted)
    );

    // update state
    setDrafts(sorted);
  };

  const addDraft = ({ text, locationLabel = "", locationCoords = null }) => {
    if (!currentUser) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    const now = Date.now();

    // new draft object
    const newDraft = {
      id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
      text: trimmedText,
      locationLabel,
      locationCoords,
      createdAt: now,
      updatedAt: now,
    };

    // add to top
    saveDrafts([newDraft, ...drafts]);
  };

  const deleteDraft = (draftId) => {
    saveDrafts(drafts.filter((draft) => draft.id !== draftId));
  };

  return {
    drafts,
    setDrafts,
    saveDrafts,
    addDraft,
    deleteDraft,
  };
}