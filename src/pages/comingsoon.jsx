import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
} from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function ComingSoon() {
  const navigate = useNavigate();
  const location = useLocation();

  // logged in user + auth ready state
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // unread dot for notifications in bottom nav
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // work out if this page is being used for messages or settings
  const isMessagesPage = location.pathname === "/messages";

  // page title and subtitle change depending on route
  const pageTitle = isMessagesPage ? "Messages" : "Settings";
  const pageSubtitle = isMessagesPage
    ? "private chats are coming soon"
    : "settings are coming soon";

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
    // if no logged in user, there cannot be unread notifications
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }

    // watch unread notifications so the little dot updates live
    const unreadQuery = query(
      collection(db, "users", currentUser.uid, "notifications"),
      where("read", "==", false)
    );

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        setHasUnreadNotifications(snapshot.size > 0);
      },
      () => {
        setHasUnreadNotifications(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // loading screen while auth is still checking
  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="profile-top-label">{pageTitle}</div>
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
              {/* title and subtitle change depending on which page this is */}
              <h1 className="follow-list-title">{pageTitle}</h1>
              <p className="follow-list-subtitle">{pageSubtitle}</p>
            </div>
          </div>

          <div className="coming-soon-wrap">
            <div className="coming-soon-card">
              {/* show different icon depending on page */}
              <div className="coming-soon-icon">
                {isMessagesPage ? <FiMessageCircle /> : <FiSettings />}
              </div>

              <h2 className="coming-soon-title">coming soon</h2>

              {/* main message also changes depending on page */}
              <p className="coming-soon-text">
                {isMessagesPage
                  ? "yapsie messages are not live just yet, but they will be here soon."
                  : "the settings area is not live just yet, but it will be here soon."}
              </p>

              {/* button back to home */}
              <button
                type="button"
                className="coming-soon-btn"
                onClick={() => navigate("/home")}
              >
                back to home
              </button>
            </div>
          </div>
        </div>

        {/* bottom nav */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <Link to="/profile" className="nav-item" aria-label="profile">
            <FiUsers />
          </Link>

          {/* active state changes if this is the messages version of the page */}
          <Link
            to="/messages"
            className={`nav-item ${isMessagesPage ? "active" : ""}`}
            aria-label="messages"
          >
            <FiMessageCircle />
          </Link>

          {/* notifications icon with unread dot */}
          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
              {hasUnreadNotifications && <span className="nav-notification-dot" />}
            </span>
          </Link>

          {/* active state changes if this is the settings version of the page */}
          <Link
            to="/settings"
            className={`nav-item ${!isMessagesPage ? "active" : ""}`}
            aria-label="settings"
          >
            <FiSettings />
          </Link>

          {/* small app logo */}
          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}