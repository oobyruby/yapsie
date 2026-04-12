import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiMessageCircle, FiSettings, FiBell } from "react-icons/fi";

//custom hooks for loading home page data, feed behaviour and draft handling 
import useHomeData from "../hooks/useHomeData";
import useHomeFeed from "../hooks/useHomeFeed";
import useHomeDrafts from "../hooks/useHomeDrafts";

//reusable home page ui components 
import HomeRoomsRow from "../components/home/HomeRoomsRow";
import HomeComposer from "../components/home/HomeComposer";
import HomeFeedCard from "../components/home/HomeFeedCard";

export default function Home() {
  const navigate = useNavigate();

  //state for the current post the user is writing
  const [postText, setPostText] = useState("");

//state for image upload & preview
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");

  //state for optional location that is attached to post
  const [postLocationLabel, setPostLocationLabel] = useState("");
  const [postLocationCoords, setPostLocationCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  //state for temporary save / offline toast messages 
  const [saveToast, setSaveToast] = useState("");

  //state to stop duplicate posting while one is being posted 
  const [isPosting, setIsPosting] = useState(false);

  //loads general home page data such as: logged in user, their profile, unread notification state
  //cached avatar and joined/visible rooms
  const {
    currentUser,
    currentUserProfile,
    authReady,
    hasUnreadNotifications,
    cachedOwnAvatar,
    rooms,
  } = useHomeData(navigate);

  //loads feed posts & provides actions for likes, reposts, and creationg a post
  const {
    posts,
    likeLoadingIds,
    repostLoadingIds,
    handleToggleLike,
    handleToggleRepost,
    createPost,
    readCachedProfiles,
  } = useHomeFeed(currentUser, authReady, (message) => showSaveToast(message));

  //hook for saving drafts locally 
  const { saveDraft } = useHomeDrafts(currentUser);

  useEffect(() => {
    if (!currentUser) return;

    try {
      //load user locally stored drafts from localstorage
      const savedDrafts = localStorage.getItem(`yapsieDrafts_${currentUser.uid}`);
      const parsedDrafts = savedDrafts ? JSON.parse(savedDrafts) : [];
      
      //if drafts are there, restore the most recently updated one
      if (Array.isArray(parsedDrafts) && parsedDrafts.length > 0) {
        const latestDraft = [...parsedDrafts].sort(
          (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)
        )[0];
        
        //only restore the draft if the composer is currently empty 
        if (latestDraft?.text && !postText.trim() && !postLocationLabel) {
          setPostText(latestDraft.text || "");
          setPostLocationLabel(latestDraft.locationLabel || "");
          setPostLocationCoords(latestDraft.locationCoords || null);
        }
      }
    } catch (error) {
      console.error("error loading home drafts:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    //clean up preview object urls when component unmounts 
    //helps avoid memory leaks in browser
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const showSaveToast = (message) => {
    //show temp toast msg to user
    setSaveToast(message);

    //clear previous timer so toast timing resets properly 
    window.clearTimeout(window.yapsieSaveToastTimer);
    window.yapsieSaveToastTimer = window.setTimeout(() => {
      setSaveToast("");
    }, 2200);
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    try {
      //convert latitude and longitude into a readable place name
      //uses openstreetmap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        throw new Error("could not look up location");
      }

      const data = await response.json();
      const address = data.address || {};

      const town =
        address.city ||
        address.town ||
        address.village ||
        address.hamlet ||
        address.county ||
        "";
      const country = address.country || "";

      const label = [town, country].filter(Boolean).join(", ");
      return label || "current location";
    } catch (error) {
      console.error("error reverse geocoding location:", error);
      return "current location";
    }
  };

  const handleAddLocation = async () => {
    if (isGettingLocation) return;

    if (!navigator.geolocation) {
      alert("geolocation is not supported in this browser");
      return;
    }

    try {
      setIsGettingLocation(true);

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const label = await reverseGeocodeLocation(latitude, longitude);

      setPostLocationCoords({ lat: latitude, lng: longitude });
      setPostLocationLabel(label);
    } catch (error) {
      console.error("error getting current location:", error);

      if (error.code === 1) {
        alert("location permission was denied");
      } else if (error.code === 2) {
        alert("your location could not be found");
      } else if (error.code === 3) {
        alert("location request timed out");
      } else {
        alert("could not get your location right now");
      }
    } finally {
      setIsGettingLocation(false);
    }
  };

  const clearPostLocation = () => {
    setPostLocationLabel("");
    setPostLocationCoords(null);
  };

  const clearSelectedImage = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImage(null);
    setSelectedImagePreview("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("please choose an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("image must be 5mb or less");
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedImage(file);
    setSelectedImagePreview(previewUrl);
  };

  const handleSaveDraft = () => {
    saveDraft({
      postText,
      selectedImage,
      postLocationLabel,
      postLocationCoords,
      clearSelectedImage,
      clearPostLocation,
      setPostText,
      showSaveToast,
    });
  };

  const handlePost = async () => {
    const trimmedText = postText.trim();

    if (!currentUser || (!trimmedText && !selectedImage) || isPosting || !currentUserProfile) {
      return;
    }

    if (!navigator.onLine) {
      saveDraft({
        postText,
        selectedImage,
        postLocationLabel,
        postLocationCoords,
        clearSelectedImage,
        clearPostLocation,
        setPostText,
        showSaveToast: (message) =>
          showSaveToast(message === "draft saved" ? "you're offline — saved to drafts" : message),
      });
      return;
    }

    try {
      setIsPosting(true);

      await createPost({
        currentUser,
        currentUserProfile,
        postText,
        selectedImage,
        postLocationLabel,
        postLocationCoords,
      });

      setPostText("");
      clearSelectedImage();
      clearPostLocation();
    } catch (error) {
      console.error(error);
    } finally {
      setIsPosting(false);
    }
  };

  const maxCharacters = 280;
  const characterCount = postText.length;

  const getProfileLink = (authorId) => {
    if (!currentUser) return `/profile/${authorId}`;
    return currentUser.uid === authorId ? "/profile" : `/profile/${authorId}`;
  };

  const composerInitial = (
    currentUserProfile?.name ||
    currentUserProfile?.username ||
    currentUser?.email ||
    "y"
  )
    .charAt(0)
    .toUpperCase();

  const ownComposerAvatarSrc = cachedOwnAvatar || currentUserProfile?.avatarUrl || "";

  if (!authReady) {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-scroll">
            <div className="empty-feed">
              <p>loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

    // cached profiles help posts show names + avatars instantly
  // this avoids blank user info while fresh data is still loading
  const cachedProfiles = currentUser ? readCachedProfiles(currentUser.uid) : {};

  return (
    <div className="home-screen">
      <div className="home-shell">
        <div className="home-scroll">
          {/* top row showing rooms the user can open or has joined */}
          <HomeRoomsRow
            rooms={rooms}
            onOpenRoom={(path) => navigate(path)}
          />

          {/* post composer - text, image, location, drafts, and post button */}
          <HomeComposer
            ownComposerAvatarSrc={ownComposerAvatarSrc}
            currentUserProfile={currentUserProfile}
            composerInitial={composerInitial}
            postText={postText}
            setPostText={setPostText}
            maxCharacters={maxCharacters}
            characterCount={characterCount}
            selectedImagePreview={selectedImagePreview}
            onImageChange={handleImageChange}
            onClearSelectedImage={clearSelectedImage}
            postLocationLabel={postLocationLabel}
            onClearPostLocation={clearPostLocation}
            onAddLocation={handleAddLocation}
            isGettingLocation={isGettingLocation}
            onSaveDraft={handleSaveDraft}
            onPost={handlePost}
            isPosting={isPosting}
            selectedImage={selectedImage}
          />

          {/* main home feed showing all posts */}
          <div className="feed-list">
            {posts.map((post) => (
              <HomeFeedCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                cachedProfiles={cachedProfiles}
                likeLoadingIds={likeLoadingIds}
                repostLoadingIds={repostLoadingIds}
                onOpenReplies={(postId) => navigate(`/post/${postId}`)}
                onToggleLike={handleToggleLike}
                onToggleRepost={handleToggleRepost}
                getProfileLink={getProfileLink}
              />
            ))}
          </div>
        </div>

        {/* floating toast for draft saved / offline saved messages */}
        {saveToast ? <div className="yapsie-toast">{saveToast}</div> : null}

        {/* bottom navigation bar for main app pages */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item active" aria-label="home">
            <FiHome />
          </Link>

          <Link to="/profile" className="nav-item" aria-label="profile">
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

          {/* small app logo in nav */}
          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}