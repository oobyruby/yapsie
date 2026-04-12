import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
} from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Notifications() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const hasMarkedInitialRead = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      if (!user) {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setLoading(false);
      hasMarkedInitialRead.current = false;
      return;
    }

    setLoading(true);
    hasMarkedInitialRead.current = false;

    const notificationsQuery = query(
      collection(db, "users", currentUser.uid, "notifications"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      async (snapshot) => {
        const loadedNotifications = snapshot.docs.map((notificationDoc) => {
          const data = notificationDoc.data();

          return {
            id: notificationDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          };
        });

        setNotifications(loadedNotifications);
        setLoading(false);

        if (!hasMarkedInitialRead.current) {
          hasMarkedInitialRead.current = true;

          const unreadDocs = snapshot.docs.filter(
            (notificationDoc) => notificationDoc.data().read === false
          );

          if (unreadDocs.length > 0) {
            try {
              const batch = writeBatch(db);

              unreadDocs.forEach((notificationDoc) => {
                batch.update(notificationDoc.ref, { read: true });
              });

              await batch.commit();
            } catch (error) {
              console.error("error marking initial notifications as read:", error);
            }
          }
        }
      },
      (error) => {
        console.error("error loading notifications:", error);
        setNotifications([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const hasUnreadNotifications = notifications.some(
    (notification) => notification.read === false
  );

  const formatTimeAgo = (date) => {
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

  const markAsRead = async (notificationId, alreadyRead = false) => {
    if (!currentUser || !notificationId || alreadyRead) return;

    try {
      await updateDoc(
        doc(db, "users", currentUser.uid, "notifications", notificationId),
        {
          read: true,
        }
      );
    } catch (error) {
      console.error("error marking notification as read:", error);
    }
  };

  const getNotificationMessage = (notification) => {
    if (notification.type === "reply") {
      return "replied to your post";
    }

    if (notification.type === "tag") {
      return "tagged you in a reply";
    }

    return "started following you";
  };

  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="profile-top-label">Notifications</div>

          <div className="profile-posts">
            <div className="empty-feed">
              <p>loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-shell">
        <div className="profile-top-label">Notifications</div>

        <div className="profile-posts notifications-list">
          {loading ? (
            <div className="empty-feed">
              <p>loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-feed">
              <p>no notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const profileLink =
                notification.fromUserId === currentUser?.uid
                  ? "/profile"
                  : `/profile/${notification.fromUserId}`;

              const actionLink =
                notification.type === "reply" || notification.type === "tag"
                  ? notification.postId
                    ? `/post/${notification.postId}`
                    : profileLink
                  : profileLink;

              return (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.read ? "read" : "unread"
                  }`}
                  onClick={() =>
                    markAsRead(notification.id, notification.read)
                  }
                >
                  <div className="notification-top">
                    <Link
                      to={profileLink}
                      className="feed-user-link"
                      onClick={() =>
                        markAsRead(notification.id, notification.read)
                      }
                    >
                      {notification.fromAvatarUrl ? (
                        <img
                          src={notification.fromAvatarUrl}
                          alt={
                            notification.fromName ||
                            notification.fromUsername ||
                            "user"
                          }
                          className="profile-post-avatar"
                        />
                      ) : (
                        <div className="profile-post-avatar profile-post-avatar-fallback">
                          {(
                            notification.fromName ||
                            notification.fromUsername ||
                            "y"
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}
                    </Link>

                    <div className="notification-content">
                      <div className="profile-post-name-row">
                        <Link
                          to={profileLink}
                          className="feed-user-link"
                          onClick={() =>
                            markAsRead(notification.id, notification.read)
                          }
                        >
                          <span className="profile-post-name">
                            {notification.fromName || "user"}
                          </span>
                        </Link>

                        <Link
                          to={profileLink}
                          className="feed-user-link"
                          onClick={() =>
                            markAsRead(notification.id, notification.read)
                          }
                        >
                          <span className="profile-post-username">
                            @{notification.fromUsername || "unknown"}
                          </span>
                        </Link>

                        <span className="profile-post-time">
                          · {formatTimeAgo(notification.createdAt)}
                        </span>
                      </div>

                      <p className="notification-text">
                        {getNotificationMessage(notification)}
                      </p>

                      {!!notification.replyText && (
                        <p className="notification-quote">
                          “{notification.replyText}”
                        </p>
                      )}

                      <div className="notification-actions">
                        <Link
                          to={actionLink}
                          className="notification-action-btn"
                          onClick={() =>
                            markAsRead(notification.id, notification.read)
                          }
                        >
                          {notification.type === "follow"
                            ? "view profile"
                            : "view post"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

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

          <Link
            to="/notifications"
            className="nav-item active"
            aria-label="notifications"
          >
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