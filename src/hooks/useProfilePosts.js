import { useEffect, useMemo, useState } from "react";
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
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import {
  deserialisePosts,
  readProfileCache,
  serialisePosts,
  writeProfileCache,
} from "../utils/profileCache";

export default function useProfilePosts(currentUser) {
  // main profile data
  const [ownPosts, setOwnPosts] = useState([]);
  const [repostedPosts, setRepostedPosts] = useState([]);
  const [favouritePosts, setFavouritePosts] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);

  // sets make it easy to quickly check liked / reposted state
  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState(new Set());

  // loading states
  const [likeLoadingIds, setLikeLoadingIds] = useState([]);
  const [repostLoadingIds, setRepostLoadingIds] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);

  const buildPostIdSet = (posts) =>
    // build a set of real post ids from normal posts / reposts / favourites
    new Set(posts.map((post) => post.originalPostId || post.id).filter(Boolean));

  const hydrateAuthors = async (posts) => {
    // collect unique author ids so we only fetch each user once
    const authorIds = [...new Set(posts.map((post) => post.authorId).filter(Boolean))];

    const authorEntries = await Promise.all(
      authorIds.map(async (authorId) => {
        try {
          const userSnap = await getDoc(doc(db, "users", authorId));
          return [authorId, userSnap.exists() ? userSnap.data() : null];
        } catch (error) {
          console.error("error loading author profile:", error);
          return [authorId, null];
        }
      })
    );

    const authorMap = new Map(authorEntries);

    // attach latest profile info onto posts
    return posts.map((post) => {
      const latestAuthor = authorMap.get(post.authorId);

      return {
        ...post,
        name: latestAuthor?.name || post.name || "",
        username: latestAuthor?.username || post.username || "",
        avatarUrl: latestAuthor?.avatarUrl || post.avatarUrl || "",
      };
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    // load cached profile data first so page shows something instantly
    const cachedOwnPosts = readProfileCache(currentUser.uid, "ownPosts", []);
    const cachedRepostedPosts = readProfileCache(currentUser.uid, "repostedPosts", []);
    const cachedFavouritePosts = readProfileCache(currentUser.uid, "favouritePosts", []);
    const cachedJoinedRooms = readProfileCache(currentUser.uid, "joinedRooms", []);

    const hydratedOwnPosts = deserialisePosts(cachedOwnPosts);
    const hydratedRepostedPosts = deserialisePosts(cachedRepostedPosts);
    const hydratedFavouritePosts = deserialisePosts(cachedFavouritePosts);

    setOwnPosts(hydratedOwnPosts);
    setRepostedPosts(hydratedRepostedPosts);
    setFavouritePosts(hydratedFavouritePosts);

    // build quick lookup sets from cached data
    setLikedPostIds(buildPostIdSet(hydratedFavouritePosts));
    setRepostedPostIds(buildPostIdSet(hydratedRepostedPosts));

    // joined rooms also need date values fixed back into Date objects
    setJoinedRooms(
      Array.isArray(cachedJoinedRooms)
        ? cachedJoinedRooms.map((room) => ({
            ...room,
            joinedAt: room.joinedAt ? new Date(room.joinedAt) : null,
          }))
        : []
    );

    setPostsLoading(false);
    setRoomsLoading(false);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setOwnPosts([]);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);

    // get posts made by the current user
    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      async (snapshot) => {
        try {
          const rawPosts = snapshot.docs.map((postDoc) => {
            const data = postDoc.data();

            return {
              id: postDoc.id,
              ...data,
              isRepost: false,
              isFavourite: false,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
              editedAt: data.editedAt?.toDate ? data.editedAt.toDate() : null,
            };
          });

          // refresh name / username / avatar from users collection
          const loadedPosts = await hydrateAuthors(rawPosts);

          // newest posts first
          loadedPosts.sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          setOwnPosts(loadedPosts);

          // cache for quicker loading later
          writeProfileCache(currentUser.uid, "ownPosts", serialisePosts(loadedPosts));
          setPostsLoading(false);
        } catch (error) {
          console.error("error subscribing to own posts:", error);
          setPostsLoading(false);
        }
      },
      (error) => {
        console.error("error subscribing to own posts:", error);
        setPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setRepostedPostIds(new Set());
      setRepostedPosts([]);
      return;
    }

    // watch all posts and check which ones current user reposted
    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        try {
          const loaded = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const repostRef = doc(db, "posts", postDoc.id, "reposts", currentUser.uid);
              const repostSnap = await getDoc(repostRef);

              if (!repostSnap.exists()) return null;

              const postData = postDoc.data();
              const repostData = repostSnap.data();

              return {
                id: `repost-${postDoc.id}`,
                originalPostId: postDoc.id,
                ...postData,
                isRepost: true,
                isFavourite: false,
                repostedAt: repostData.createdAt?.toDate
                  ? repostData.createdAt.toDate()
                  : null,
                createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate() : null,
                updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate() : null,
                editedAt: postData.editedAt?.toDate ? postData.editedAt.toDate() : null,
              };
            })
          );

          const cleaned = loaded.filter(Boolean);
          const hydrated = await hydrateAuthors(cleaned);

          // newest reposts first
          hydrated.sort((a, b) => {
            const aTime = a.repostedAt?.getTime?.() || 0;
            const bTime = b.repostedAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          const ids = buildPostIdSet(hydrated);

          setRepostedPostIds(ids);
          setRepostedPosts(hydrated);
          writeProfileCache(currentUser.uid, "repostedPosts", serialisePosts(hydrated));
        } catch (error) {
          console.error("error loading reposts:", error);
        }
      },
      (error) => {
        console.error("error subscribing to reposts:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLikedPostIds(new Set());
      setFavouritePosts([]);
      return;
    }

    // watch all posts and check which ones current user liked
    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        try {
          const loaded = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const likeRef = doc(db, "posts", postDoc.id, "likes", currentUser.uid);
              const likeSnap = await getDoc(likeRef);

              if (!likeSnap.exists()) return null;

              const postData = postDoc.data();
              const likeData = likeSnap.data();

              return {
                id: `favourite-${postDoc.id}`,
                originalPostId: postDoc.id,
                ...postData,
                isFavourite: true,
                isRepost: false,
                likedAt: likeData.createdAt?.toDate ? likeData.createdAt.toDate() : null,
                createdAt: postData.createdAt?.toDate ? postData.createdAt.toDate() : null,
                updatedAt: postData.updatedAt?.toDate ? postData.updatedAt.toDate() : null,
                editedAt: postData.editedAt?.toDate ? postData.editedAt.toDate() : null,
              };
            })
          );

          const cleaned = loaded.filter(Boolean);
          const hydrated = await hydrateAuthors(cleaned);

          // newest liked posts first
          hydrated.sort((a, b) => {
            const aTime = a.likedAt?.getTime?.() || 0;
            const bTime = b.likedAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          const ids = buildPostIdSet(hydrated);

          setLikedPostIds(ids);
          setFavouritePosts(hydrated);
          writeProfileCache(currentUser.uid, "favouritePosts", serialisePosts(hydrated));
        } catch (error) {
          console.error("error loading favourites:", error);
        }
      },
      (error) => {
        console.error("error subscribing to favourites:", error);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setJoinedRooms([]);
      setRoomsLoading(false);
      return;
    }

    setRoomsLoading(true);

    // get joined rooms newest first
    const joinedRoomsQuery = query(
      collection(db, "users", currentUser.uid, "joinedRooms"),
      orderBy("joinedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      joinedRoomsQuery,
      (snapshot) => {
        const loadedRooms = snapshot.docs.map((roomDoc) => {
          const data = roomDoc.data();

          return {
            id: roomDoc.id,
            ...data,
            joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : null,
          };
        });

        setJoinedRooms(loadedRooms);

        // cache joined rooms too
        writeProfileCache(
          currentUser.uid,
          "joinedRooms",
          loadedRooms.map((room) => ({
            ...room,
            joinedAt: room.joinedAt ? room.joinedAt.toISOString() : null,
          }))
        );

        setRoomsLoading(false);
      },
      (error) => {
        console.error("error loading joined rooms:", error);
        setRoomsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const decoratePost = (post) => {
    // work out the real original post id
    const realId =
      post.originalPostId ||
      (String(post.id).startsWith("repost-")
        ? post.id.replace("repost-", "")
        : String(post.id).startsWith("favourite-")
        ? post.id.replace("favourite-", "")
        : post.id);

    // attach current liked/reposted state
    return {
      ...post,
      likedByMe: likedPostIds.has(realId),
      repostedByMe: repostedPostIds.has(realId),
    };
  };

  const posts = useMemo(() => {
    // combine normal posts + reposts for main posts tab
    const combined = [...ownPosts, ...repostedPosts].map(decoratePost);

    combined.sort((a, b) => {
      const aTime = a.isRepost
        ? a.repostedAt?.getTime?.() || 0
        : a.createdAt?.getTime?.() || 0;

      const bTime = b.isRepost
        ? b.repostedAt?.getTime?.() || 0
        : b.createdAt?.getTime?.() || 0;

      return bTime - aTime;
    });

    return combined;
  }, [ownPosts, repostedPosts, likedPostIds, repostedPostIds]);

  const mediaPosts = useMemo(() => {
    // only posts with some kind of media
    return posts.filter(
      (post) =>
        post.imageUrl ||
        post.mediaUrl ||
        (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0)
    );
  }, [posts]);

  const sortedFavouritePosts = useMemo(() => {
    // favourites also need liked/reposted flags
    return favouritePosts.map(decoratePost);
  }, [favouritePosts, likedPostIds, repostedPostIds]);

  const uploadPostImage = async (file, userId) => {
    // upload image to firebase storage
    const extension = file.name.split(".").pop() || "jpg";
    const fileName = `posts/${userId}/${Date.now()}.${extension}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const handleToggleLike = async (postId, likedByMe, onOfflineBlocked) => {
    if (!currentUser) return;

    // block likes while offline
    if (!navigator.onLine) {
      onOfflineBlocked?.();
      return;
    }

    // work out real id again in case it came from repost/favourite tab
    const realPostId =
      postId.originalPostId ||
      (String(postId).startsWith("repost-")
        ? postId.replace("repost-", "")
        : String(postId).startsWith("favourite-")
        ? postId.replace("favourite-", "")
        : postId);

    if (likeLoadingIds.includes(realPostId)) return;
    if (String(realPostId).startsWith("temp-")) return;

    const postRef = doc(db, "posts", realPostId);
    const likeRef = doc(db, "posts", realPostId, "likes", currentUser.uid);

    try {
      setLikeLoadingIds((prev) => [...prev, realPostId]);

      if (likedByMe) {
        // unlike post
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likeCount: increment(-1) });
      } else {
        // like post
        await setDoc(likeRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        await updateDoc(postRef, { likeCount: increment(1) });
      }

      const updateCounts = (post) => {
        const id =
          post.originalPostId ||
          (String(post.id).startsWith("repost-")
            ? post.id.replace("repost-", "")
            : String(post.id).startsWith("favourite-")
            ? post.id.replace("favourite-", "")
            : post.id);

        if (id !== realPostId) return post;

        return {
          ...post,
          likeCount: likedByMe
            ? Math.max((post.likeCount || 0) - 1, 0)
            : (post.likeCount || 0) + 1,
        };
      };

      // update local ui right away
      setOwnPosts((prev) => prev.map(updateCounts));
      setRepostedPosts((prev) => prev.map(updateCounts));
      setFavouritePosts((prev) =>
        likedByMe
          ? prev.filter((post) => post.originalPostId !== realPostId)
          : prev.map(updateCounts)
      );

      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (likedByMe) next.delete(realPostId);
        else next.add(realPostId);
        return next;
      });
    } catch (error) {
      console.error("error toggling like:", error);
      alert(error.message || "could not update like right now");
    } finally {
      setLikeLoadingIds((prev) => prev.filter((id) => id !== realPostId));
    }
  };

  const handleToggleRepost = async (postId, repostedByMe, onOfflineBlocked) => {
    if (!currentUser) return;

    // block reposts while offline
    if (!navigator.onLine) {
      onOfflineBlocked?.();
      return;
    }

    const realPostId =
      postId.originalPostId ||
      (String(postId).startsWith("repost-")
        ? postId.replace("repost-", "")
        : String(postId).startsWith("favourite-")
        ? postId.replace("favourite-", "")
        : postId);

    if (repostLoadingIds.includes(realPostId)) return;
    if (String(realPostId).startsWith("temp-")) return;

    const postRef = doc(db, "posts", realPostId);
    const repostRef = doc(db, "posts", realPostId, "reposts", currentUser.uid);

    try {
      setRepostLoadingIds((prev) => [...prev, realPostId]);

      if (repostedByMe) {
        // remove repost
        await deleteDoc(repostRef);
        await updateDoc(postRef, { repostCount: increment(-1) });

        setRepostedPosts((prev) =>
          prev.filter((post) => post.originalPostId !== realPostId)
        );
      } else {
        // get original post so we can show optimistic repost instantly
        const originalSnap = await getDoc(postRef);
        const originalData = originalSnap.exists() ? originalSnap.data() : null;

        await setDoc(repostRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, { repostCount: increment(1) });

        if (originalData) {
          const optimisticRepost = {
            id: `repost-${realPostId}`,
            originalPostId: realPostId,
            ...originalData,
            isRepost: true,
            isFavourite: false,
            repostedAt: new Date(),
            createdAt: originalData.createdAt?.toDate
              ? originalData.createdAt.toDate()
              : null,
            updatedAt: originalData.updatedAt?.toDate
              ? originalData.updatedAt.toDate()
              : null,
            editedAt: originalData.editedAt?.toDate
              ? originalData.editedAt.toDate()
              : null,
          };

          setRepostedPosts((prev) => {
            const alreadyExists = prev.some(
              (post) => post.originalPostId === realPostId
            );

            if (alreadyExists) return prev;
            return [optimisticRepost, ...prev];
          });
        }
      }

      const updateCounts = (post) => {
        const id =
          post.originalPostId ||
          (String(post.id).startsWith("repost-")
            ? post.id.replace("repost-", "")
            : String(post.id).startsWith("favourite-")
            ? post.id.replace("favourite-", "")
            : post.id);

        if (id !== realPostId) return post;

        return {
          ...post,
          repostCount: repostedByMe
            ? Math.max((post.repostCount || 0) - 1, 0)
            : (post.repostCount || 0) + 1,
        };
      };

      // update local ui
      setOwnPosts((prev) => prev.map(updateCounts));
      setRepostedPosts((prev) => prev.map(updateCounts));
      setFavouritePosts((prev) => prev.map(updateCounts));

      setRepostedPostIds((prev) => {
        const next = new Set(prev);
        if (repostedByMe) next.delete(realPostId);
        else next.add(realPostId);
        return next;
      });
    } catch (error) {
      console.error("error toggling repost:", error);
      alert(error.message || "could not update repost right now");
    } finally {
      setRepostLoadingIds((prev) => prev.filter((id) => id !== realPostId));
    }
  };

  const createPost = async ({
    profile,
    postText,
    selectedImage,
    postLocationLabel,
    postLocationCoords,
  }) => {
    const trimmedText = postText.trim();
    if (!currentUser || (!trimmedText && !selectedImage) || !profile) return;

    let imageUrl = "";

    // upload image first if one exists
    if (selectedImage) {
      imageUrl = await uploadPostImage(selectedImage, currentUser.uid);
    }

    // create brand new post
    await addDoc(collection(db, "posts"), {
      authorId: currentUser.uid,
      username: profile.username || "",
      name: profile.name || "",
      avatarUrl: profile.avatarUrl || "",
      text: trimmedText,
      imageUrl,
      locationLabel: postLocationLabel || "",
      locationLat: postLocationCoords?.lat ?? null,
      locationLng: postLocationCoords?.lng ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      edited: false,
      editText: "",
      editedAt: null,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      deleted: false,
    });
  };

  const postDraft = async ({ draft, profile }) => {
    const trimmedText = draft?.text?.trim() || "";
    if (!currentUser || !profile || !trimmedText) return;

    // turn a saved draft into a real post
    await addDoc(collection(db, "posts"), {
      authorId: currentUser.uid,
      username: profile.username || "",
      name: profile.name || "",
      avatarUrl: profile.avatarUrl || "",
      text: trimmedText,
      imageUrl: "",
      locationLabel: draft.locationLabel || "",
      locationLat: draft.locationCoords?.lat ?? null,
      locationLng: draft.locationCoords?.lng ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      edited: false,
      editText: "",
      editedAt: null,
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      deleted: false,
    });
  };

  const saveEdit = async (editingPostId, editingText) => {
    const trimmedEdit = editingText.trim();

    // save edit note under the post
    await updateDoc(doc(db, "posts", editingPostId), {
      edited: !!trimmedEdit,
      editText: trimmedEdit,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  };

  const deletePostById = async (postId) => {
    // fully delete post document
    await deleteDoc(doc(db, "posts", postId));
  };

  return {
    ownPosts,
    repostedPosts,
    favouritePosts,
    joinedRooms,
    likedPostIds,
    repostedPostIds,
    likeLoadingIds,
    repostLoadingIds,
    postsLoading,
    roomsLoading,
    posts,
    mediaPosts,
    sortedFavouritePosts,
    handleToggleLike,
    handleToggleRepost,
    createPost,
    postDraft,
    saveEdit,
    deletePostById,
  };
}