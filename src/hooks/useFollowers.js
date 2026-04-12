// src/hooks/useFollowers.js
import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function useFollowers(targetUserId, currentUserId) {
  // list of users following the target profile
  const [followers, setFollowers] = useState([]);

  useEffect(() => {
    if (!targetUserId) return;

    // listen to followers subcollection in realtime
    const followersCol = collection(
      db,
      "users",
      targetUserId,
      "followers"
    );

    const unsubscribe = onSnapshot(followersCol, (snap) => {
      setFollowers(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsubscribe();
  }, [targetUserId]);

  // follow the target user
  const followUser = async () => {
    if (!targetUserId || !currentUserId) return;

    const followerRef = doc(
      db,
      "users",
      targetUserId,
      "followers",
      currentUserId
    );

    await setDoc(followerRef, {
      followedAt: Date.now(),
    });
  };

  // unfollow the target user
  const unfollowUser = async () => {
    if (!targetUserId || !currentUserId) return;

    const followerRef = doc(
      db,
      "users",
      targetUserId,
      "followers",
      currentUserId
    );

    await deleteDoc(followerRef);
  };

  // expose followers list + actions
  return { followers, followUser, unfollowUser };
}