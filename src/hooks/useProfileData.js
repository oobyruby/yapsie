import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { readProfileCache, writeProfileCache } from "../utils/profileCache";

export default function useProfileData(navigate) {
  // auth + notification state
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // profile + counts
  const [profile, setProfile] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // listen for login state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      // redirect if logged out
      if (!user) {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // load cached profile first (instant UI)
  useEffect(() => {
    if (!currentUser) return;

    const cachedProfile = readProfileCache(currentUser.uid, "profile", null);
    const cachedFollowersCount = readProfileCache(currentUser.uid, "followersCount", 0);
    const cachedFollowingCount = readProfileCache(currentUser.uid, "followingCount", 0);

    if (cachedProfile) setProfile(cachedProfile);
    setFollowersCount(cachedFollowersCount || 0);
    setFollowingCount(cachedFollowingCount || 0);
  }, [currentUser]);

  // realtime profile listener
  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const nextProfile = {
          id: snapshot.id,
          ...snapshot.data(),
        };

        // update UI
        setProfile(nextProfile);

        // cache locally for offline use
        writeProfileCache(currentUser.uid, "profile", nextProfile);
      },
      (error) => {
        console.error("error loading profile:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // unread notifications listener (for bell dot)
  useEffect(() => {
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }

    const unreadQuery = query(
      collection(db, "users", currentUser.uid, "notifications"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        setHasUnreadNotifications(snapshot.size > 0);
      },
      (error) => {
        console.error("error loading unread notifications:", error);
        setHasUnreadNotifications(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // followers count listener
  useEffect(() => {
    if (!currentUser) {
      setFollowersCount(0);
      return;
    }

    const followersRef = collection(db, "users", currentUser.uid, "followers");

    const unsubscribe = onSnapshot(
      followersRef,
      (snapshot) => {
        setFollowersCount(snapshot.size);

        // cache follower count
        writeProfileCache(currentUser.uid, "followersCount", snapshot.size);
      },
      (error) => {
        console.error("error loading followers count:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // following count listener
  useEffect(() => {
    if (!currentUser) {
      setFollowingCount(0);
      return;
    }

    const followingRef = collection(db, "users", currentUser.uid, "following");

    const unsubscribe = onSnapshot(
      followingRef,
      (snapshot) => {
        setFollowingCount(snapshot.size);

        // cache following count
        writeProfileCache(currentUser.uid, "followingCount", snapshot.size);
      },
      (error) => {
        console.error("error loading following count:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  return {
    currentUser,
    authReady,
    hasUnreadNotifications,
    profile,
    followersCount,
    followingCount,
    setProfile,
  };
}