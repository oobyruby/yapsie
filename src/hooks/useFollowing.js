// src/hooks/useFollowing.js
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function useFollowing(uid) {
  // list of users the current user is following
  const [following, setFollowing] = useState([]);

  useEffect(() => {
    if (!uid) return;

    // listen to following subcollection in realtime
    const followingCol = collection(
      db,
      "users",
      uid,
      "following"
    );

    const unsubscribe = onSnapshot(followingCol, (snap) => {
      setFollowing(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, [uid]);

  // follow another user
  const follow = async (otherUserId) => {
    if (!uid || !otherUserId) return;

    const ref = doc(
      db,
      "users",
      uid,
      "following",
      otherUserId
    );

    await setDoc(ref, {
      followedAt: Date.now(),
    });
  };

  // unfollow another user
  const unfollow = async (otherUserId) => {
    if (!uid || !otherUserId) return;

    const ref = doc(
      db,
      "users",
      uid,
      "following",
      otherUserId
    );

    await deleteDoc(ref);
  };

  // expose following list + actions
  return { following, follow, unfollow };
}