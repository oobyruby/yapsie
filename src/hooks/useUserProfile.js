// src/hooks/useUserProfile.js
import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function useUserProfile(uid) {
  // selected user's profile data
  const [profile, setProfile] = useState(null);

  // loading state while firestore is being checked
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if no uid given, clear profile and stop loading
    if (!uid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const userRef = doc(db, "users", uid);

    // listen to this user's profile in real time
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() });
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
      (err) => {
        console.error("failed to load user profile", err);
        setProfile(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const updateProfile = async (updates) => {
    // stop if no uid
    if (!uid) return;

    const userRef = doc(db, "users", uid);

    // update this user's profile fields in firestore
    await updateDoc(userRef, updates);
  };

  return { profile, loading, updateProfile };
}