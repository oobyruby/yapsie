import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

  // logged in user + auth ready state
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // unread dot for notifications in bottom nav
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

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
          <div className="profile-top-label">Messages</div>
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
        <div className="profile-feed-scroll">

          <div className="coming-soon-wrap">
            <div className="coming-soon-card">
              <div className="coming-soon-icon">
                <FiMessageCircle />
              </div>

              <h2 className="coming-soon-title">coming soon</h2>

              <p className="coming-soon-text">
                yapsie messages are not live just yet, but they will be here soon.
              </p>

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

          <Link to="/messages" className="nav-item active" aria-label="messages">
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