import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiMessageCircle, FiSettings, FiBell } from "react-icons/fi";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";

export default function Settings() {
  const navigate = useNavigate();

  // keep unread dot working in nav
  const [currentUser, setCurrentUser] = useState(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);

      if (!user) {
        setHasUnreadNotifications(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

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

  const handleSignOut = async () => {
    if (signingOut) return;

    try {
      setSigningOut(true);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("error signing out:", error);
      alert("could not sign out right now");
      setSigningOut(false);
    }
  };

  return (
    <div className="profile-screen">
      <div className="profile-shell">
        <div className="profile-top-label"></div>

        <div className="profile-feed-scroll">
          <div className="settings-wrap">
            <div className="settings-card">
              <h1 className="settings-title">settings</h1>
              <p className="settings-text">
                more settings coming soon. ݁₊ ⊹ . ݁˖ . ݁
              </p>

              <div className="settings-actions">
                <button
                  type="button"
                  className="settings-btn"
                  onClick={() => navigate("/home")}
                >
                  back to home
                </button>

                <button
                  type="button"
                  className="settings-btn settings-signout-btn"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? "signing out..." : "sign out"}
                </button>
              </div>
            </div>
          </div>
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

          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
              {hasUnreadNotifications ? <span className="nav-notification-dot" /> : null}
            </span>
          </Link>

          <Link to="/settings" className="nav-item active" aria-label="settings">
            <FiSettings />
          </Link>

          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}