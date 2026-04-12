import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// hook to get who the current user is following
export default function useFollowing(uid) {
  // store following users
  const [following, setFollowing] = useState([]);

  // loading state for ui
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if no user id, clear everything
    if (!uid) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    // reference to following subcollection
    const followingCol = collection(db, "users", uid, "following");

    // realtime listener
    const unsubscribe = onSnapshot(followingCol, async (snap) => {
      try {
        // get each followed user profile
        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const followedUserId = d.id;

            // get actual user document
            const userRef = doc(db, "users", followedUserId);
            const userSnap = await getDoc(userRef);

            // fallback if user doc missing
            if (!userSnap.exists()) {
              return {
                id: followedUserId,
                followedAt: d.data()?.followedAt || null,
                username: "",
                displayName: "unknown user",
                bio: "",
                avatarUrl: "",
              };
            }

            const userData = userSnap.data();

            // return clean user object
            return {
              id: followedUserId,
              followedAt: d.data()?.followedAt || null,
              username: userData.username || "",
              displayName:
                userData.displayName ||
                userData.name ||
                userData.username ||
                "user",
              bio: userData.bio || "",
              avatarUrl: userData.avatarUrl || userData.photoURL || "",
            };
          })
        );

        // update state
        setFollowing(rows);
      } catch (error) {
        console.error("error loading following:", error);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    });

    // cleanup listener
    return () => unsubscribe();
  }, [uid]);

  // follow another user
  const follow = async (otherUserId) => {
    if (!uid || !otherUserId || uid === otherUserId) return;

    const ref = doc(db, "users", uid, "following", otherUserId);

    await setDoc(ref, {
      followedAt: Date.now(),
    });
  };

  // unfollow user
  const unfollow = async (otherUserId) => {
    if (!uid || !otherUserId) return;

    const ref = doc(db, "users", uid, "following", otherUserId);

    await deleteDoc(ref);
  };

  // return data + actions
  return { following, loading, follow, unfollow };
}