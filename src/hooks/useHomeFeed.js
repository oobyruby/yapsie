import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";
import {
  cacheProfilesFromPosts,
  cacheVisibleFeed,
  getCachedFeedKey,
  getOfflinePostsKey,
  parseStoredPosts,
  readCachedProfiles,
} from "../utils/homeCache";

export default function useHomeFeed(currentUser, authReady, showSaveToast) {
  // main home feed posts
  const [posts, setPosts] = useState([]);

  // loading states for like + repost buttons
  const [likeLoadingIds, setLikeLoadingIds] = useState([]);
  const [repostLoadingIds, setRepostLoadingIds] = useState([]);

  useEffect(() => {
    // if no user, do nothing
    if (!currentUser) return;

    try {
      // load cached feed + queued offline posts from localStorage
      const cachedFeedRaw = localStorage.getItem(getCachedFeedKey(currentUser.uid));
      const queuedPostsRaw = localStorage.getItem(getOfflinePostsKey(currentUser.uid));

      const cachedFeed = parseStoredPosts(cachedFeedRaw ? JSON.parse(cachedFeedRaw) : []);
      const queuedPosts = parseStoredPosts(queuedPostsRaw ? JSON.parse(queuedPostsRaw) : []);

      // merge them together, newest first
      const merged = [...queuedPosts, ...cachedFeed].sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || 0;
        const bTime = b.createdAt?.getTime?.() || 0;
        return bTime - aTime;
      });

      // show cached data straight away so feed loads faster
      if (merged.length) {
        setPosts(merged);
      }
    } catch (error) {
      console.error("error loading cached home feed:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    // wait until auth is ready and we actually have a user
    if (!authReady || !currentUser) return;

    // listen to posts collection in real time, newest first
    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      postsQuery,
      async (snapshot) => {
        try {
          const user = auth.currentUser;

          // load every post and also check if current user liked/reposted it
          const rawPosts = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const data = postDoc.data();

              let likedByMe = false;
              let repostedByMe = false;

              if (user) {
                const likeRef = doc(db, "posts", postDoc.id, "likes", user.uid);
                const repostRef = doc(db, "posts", postDoc.id, "reposts", user.uid);

                const [likeSnap, repostSnap] = await Promise.all([
                  getDoc(likeRef),
                  getDoc(repostRef),
                ]);

                likedByMe = likeSnap.exists();
                repostedByMe = repostSnap.exists();
              }

              return {
                id: postDoc.id,
                ...data,
                likedByMe,
                repostedByMe,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
              };
            })
          );

          // collect all unique author ids so profile info can be refreshed
          const authorIds = [...new Set(rawPosts.map((post) => post.authorId).filter(Boolean))];

          // load latest profile info for each post author
          const authorEntries = await Promise.all(
            authorIds.map(async (authorId) => {
              try {
                const userSnap = await getDoc(doc(db, "users", authorId));
                return [
                  authorId,
                  userSnap.exists() ? userSnap.data() : null,
                ];
              } catch (error) {
                console.error("error loading author profile:", error);
                return [authorId, null];
              }
            })
          );

          const authorMap = new Map(authorEntries);

          // replace old post profile info with freshest user data if available
          const loadedPosts = rawPosts.map((post) => {
            const latestAuthor = authorMap.get(post.authorId);

            return {
              ...post,
              name: latestAuthor?.name || post.name || "",
              username: latestAuthor?.username || post.username || "",
              avatarUrl: latestAuthor?.avatarUrl || post.avatarUrl || "",
            };
          });

          let queuedPosts = [];
          try {
            // also pull in any offline queued posts still waiting to send
            const queuedRaw = localStorage.getItem(getOfflinePostsKey(currentUser.uid));
            queuedPosts = parseStoredPosts(queuedRaw ? JSON.parse(queuedRaw) : []);
          } catch (error) {
            console.error("error reading queued posts:", error);
          }

          // merge online posts with queued offline posts
          const merged = [...queuedPosts, ...loadedPosts].sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          setPosts(merged);

          // update local cache for faster reloads / offline mode
          cacheVisibleFeed(currentUser.uid, merged);
          cacheProfilesFromPosts(currentUser.uid, merged);
        } catch (error) {
          console.error("error loading posts:", error);
        }
      },
      (error) => {
        console.error("error subscribing to posts:", error);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentUser]);

  useEffect(() => {
    // no user = nothing to sync
    if (!currentUser) return;

    const syncOfflinePosts = async () => {
      // only sync when back online
      if (!navigator.onLine) return;

      let queued = [];
      try {
        // read queued offline posts
        const queuedRaw = localStorage.getItem(getOfflinePostsKey(currentUser.uid));
        queued = queuedRaw ? JSON.parse(queuedRaw) : [];
      } catch (error) {
        console.error("error reading offline queue:", error);
        queued = [];
      }

      if (!Array.isArray(queued) || !queued.length) return;

      try {
        // send each queued post to firestore
        for (const post of queued) {
          await addDoc(collection(db, "posts"), {
            authorId: post.authorId,
            username: post.username || "",
            name: post.name || "",
            avatarUrl: post.avatarUrl || "",
            text: post.text || "",
            imageUrl: "",
            locationLabel: post.locationLabel || "",
            locationLat: post.locationCoords?.lat ?? null,
            locationLng: post.locationCoords?.lng ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            likeCount: 0,
            repostCount: 0,
            replyCount: 0,
            deleted: false,
          });
        }

        // clear queue after successful sync
        localStorage.removeItem(getOfflinePostsKey(currentUser.uid));
        showSaveToast?.("offline posts sent");
      } catch (error) {
        console.error("error syncing offline posts:", error);
      }
    };

    // try sync right away, and also whenever internet comes back
    syncOfflinePosts();
    window.addEventListener("online", syncOfflinePosts);

    return () => {
      window.removeEventListener("online", syncOfflinePosts);
    };
  }, [currentUser, showSaveToast]);

  const uploadPostImage = async (file, userId) => {
    // build storage path for uploaded post image
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `posts/${userId}/${Date.now()}.${extension}`;
    const storageRef = ref(storage, fileName);

    // upload file to firebase storage
    await uploadBytes(storageRef, file);

    // return download url to save in firestore
    return getDownloadURL(storageRef);
  };

  const createPost = async ({
    currentUser,
    currentUserProfile,
    postText,
    selectedImage,
    postLocationLabel,
    postLocationCoords,
  }) => {
    const trimmedText = postText.trim();

    let imageUrl = "";

    // upload image first if one was selected
    if (selectedImage) {
      imageUrl = await uploadPostImage(selectedImage, currentUser.uid);
    }

    // create new post in firestore
    await addDoc(collection(db, "posts"), {
      authorId: currentUser.uid,
      username: currentUserProfile.username || "",
      name: currentUserProfile.name || "",
      avatarUrl: currentUserProfile.avatarUrl || "",
      text: trimmedText,
      imageUrl,
      locationLabel: postLocationLabel || "",
      locationLat: postLocationCoords?.lat ?? null,
      locationLng: postLocationCoords?.lng ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      deleted: false,
    });
  };

  const handleToggleLike = async (postId, likedByMe) => {
    if (!currentUser) {
      alert("you need to be logged in to like posts");
      return;
    }

    // block likes on temp offline posts
    if (String(postId).startsWith("temp-")) return;

    // stop repeat clicks while request is already running
    if (likeLoadingIds.includes(postId)) return;

    const likeRef = doc(db, "posts", postId, "likes", currentUser.uid);
    const postRef = doc(db, "posts", postId);

    try {
      setLikeLoadingIds((prev) => [...prev, postId]);

      if (likedByMe) {
        // unlike post
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likeCount: increment(-1) });

        // update UI straight away
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likedByMe: false,
                  likeCount: Math.max((post.likeCount || 0) - 1, 0),
                }
              : post
          )
        );
      } else {
        // like post
        await setDoc(likeRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, { likeCount: increment(1) });

        // update UI straight away
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likedByMe: true,
                  likeCount: (post.likeCount || 0) + 1,
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error("error toggling like:", error);
      alert(error.message || "could not update like right now");
    } finally {
      setLikeLoadingIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  const handleToggleRepost = async (postId, repostedByMe) => {
    if (!currentUser) {
      alert("you need to be logged in to repost");
      return;
    }

    // block reposts on temp offline posts
    if (String(postId).startsWith("temp-")) return;

    // stop repeat clicks while request is already running
    if (repostLoadingIds.includes(postId)) return;

    const repostRef = doc(db, "posts", postId, "reposts", currentUser.uid);
    const postRef = doc(db, "posts", postId);

    try {
      setRepostLoadingIds((prev) => [...prev, postId]);

      if (repostedByMe) {
        // remove repost
        await deleteDoc(repostRef);
        await updateDoc(postRef, { repostCount: increment(-1) });

        // update UI straight away
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  repostedByMe: false,
                  repostCount: Math.max((post.repostCount || 0) - 1, 0),
                }
              : post
          )
        );
      } else {
        // create repost
        await setDoc(repostRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, { repostCount: increment(1) });

        // update UI straight away
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  repostedByMe: true,
                  repostCount: (post.repostCount || 0) + 1,
                }
              : post
          )
        );
      }
    } catch (error) {
      console.error("error toggling repost:", error);
      alert(error.message || "could not update repost right now");
    } finally {
      setRepostLoadingIds((prev) => prev.filter((id) => id !== postId));
    }
  };

  return {
    posts,
    setPosts,
    likeLoadingIds,
    repostLoadingIds,
    handleToggleLike,
    handleToggleRepost,
    createPost,
    readCachedProfiles,
  };
}