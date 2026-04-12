import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
} from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Replies() {
  const navigate = useNavigate();
  const { postId } = useParams();

  // store the logged in user + their profile
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  // used so the page knows when auth has finished checking
  const [authReady, setAuthReady] = useState(false);

  // used for the little unread dot on notifications
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // main post + all replies under it
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);

  // loading states for post and replies
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(true);

  // reply box state
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    // watch auth state so we know if user is logged in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      // if not logged in, send them to login
      if (!user) {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    // if no logged in user, clear the profile
    if (!currentUser) {
      setCurrentUserProfile(null);
      return;
    }

    // load current user's profile from firestore
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
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
    // if no user, there cannot be unread notifications
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }

    // check if the logged in user has any unread notifications
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

  useEffect(() => {
    // if there is no post id in the url, clear post state
    if (!postId) {
      setPost(null);
      setLoadingPost(false);
      return;
    }

    // listen to the main post in real time
    const unsubscribe = onSnapshot(
      doc(db, "posts", postId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setPost({
            id: snapshot.id,
            ...data,

            // turn firestore timestamps into normal js dates
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          });
        } else {
          setPost(null);
        }

        setLoadingPost(false);
      },
      (error) => {
        console.error("error loading post:", error);
        setPost(null);
        setLoadingPost(false);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  useEffect(() => {
    // if there is no post id, clear replies
    if (!postId) {
      setReplies([]);
      setLoadingReplies(false);
      return;
    }

    // get replies for this post, oldest to newest
    const repliesQuery = query(
      collection(db, "posts", postId, "replies"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      repliesQuery,
      (snapshot) => {
        const loadedReplies = snapshot.docs.map((replyDoc) => {
          const data = replyDoc.data();

          return {
            id: replyDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          };
        });

        setReplies(loadedReplies);
        setLoadingReplies(false);
      },
      (error) => {
        console.error("error loading replies:", error);
        setReplies([]);
        setLoadingReplies(false);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  const formatTimeAgo = (date) => {
    // make dates look short and social-media style
    if (!date) return "now";

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getProfileLink = (authorId) => {
    // if it is your own post, go to /profile
    // otherwise go to that user's profile page
    if (!currentUser) return `/profile/${authorId}`;
    return currentUser.uid === authorId ? "/profile" : `/profile/${authorId}`;
  };

  const extractTaggedUsernames = (text) => {
    // find all @username tags in the reply text
    const matches = text.match(/@([a-zA-Z0-9_]+)/g) || [];

    // remove duplicates + make usernames lowercase for matching
    return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
  };

  const handleReply = async () => {
    const trimmedReply = replyText.trim();

    // stop empty replies, missing user/profile/post, or double clicks
    if (!currentUser || !currentUserProfile || !postId || !trimmedReply || isReplying) {
      return;
    }

    try {
      setIsReplying(true);

      // add the reply into the replies subcollection for this post
      await addDoc(collection(db, "posts", postId, "replies"), {
        authorId: currentUser.uid,
        username: currentUserProfile.username || "",
        name: currentUserProfile.name || "",
        avatarUrl: currentUserProfile.avatarUrl || "",
        text: trimmedReply,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // increase the reply count on the main post
      await updateDoc(doc(db, "posts", postId), {
        replyCount: increment(1),
      });

      // if replying to someone else's post, send them a reply notification
      if (post?.authorId && post.authorId !== currentUser.uid) {
        const replyNotificationRef = doc(
          db,
          "users",
          post.authorId,
          "notifications",
          `reply_${postId}_${currentUser.uid}_${Date.now()}`
        );

        await setDoc(replyNotificationRef, {
          type: "reply",
          fromUserId: currentUser.uid,
          fromUsername: currentUserProfile.username || "",
          fromName: currentUserProfile.name || "",
          fromAvatarUrl: currentUserProfile.avatarUrl || "",
          postId,
          postText: post?.text || "",
          replyText: trimmedReply,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      // check if the reply tagged any usernames like @name
      const taggedUsernames = extractTaggedUsernames(trimmedReply);

      if (taggedUsernames.length > 0) {
        // find matching users in firestore using usernameLower
        const userSnapshots = await Promise.all(
          taggedUsernames.map((usernameLower) =>
            getDocs(
              query(
                collection(db, "users"),
                where("usernameLower", "==", usernameLower)
              )
            )
          )
        );

        const taggedUsers = userSnapshots
          .flatMap((snapshot) => snapshot.docs)
          .map((userDoc) => ({
            id: userDoc.id,
            ...userDoc.data(),
          }))
          // do not notify yourself
          .filter((user) => user.id !== currentUser.uid)
          // do not double notify the original post author if they already got a reply notification
          .filter((user) => user.id !== post?.authorId);

        // send a tag notification to each tagged user
        await Promise.all(
          taggedUsers.map((taggedUser) =>
            setDoc(
              doc(
                db,
                "users",
                taggedUser.id,
                "notifications",
                `tag_${postId}_${currentUser.uid}_${taggedUser.id}_${Date.now()}`
              ),
              {
                type: "tag",
                fromUserId: currentUser.uid,
                fromUsername: currentUserProfile.username || "",
                fromName: currentUserProfile.name || "",
                fromAvatarUrl: currentUserProfile.avatarUrl || "",
                postId,
                postText: post?.text || "",
                replyText: trimmedReply,
                read: false,
                createdAt: serverTimestamp(),
              }
            )
          )
        );
      }

      // clear the input after successful reply
      setReplyText("");
    } catch (error) {
      console.error("error creating reply:", error);
      alert("could not reply right now");
    } finally {
      setIsReplying(false);
    }
  };

  const renderMiniPost = (item, isMainPost = false) => {
    // work out where profile links should go
    const profileLink = getProfileLink(item.authorId);

    return (
      <article
        key={item.id}
        className={`profile-post-card ${isMainPost ? "reply-main-post" : ""}`}
      >
        <div className="profile-post-top">
          <Link to={profileLink} className="feed-user-link">
            {/* show avatar if there is one, otherwise show first letter fallback */}
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={item.name || item.username || "user"}
                className="profile-post-avatar"
              />
            ) : (
              <div className="profile-post-avatar profile-post-avatar-fallback">
                {(item.name || item.username || "y").charAt(0).toUpperCase()}
              </div>
            )}
          </Link>

          <div className="profile-post-meta">
            <div className="profile-post-name-row">
              <Link to={profileLink} className="feed-user-link">
                <span className="profile-post-name">{item.name || "user"}</span>
              </Link>

              <Link to={profileLink} className="feed-user-link">
                <span className="profile-post-username">
                  @{item.username || "unknown"}
                </span>
              </Link>

              <span className="profile-post-time">
                · {formatTimeAgo(item.createdAt)}
              </span>
            </div>

            {/* actual post / reply text */}
            <p className="profile-post-text">{item.text}</p>
          </div>
        </div>
      </article>
    );
  };

  // show loading while auth is still being checked
  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="profile-top-label">Replies</div>
          <div className="empty-feed">
            <p>loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-shell">
        <div className="profile-scroll">
          <div className="reply-header">
            {/* back button */}
            <button
              type="button"
              className="follow-back-btn"
              onClick={() => navigate(-1)}
              aria-label="go back"
            >
              <FiArrowLeft />
            </button>

            <div className="follow-list-title-wrap">
              <h1 className="follow-list-title">Replies</h1>
              <p className="follow-list-subtitle">join the conversation</p>
            </div>
          </div>

          {loadingPost ? (
            <div className="empty-feed">
              <p>loading post...</p>
            </div>
          ) : !post ? (
            <div className="empty-feed">
              <p>post not found</p>
            </div>
          ) : (
            <>
              {/* show the original post at the top */}
              <div className="reply-main-wrap">{renderMiniPost(post, true)}</div>

              {/* reply input box */}
              <div className="reply-composer">
                {currentUserProfile?.avatarUrl ? (
                  <img
                    src={currentUserProfile.avatarUrl}
                    alt={currentUserProfile.name || currentUserProfile.username || "user"}
                    className="composer-avatar composer-avatar-image"
                  />
                ) : (
                  <div className="composer-avatar">
                    {(currentUserProfile?.name ||
                      currentUserProfile?.username ||
                      currentUser?.email ||
                      "y")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="composer-main">
                  <input
                    type="text"
                    placeholder="post your reply"
                    value={replyText}
                    maxLength={280}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="composer-input"
                  />

                  <div className="composer-footer">
                    {/* live character count */}
                    <span className="composer-count">
                      {replyText.length}/280
                    </span>

                    <button
                      type="button"
                      className="post-btn"
                      disabled={!replyText.trim() || isReplying}
                      onClick={handleReply}
                    >
                      {isReplying ? "replying..." : "reply"}
                    </button>
                  </div>
                </div>
              </div>

              {/* replies list */}
              <div className="profile-posts">
                {loadingReplies ? (
                  <div className="empty-feed">
                    <p>loading replies...</p>
                  </div>
                ) : replies.length ? (
                  replies.map((reply) => renderMiniPost(reply))
                ) : (
                  <div className="empty-feed">
                    <p>no replies yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* bottom nav */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <Link to="/profile" className="nav-item" aria-label="profile">
            <FiUsers />
          </Link>

          <Link to="/messages" className="nav-item" aria-label="messages">
            <FiMessageCircle />
          </Link>

          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
              {hasUnreadNotifications && <span className="nav-notification-dot" />}
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