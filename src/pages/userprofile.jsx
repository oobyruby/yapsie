import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiBell,
  FiHome,
  FiMessageCircle,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  orderBy,
} from "firebase/firestore";

import { db } from "../firebase";
import useUserProfile from "../hooks/useUserProfile";
import useFollowers from "../hooks/useFollowers";
import useFollowing from "../hooks/useFollowing";
import useAuthUser from "../hooks/useAuthUser";

import UserProfileHeader from "../components/userProfile/UserProfileHeader";
import UserProfileTabs from "../components/userProfile/UserProfileTabs";
import UserProfilePostCard from "../components/userProfile/UserProfilePostCard";

export default function UserProfile() {
  const navigate = useNavigate();
  const { uid } = useParams();
  const { currentUser, authReady } = useAuthUser();

  const viewedUserId = uid || currentUser?.uid || null;

  const { profile, loading } = useUserProfile(viewedUserId);

  const { followers, followUser, unfollowUser } = useFollowers(
    viewedUserId,
    currentUser?.uid || null
  );

  const { following } = useFollowing(viewedUserId);

  const [activeTab, setActiveTab] = useState("Posts");

  const [ownPosts, setOwnPosts] = useState([]);
  const [repostedPosts, setRepostedPosts] = useState([]);
  const [favouritePosts, setFavouritePosts] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);

  const [likedPostIds, setLikedPostIds] = useState(new Set());
  const [repostedPostIds, setRepostedPostIds] = useState(new Set());

  const [likeLoadingIds, setLikeLoadingIds] = useState([]);
  const [repostLoadingIds, setRepostLoadingIds] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      setCollapsed(el.scrollTop > 60);
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!viewedUserId) {
      setOwnPosts([]);
      setPostsLoading(false);
      return;
    }

    setPostsLoading(true);

    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", viewedUserId)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const loadedPosts = snapshot.docs.map((postDoc) => {
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

        loadedPosts.sort((a, b) => {
          const aTime = a.createdAt?.getTime?.() || 0;
          const bTime = b.createdAt?.getTime?.() || 0;
          return bTime - aTime;
        });

        setOwnPosts(loadedPosts);
        setPostsLoading(false);
      },
      (error) => {
        console.error("error loading viewed user posts:", error);
        setOwnPosts([]);
        setPostsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      setRepostedPosts([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        try {
          const loaded = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const repostRef = doc(db, "posts", postDoc.id, "reposts", viewedUserId);
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

          cleaned.sort((a, b) => {
            const aTime = a.repostedAt?.getTime?.() || 0;
            const bTime = b.repostedAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          setRepostedPosts(cleaned);
        } catch (error) {
          console.error("error loading viewed user reposts:", error);
          setRepostedPosts([]);
        }
      },
      (error) => {
        console.error("error subscribing to viewed user reposts:", error);
        setRepostedPosts([]);
      }
    );

    return () => unsubscribe();
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      setFavouritePosts([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        try {
          const loaded = await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const likeRef = doc(db, "posts", postDoc.id, "likes", viewedUserId);
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

          cleaned.sort((a, b) => {
            const aTime = a.likedAt?.getTime?.() || 0;
            const bTime = b.likedAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          setFavouritePosts(cleaned);
        } catch (error) {
          console.error("error loading viewed user favourites:", error);
          setFavouritePosts([]);
        }
      },
      (error) => {
        console.error("error subscribing to viewed user favourites:", error);
        setFavouritePosts([]);
      }
    );

    return () => unsubscribe();
  }, [viewedUserId]);

  useEffect(() => {
    if (!viewedUserId) {
      setJoinedRooms([]);
      setRoomsLoading(false);
      return;
    }

    setRoomsLoading(true);

    const joinedRoomsQuery = query(
      collection(db, "users", viewedUserId, "joinedRooms"),
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
        setRoomsLoading(false);
      },
      (error) => {
        console.error("error loading viewed user rooms:", error);
        setJoinedRooms([]);
        setRoomsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [viewedUserId]);

  useEffect(() => {
    if (!currentUser) {
      setLikedPostIds(new Set());
      setRepostedPostIds(new Set());
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "posts"),
      async (snapshot) => {
        try {
          const liked = new Set();
          const reposted = new Set();

          await Promise.all(
            snapshot.docs.map(async (postDoc) => {
              const likeRef = doc(db, "posts", postDoc.id, "likes", currentUser.uid);
              const repostRef = doc(db, "posts", postDoc.id, "reposts", currentUser.uid);

              const [likeSnap, repostSnap] = await Promise.all([
                getDoc(likeRef),
                getDoc(repostRef),
              ]);

              if (likeSnap.exists()) liked.add(postDoc.id);
              if (repostSnap.exists()) reposted.add(postDoc.id);
            })
          );

          setLikedPostIds(liked);
          setRepostedPostIds(reposted);
        } catch (error) {
          console.error("error loading current user actions:", error);
          setLikedPostIds(new Set());
          setRepostedPostIds(new Set());
        }
      },
      (error) => {
        console.error("error subscribing to current user actions:", error);
        setLikedPostIds(new Set());
        setRepostedPostIds(new Set());
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

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

  const isOwnProfile = currentUser?.uid === viewedUserId;
  const isFollowing = followers.some((f) => f.id === currentUser?.uid);

  const decoratePost = (post) => {
    const realId =
      post.originalPostId ||
      (String(post.id).startsWith("repost-")
        ? post.id.replace("repost-", "")
        : String(post.id).startsWith("favourite-")
        ? post.id.replace("favourite-", "")
        : post.id);

    return {
      ...post,
      likedByMe: likedPostIds.has(realId),
      repostedByMe: repostedPostIds.has(realId),
    };
  };

  const posts = useMemo(() => {
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
    return posts.filter(
      (post) =>
        post.imageUrl ||
        post.mediaUrl ||
        (Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0)
    );
  }, [posts]);

  const sortedFavouritePosts = useMemo(() => {
    return favouritePosts.map(decoratePost);
  }, [favouritePosts, likedPostIds, repostedPostIds]);

  const handleToggleFollow = async () => {
    if (!currentUser || !viewedUserId || isOwnProfile || followBusy) return;

    try {
      setFollowBusy(true);

      const followingRef = doc(db, "users", currentUser.uid, "following", viewedUserId);

      if (isFollowing) {
        await unfollowUser();
        await deleteDoc(followingRef);
      } else {
        await followUser();
        await setDoc(followingRef, {
          followedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error("error toggling follow:", error);
      alert("could not update follow right now");
    } finally {
      setFollowBusy(false);
    }
  };

  const handleToggleLike = async (post) => {
    if (!currentUser) {
      alert("you need to be logged in to like posts");
      return;
    }

    const realPostId =
      post.originalPostId ||
      (String(post.id).startsWith("repost-")
        ? post.id.replace("repost-", "")
        : String(post.id).startsWith("favourite-")
        ? post.id.replace("favourite-", "")
        : post.id);

    if (likeLoadingIds.includes(realPostId)) return;

    const likeRef = doc(db, "posts", realPostId, "likes", currentUser.uid);
    const postRef = doc(db, "posts", realPostId);

    try {
      setLikeLoadingIds((prev) => [...prev, realPostId]);

      if (post.likedByMe) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, { likeCount: increment(-1) });

        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(realPostId);
          return next;
        });
      } else {
        await setDoc(likeRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, { likeCount: increment(1) });

        setLikedPostIds((prev) => {
          const next = new Set(prev);
          next.add(realPostId);
          return next;
        });
      }

      const updateCounts = (item) => {
        const itemId =
          item.originalPostId ||
          (String(item.id).startsWith("repost-")
            ? item.id.replace("repost-", "")
            : String(item.id).startsWith("favourite-")
            ? item.id.replace("favourite-", "")
            : item.id);

        if (itemId !== realPostId) return item;

        return {
          ...item,
          likeCount: post.likedByMe
            ? Math.max((item.likeCount || 0) - 1, 0)
            : (item.likeCount || 0) + 1,
        };
      };

      setOwnPosts((prev) => prev.map(updateCounts));
      setRepostedPosts((prev) => prev.map(updateCounts));
      setFavouritePosts((prev) =>
        post.likedByMe
          ? prev.filter((item) => {
              const itemId =
                item.originalPostId ||
                (String(item.id).startsWith("favourite-")
                  ? item.id.replace("favourite-", "")
                  : item.id);
              return itemId !== realPostId;
            })
          : prev.map(updateCounts)
      );
    } catch (error) {
      console.error("error toggling like:", error);
      alert("could not update like right now");
    } finally {
      setLikeLoadingIds((prev) => prev.filter((id) => id !== realPostId));
    }
  };

  const handleToggleRepost = async (post) => {
    if (!currentUser) {
      alert("you need to be logged in to repost");
      return;
    }

    const realPostId =
      post.originalPostId ||
      (String(post.id).startsWith("repost-")
        ? post.id.replace("repost-", "")
        : String(post.id).startsWith("favourite-")
        ? post.id.replace("favourite-", "")
        : post.id);

    if (repostLoadingIds.includes(realPostId)) return;

    const repostRef = doc(db, "posts", realPostId, "reposts", currentUser.uid);
    const postRef = doc(db, "posts", realPostId);

    try {
      setRepostLoadingIds((prev) => [...prev, realPostId]);

      if (post.repostedByMe) {
        await deleteDoc(repostRef);
        await updateDoc(postRef, { repostCount: increment(-1) });

        setRepostedPostIds((prev) => {
          const next = new Set(prev);
          next.delete(realPostId);
          return next;
        });
      } else {
        await setDoc(repostRef, {
          userId: currentUser.uid,
          createdAt: serverTimestamp(),
        });

        await updateDoc(postRef, { repostCount: increment(1) });

        setRepostedPostIds((prev) => {
          const next = new Set(prev);
          next.add(realPostId);
          return next;
        });
      }

      const updateCounts = (item) => {
        const itemId =
          item.originalPostId ||
          (String(item.id).startsWith("repost-")
            ? item.id.replace("repost-", "")
            : String(item.id).startsWith("favourite-")
            ? item.id.replace("favourite-", "")
            : item.id);

        if (itemId !== realPostId) return item;

        return {
          ...item,
          repostCount: post.repostedByMe
            ? Math.max((item.repostCount || 0) - 1, 0)
            : (item.repostCount || 0) + 1,
        };
      };

      setOwnPosts((prev) => prev.map(updateCounts));
      setRepostedPosts((prev) => prev.map(updateCounts));
      setFavouritePosts((prev) => prev.map(updateCounts));
    } catch (error) {
      console.error("error toggling repost:", error);
      alert("could not update repost right now");
    } finally {
      setRepostLoadingIds((prev) => prev.filter((id) => id !== realPostId));
    }
  };

  if (!authReady || loading) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="empty-feed">
            <p>loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!viewedUserId || !profile) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="empty-feed">
            <p>user not found</p>
          </div>
        </div>
      </div>
    );
  }

  let postsToRender = [];
  let emptyText = "no posts yet";

  if (activeTab === "Posts") {
    postsToRender = posts;
    emptyText = "no posts yet";
  } else if (activeTab === "Media") {
    postsToRender = mediaPosts;
    emptyText = "no media yet";
  } else if (activeTab === "Favourites") {
    postsToRender = sortedFavouritePosts;
    emptyText = "no liked tweets yet";
  }

  return (
    <div className="profile-screen">
      <div className="profile-shell">
        <div
          ref={scrollRef}
          className="profile-feed-scroll"
        >
          <div className={collapsed ? "profile-header-wrap collapsed" : "profile-header-wrap"}>
            <UserProfileHeader
              profile={profile}
              isOwnProfile={isOwnProfile}
              followersCount={followers.length}
              followingCount={following.length}
              isFollowing={isFollowing}
              followBusy={followBusy}
              onToggleFollow={handleToggleFollow}
              onEditProfile={() => navigate("/edit-profile")}
              onGoBack={() => navigate(-1)}
            />
          </div>

          <UserProfileTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          <div className="profile-posts viewed-profile-posts">
            {activeTab === "Rooms" ? (
              roomsLoading ? (
                <div className="empty-feed">loading...</div>
              ) : joinedRooms.length ? (
                <div className="follow-list-card" style={{ padding: "6px 0 96px" }}>
                  {joinedRooms.map((room) => (
                    <div key={room.id} className="follow-user-row">
                      <div className="follow-user-avatar follow-user-avatar-fallback">
                        #
                      </div>

                      <div className="follow-user-meta">
                        <div className="follow-user-name">
                          {room.name || room.title || room.id}
                        </div>
                        <div className="follow-user-username">room</div>
                        {room.description ? (
                          <p className="follow-user-bio">{room.description}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-feed">no rooms yet</div>
              )
            ) : postsLoading ? (
              <div className="empty-feed">loading...</div>
            ) : postsToRender.length ? (
              postsToRender.map((post) => {
                const realId =
                  post.originalPostId ||
                  (String(post.id).startsWith("repost-")
                    ? post.id.replace("repost-", "")
                    : String(post.id).startsWith("favourite-")
                    ? post.id.replace("favourite-", "")
                    : post.id);

                return (
                  <UserProfilePostCard
                    key={post.id}
                    post={post}
                    fallbackProfile={profile}
                    onOpenPost={(postId) => navigate(`/post/${postId}`)}
                    onToggleLike={handleToggleLike}
                    onToggleRepost={handleToggleRepost}
                    likeLoading={likeLoadingIds.includes(realId)}
                    repostLoading={repostLoadingIds.includes(realId)}
                  />
                );
              })
            ) : (
              <div className="empty-feed">{emptyText}</div>
            )}
          </div>
        </div>

        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <Link
            to="/profile"
            className="nav-item active"
            aria-label="profile"
          >
            <FiUsers />
          </Link>

          <Link to="/messages" className="nav-item" aria-label="messages">
            <FiMessageCircle />
          </Link>

          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
              {hasUnreadNotifications ? <span className="nav-notification-dot" /> : null}
            </span>
          </Link>

          <Link to="/settings" className="nav-item" aria-label="settings">
            <FiSettings />
          </Link>

          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}