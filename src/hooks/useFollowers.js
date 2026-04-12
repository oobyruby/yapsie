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

// hook to get followers for a profile
export default function useFollowers(targetUserId, currentUserId) {
  // store followers list
  const [followers, setFollowers] = useState([]);

  // loading state for ui
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // if no target user, clear everything
    if (!targetUserId) {
      setFollowers([]);
      setLoading(false);
      return;
    }

    // reference to followers subcollection
    const followersCol = collection(db, "users", targetUserId, "followers");

    // realtime listener
    const unsubscribe = onSnapshot(followersCol, async (snap) => {
      try {
        // get each follower profile
        const rows = await Promise.all(
          snap.docs.map(async (d) => {
            const followerUserId = d.id;

            // get user document
            const userRef = doc(db, "users", followerUserId);
            const userSnap = await getDoc(userRef);

            // fallback if user doc missing
            if (!userSnap.exists()) {
              return {
                id: followerUserId,
                followedAt: d.data()?.followedAt || null,
                username: "",
                displayName: "unknown user",
                bio: "",
                avatarUrl: "",
              };
            }

            const userData = userSnap.data();

            // return clean follower object
            return {
              id: followerUserId,
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
        setFollowers(rows);
      } catch (error) {
        console.error("error loading followers:", error);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    });

    // cleanup listener
    return () => unsubscribe();
  }, [targetUserId]);

  // follow this user (adds current user to their followers)
  const followUser = async () => {
    if (!targetUserId || !currentUserId || targetUserId === currentUserId) return;

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

  // unfollow this user (remove from followers)
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

  // return followers + actions
  return { followers, loading, followUser, unfollowUser };
}