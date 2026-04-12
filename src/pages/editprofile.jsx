import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
} from "react-icons/fi";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  collection,
  query,
  where,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { auth, db, storage } from "../firebase";

export default function EditProfile() {
  const navigate = useNavigate();

  // logged in user + page loading states
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // upload states for avatar and banner images
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // unread notification dot state
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  // profile form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");

  // refs let us trigger the hidden file inputs from buttons
  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  useEffect(() => {
    let unsubscribeUserDoc = null;

    // watch auth state so we know who is logged in
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      const userRef = doc(db, "users", user.uid);

      // listen to this user's profile doc in real time
      unsubscribeUserDoc = onSnapshot(
        userRef,
        async (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();

            // fill form with saved profile data
            setName(data.name || "");
            setUsername(data.username || "");
            setBio(data.bio || "");
            setAvatarUrl(data.avatarUrl || "");
            setBannerUrl(data.bannerUrl || "");
            setLoading(false);
            return;
          }

          try {
            // if user doc is somehow missing, make a fallback one
            const fallbackName =
              user.displayName?.trim() ||
              user.email?.split("@")[0] ||
              "user";

            const fallbackUsername =
              user.email?.split("@")[0]?.replace(/\s+/g, "").toLowerCase() ||
              `user${user.uid.slice(0, 6).toLowerCase()}`;

            await setDoc(
              userRef,
              {
                uid: user.uid,
                name: fallbackName,
                username: fallbackUsername,
                usernameLower: fallbackUsername.toLowerCase(),
                bio: "",
                avatarUrl: "",
                bannerUrl: "",
                email: user.email || "",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            // also fill the form with the fallback values
            setName(fallbackName);
            setUsername(fallbackUsername);
            setBio("");
            setAvatarUrl("");
            setBannerUrl("");
          } catch (error) {
            console.error("error creating missing user doc:", error);
            alert(error.message || "could not create profile right now");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("error subscribing to user doc:", error);
          alert(error.message || "could not load profile right now");
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [navigate]);

  useEffect(() => {
    // if no user, there cannot be unread notifications
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }

    // watch unread notifications for the little dot in nav
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

  const getStoragePathFromUrl = (url) => {
    try {
      // try get the storage file path back out of a download url
      if (!url || !url.includes("/o/")) return null;

      const encodedPath = url.split("/o/")[1]?.split("?")[0];
      if (!encodedPath) return null;

      return decodeURIComponent(encodedPath);
    } catch (error) {
      console.error("could not parse storage path:", error);
      return null;
    }
  };

  const tryDeleteOldStorageFile = async (url) => {
    try {
      // if there was an older image before, delete it from storage
      const oldPath = getStoragePathFromUrl(url);
      if (!oldPath) return;

      const oldRef = ref(storage, oldPath);
      await deleteObject(oldRef);
    } catch (error) {
      console.error("could not delete old image:", error);
    }
  };

  const uploadImage = async (file, type) => {
    if (!currentUser) return "";

    // keep type safe so only avatar or banner gets used
    const safeType = type === "banner" ? "banner" : "avatar";

    // build a file name and storage path for the upload
    const extension = file.name?.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${safeType}_${Date.now()}.${extension}`;
    const storagePath = `users/${currentUser.uid}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    // upload file to firebase storage
    await uploadBytes(storageRef, file);

    // return the public download url
    return getDownloadURL(storageRef);
  };

  const handlePickImage = async (event, type) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    // only allow image files
    if (!file.type.startsWith("image/")) {
      alert("please choose an image file");
      return;
    }

    try {
      // show loading state depending on which image is uploading
      if (type === "avatar") {
        setUploadingAvatar(true);
      } else {
        setUploadingBanner(true);
      }

      const previousUrl = type === "avatar" ? avatarUrl : bannerUrl;

      // upload new image and get its url
      const uploadedUrl = await uploadImage(file, type);

      // update local state straight away so ui updates fast
      if (type === "avatar") {
        setAvatarUrl(uploadedUrl);
      } else {
        setBannerUrl(uploadedUrl);
      }

      // save new image url into firestore
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          avatarUrl: type === "avatar" ? uploadedUrl : avatarUrl || "",
          bannerUrl: type === "banner" ? uploadedUrl : bannerUrl || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // try clean up the old image file from storage
      await tryDeleteOldStorageFile(previousUrl);
    } catch (error) {
      console.error(`error uploading ${type}:`, error);
      alert(error.message || `could not upload ${type} right now`);
    } finally {
      if (type === "avatar") {
        setUploadingAvatar(false);
      } else {
        setUploadingBanner(false);
      }

      // clear file input so same image can be chosen again later if needed
      event.target.value = "";
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // stop saving if no user or already busy
    if (!currentUser || saving) return;

    // clean values before saving
    const trimmedName = name.trim();
    const cleanedUsername = username.replace(/\s+/g, "").trim();
    const trimmedBio = bio.trim();

    // basic checks
    if (!trimmedName || !cleanedUsername) {
      alert("name and username are required");
      return;
    }

    if (cleanedUsername.length < 3) {
      alert("username must be at least 3 characters");
      return;
    }

    try {
      setSaving(true);

      // save profile changes into firestore
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          name: trimmedName,
          username: cleanedUsername,
          usernameLower: cleanedUsername.toLowerCase(),
          bio: trimmedBio,
          avatarUrl: avatarUrl || "",
          bannerUrl: bannerUrl || "",
          email: currentUser.email || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // go back to profile after saving
      navigate("/profile");
    } catch (error) {
      console.error("error saving profile:", error);
      alert(error.message || "could not save profile right now");
    } finally {
      setSaving(false);
    }
  };

  // first letter fallback if user has no avatar image
  const avatarInitial = (name || username || "y").charAt(0).toUpperCase();

  // loading screen while profile data is being fetched
  if (loading) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="profile-top-label">Edit Profile</div>
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
        <div className="profile-top-label"></div>

        <div className="profile-feed-scroll">
          <div
            className="edit-banner"
            style={{
              backgroundImage: bannerUrl ? `url(${bannerUrl})` : "none",
            }}
          >
            {/* back button */}
            <button
              type="button"
              className="edit-back-btn"
              onClick={() => navigate("/profile")}
              aria-label="go back"
            >
              <FiArrowLeft />
            </button>

            {/* button to pick a new banner image */}
            <button
              type="button"
              className="edit-image-btn"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
            >
              <FiCamera />
              {uploadingBanner ? "uploading..." : "edit banner"}
            </button>

            {/* hidden banner file input */}
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handlePickImage(e, "banner")}
              style={{ display: "none" }}
            />
          </div>

          <div className="edit-card">
            <div className="edit-avatar-wrap">
              {/* show avatar image if there is one, otherwise fallback letter */}
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="edit-avatar" />
              ) : (
                <div className="edit-avatar-fallback">{avatarInitial}</div>
              )}

              {/* button to pick a new avatar image */}
              <button
                type="button"
                className="edit-avatar-btn"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label="edit avatar"
              >
                <FiCamera />
              </button>

              {/* hidden avatar file input */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handlePickImage(e, "avatar")}
                style={{ display: "none" }}
              />
            </div>

            {/* edit profile form */}
            <form className="edit-form" onSubmit={handleSaveProfile}>
              <label htmlFor="edit-name">name</label>
              <input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="your display name"
                maxLength={40}
              />

              <label htmlFor="edit-username">username</label>
              <input
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                maxLength={24}
              />

              <label htmlFor="edit-bio">bio</label>
              <textarea
                id="edit-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="tell people a little about you"
                maxLength={160}
              />

              {/* save button */}
              <button
                type="submit"
                className="save-profile-btn"
                disabled={saving || uploadingAvatar || uploadingBanner}
              >
                {saving ? "saving..." : "save changes"}
              </button>
            </form>
          </div>
        </div>

        {/* bottom nav */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <Link to="/profile" className="nav-item active" aria-label="profile">
            <FiUsers />
          </Link>

          <Link to="/messages" className="nav-item" aria-label="messages">
            <FiMessageCircle />
          </Link>

          {/* notifications icon with unread dot */}
          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
              {hasUnreadNotifications ? <span className="nav-notification-dot" /> : null}
            </span>
          </Link>

          <Link to="/settings" className="nav-item" aria-label="settings">
            <FiSettings />
          </Link>

          {/* small app logo */}
          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}