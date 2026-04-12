import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import {
  blobToDataUrl,
  readCachedOwnAvatar,
  writeCachedOwnAvatar,
} from "../utils/homeCache";

export default function useHomeData(navigate) {
  // logged in user + their profile
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // auth ready stops the page showing too early
  const [authReady, setAuthReady] = useState(false);

  // unread notification dot state
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // locally cached version of own avatar for faster loading
  const [cachedOwnAvatar, setCachedOwnAvatar] = useState("");

  // room list for the home row
  // useMemo keeps this from being rebuilt every render for no reason
  const rooms = useMemo(
    () => [
      { id: 1, name: "for you", icon: "👤", path: null },
      { id: 2, name: "foodies", icon: "🍽️", path: null },
      { id: 3, name: "bmx", icon: "🚲", path: null },
      { id: 4, name: "paranormal", icon: "👻", path: "/rooms/paranormal" },
      { id: 5, name: "movies", icon: "📺", path: null },
    ],
    []
  );

  useEffect(() => {
    // watch auth state so we know if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      // if not logged in, clear profile and send them to login
      if (!user) {
        setCurrentUserProfile(null);
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // if no user, clear profile
    if (!currentUser) {
      setCurrentUserProfile(null);
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);

    // listen to current user's firestore profile in real time
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setCurrentUserProfile({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setCurrentUserProfile(null);
        }
      },
      (error) => {
        console.error("error loading current user profile:", error);
        setCurrentUserProfile(null);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    // if no user, clear cached avatar
    if (!currentUser) {
      setCachedOwnAvatar("");
      return;
    }

    // read already cached avatar from localStorage
    setCachedOwnAvatar(readCachedOwnAvatar(currentUser.uid));
  }, [currentUser]);

  useEffect(() => {
    // only cache avatar if:
    // - user exists
    // - avatar url exists
    // - app is online
    if (!currentUser?.uid || !currentUserProfile?.avatarUrl || !navigator.onLine) return;

    let cancelled = false;

    const cacheOwnAvatar = async () => {
      try {
        // fetch avatar image from its url
        const response = await fetch(currentUserProfile.avatarUrl);
        if (!response.ok) return;

        // turn image into blob, then into data url for localStorage
        const blob = await response.blob();
        const dataUrl = await blobToDataUrl(blob);

        if (!cancelled && typeof dataUrl === "string" && dataUrl) {
          writeCachedOwnAvatar(currentUser.uid, dataUrl);
          setCachedOwnAvatar(dataUrl);
        }
      } catch (error) {
        console.error("error caching own avatar:", error);
      }
    };

    cacheOwnAvatar();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, currentUserProfile?.avatarUrl]);

  useEffect(() => {
    // if no user, no unread notifications
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }

    // listen for unread notifications so the nav dot updates live
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

  // return all home page data this hook manages
  return {
    currentUser,
    currentUserProfile,
    authReady,
    hasUnreadNotifications,
    cachedOwnAvatar,
    rooms,
  };
}