import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiMessageCircle, FiSettings, FiBell } from "react-icons/fi";

// custom hooks for loading profile data, posts, and drafts
import useProfileData from "../hooks/useProfileData";
import useProfilePosts from "../hooks/useProfilePosts";
import useProfileDrafts from "../hooks/useProfileDrafts";

// profile page components
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileComposer from "../components/profile/ProfileComposer";
import ProfileTabs from "../components/profile/ProfileTabs";
import ProfilePostCard from "../components/profile/ProfilePostCard";
import ProfileRoomsTab from "../components/profile/ProfileRoomsTab";
import ProfileDraftsTab from "../components/profile/ProfileDraftsTab";
import EditPostModal from "../components/profile/EditPostModal";
import DeletePostModal from "../components/profile/DeletePostModal";

export default function Profile() {
  const navigate = useNavigate();

  // load basic profile page data
  const {
    currentUser,
    authReady,
    hasUnreadNotifications,
    profile,
    followersCount,
    followingCount,
  } = useProfileData(navigate);

  // load posts, rooms, likes, reposts, and post actions
  const {
    joinedRooms,
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
  } = useProfilePosts(currentUser);

  // load and manage local drafts
  const { drafts, addDraft, deleteDraft, saveDrafts } = useProfileDrafts(currentUser);

  // which tab is open right now
  const [activeTab, setActiveTab] = useState("posts");

  // composer state for writing a new post
  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // optional location state for a post
  const [postLocationLabel, setPostLocationLabel] = useState("");
  const [postLocationCoords, setPostLocationCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // edit modal state
  const [editingPostId, setEditingPostId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [editLoadingId, setEditLoadingId] = useState("");

  // delete modal state
  const [deleteTargetPostId, setDeleteTargetPostId] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  useEffect(() => {
    // clean up image preview urls when component unmounts
    // this stops unused preview urls building up in memory
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const showSaveToast = (message) => {
    // show a little message at the bottom for a short time
    setSaveToast(message);

    // reset the timer if another toast appears quickly after
    window.clearTimeout(window.yapsieSaveToastTimer);
    window.yapsieSaveToastTimer = window.setTimeout(() => {
      setSaveToast("");
    }, 2200);
  };

  const showOfflineBlockedToast = () => {
    // used when user tries to do something that needs internet
    showSaveToast("not possible in offline mode — please connect to internet");
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    try {
      // turn coords into a readable place name using nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
      );

      if (!response.ok) {
        throw new Error("could not look up location");
      }

      const data = await response.json();
      const address = data.address || {};

      // try a few possible location fields to get something useful
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
    // stop repeat clicks while location is already being fetched
    if (isGettingLocation) return;

    // check if browser supports geolocation
    if (!navigator.geolocation) {
      alert("geolocation is not supported in this browser");
      return;
    }

    try {
      setIsGettingLocation(true);

      // wrap browser geolocation in a promise so async/await works nicely
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // turn coords into a readable label for the post
      const label = await reverseGeocodeLocation(latitude, longitude);

      setPostLocationCoords({ lat: latitude, lng: longitude });
      setPostLocationLabel(label);
    } catch (error) {
      console.error("error getting current location:", error);

      // show a different message depending on what went wrong
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
    // remove location from the current post
    setPostLocationLabel("");
    setPostLocationCoords(null);
  };

  const clearSelectedImage = () => {
    // remove preview url before clearing image state
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    setSelectedImage(null);
    setSelectedImagePreview("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // only allow image files
    if (!file.type.startsWith("image/")) {
      alert("please choose an image file");
      return;
    }

    // keep image size under 5mb
    if (file.size > 5 * 1024 * 1024) {
      alert("image must be 5mb or less");
      return;
    }

    // clear old preview before making a new one
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }

    // create preview so user sees image straight away
    const previewUrl = URL.createObjectURL(file);
    setSelectedImage(file);
    setSelectedImagePreview(previewUrl);
  };

  const handleSaveDraft = () => {
    const trimmedText = postText.trim();

    // stop empty drafts being saved
    if (!trimmedText) {
      alert("write something before saving a draft");
      return;
    }

    // save text + location into drafts
    addDraft({
      text: trimmedText,
      locationLabel: postLocationLabel,
      locationCoords: postLocationCoords,
    });

    // images are not saved into drafts, so tell the user that if needed
    const draftToastMessage = selectedImage
      ? "draft saved — image not included"
      : "draft saved";

    // clear composer after saving draft
    setPostText("");
    clearSelectedImage();
    clearPostLocation();
    showSaveToast(draftToastMessage);
  };

  const handleUseDraft = (draft) => {
    // put a saved draft back into the composer
    setPostText(draft.text || "");
    setPostLocationLabel(draft.locationLabel || "");
    setPostLocationCoords(draft.locationCoords || null);
    clearSelectedImage();
    setActiveTab("posts");
  };

  const handlePostDraft = async (draft) => {
    // stop if user/profile missing or already posting
    if (!currentUser || !profile || isPosting) return;

    // posting drafts still needs internet
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    try {
      setIsPosting(true);

      // turn the saved draft into a real post
      await postDraft({ draft, profile });

      // remove it from drafts after posting
      saveDrafts(drafts.filter((item) => item.id !== draft.id));

      setPostText("");
      clearSelectedImage();
      clearPostLocation();
      setActiveTab("posts");
    } catch (error) {
      console.error("error posting draft:", error);
      alert(error.message || "could not post draft right now");
    } finally {
      setIsPosting(false);
    }
  };

  const handlePost = async () => {
    const trimmedText = postText.trim();

    // stop empty posts, missing user/profile, or double posting
    if (!currentUser || (!trimmedText && !selectedImage) || isPosting || !profile) return;

    // if offline, save text as draft instead
    if (!navigator.onLine) {
      addDraft({
        text: trimmedText,
        locationLabel: postLocationLabel,
        locationCoords: postLocationCoords,
      });

      setPostText("");
      clearSelectedImage();
      clearPostLocation();
      showSaveToast("you're offline — saved to drafts");
      return;
    }

    try {
      setIsPosting(true);

      // create the real post
      await createPost({
        profile,
        postText,
        selectedImage,
        postLocationLabel,
        postLocationCoords,
      });

      // clear composer after successful post
      setPostText("");
      clearSelectedImage();
      clearPostLocation();
      setActiveTab("posts");
    } catch (error) {
      console.error("error creating post:", error);
      alert(error.message || "could not post right now");
    } finally {
      setIsPosting(false);
    }
  };

  const startEditingPost = (post) => {
    // only let the owner edit their own normal posts
    if (post.authorId !== currentUser?.uid) return;
    if (post.isRepost || post.isFavourite) return;

    // editing is blocked offline
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    // open edit modal and fill it with current text
    setEditingPostId(post.id);
    setEditingText(post.editText || "");
  };

  const closeEditModal = () => {
    // stop closing while edit save is still happening
    if (editLoadingId) return;
    setEditingPostId("");
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingPostId) return;

    // editing needs internet
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    try {
      setEditLoadingId(editingPostId);
      await saveEdit(editingPostId, editingText);
      setEditingPostId("");
      setEditingText("");
    } catch (error) {
      console.error("error editing post:", error);
      alert(error.message || "could not edit post right now");
    } finally {
      setEditLoadingId("");
    }
  };

  const openDeleteModal = (postId) => {
    // deleting needs internet too
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    setDeleteTargetPostId(postId);
  };

  const closeDeleteModal = () => {
    // stop closing while delete is still running
    if (deleteLoadingId) return;
    setDeleteTargetPostId("");
  };

  const handleDeletePost = async () => {
    if (!currentUser || !deleteTargetPostId) return;

    // deleting is blocked offline
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    try {
      setDeleteLoadingId(deleteTargetPostId);
      await deletePostById(deleteTargetPostId);
      setDeleteTargetPostId("");
    } catch (error) {
      console.error("error deleting post:", error);
      alert(error.message || "could not delete post right now");
    } finally {
      setDeleteLoadingId("");
    }
  };

  // counts used in the profile header
  const postCount = posts.length;
  const mediaCount = mediaPosts.length;
  const favouritesCount = sortedFavouritePosts.length;

  const visiblePosts = useMemo(() => {
    // work out which list should show depending on active tab
    if (activeTab === "media") return mediaPosts;
    if (activeTab === "favourites") return sortedFavouritePosts;
    if (activeTab === "rooms") return [];
    if (activeTab === "drafts") return [];
    return posts;
  }, [activeTab, mediaPosts, sortedFavouritePosts, posts]);

  // loading screen while auth is still being checked
  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="profile-fixed">
            <div className="profile-top-label">User Profile</div>
          </div>

          <div className="profile-feed-scroll">
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
        <div className="profile-fixed">
          {/* top profile section with counts and edit button */}
          <ProfileHeader
            profile={profile}
            followersCount={followersCount}
            followingCount={followingCount}
            postCount={postCount}
            mediaCount={mediaCount}
            favouritesCount={favouritesCount}
            onEditProfile={() => {
              // block edit profile page if offline
              if (!navigator.onLine) {
                showOfflineBlockedToast();
                return;
              }
              navigate("/edit-profile");
            }}
          />

          {/* profile tabs like posts, media, rooms, drafts, favourites */}
          <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

          {/* composer for writing a new post on your profile */}
          <ProfileComposer
            postText={postText}
            setPostText={setPostText}
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
            canPost={!!(postText.trim() || selectedImage)}
          />
        </div>

        <div className="profile-feed-scroll">
          <div className="profile-posts profile-posts-scroll">
            {activeTab === "rooms" ? (
              <ProfileRoomsTab
                joinedRooms={joinedRooms}
                roomsLoading={roomsLoading}
                onOpenRoom={(roomId) => navigate(`/rooms/${roomId}`)}
              />
            ) : activeTab === "drafts" ? (
              <ProfileDraftsTab
                drafts={drafts}
                isPosting={isPosting}
                onUseDraft={handleUseDraft}
                onPostDraft={handlePostDraft}
                onDeleteDraft={deleteDraft}
              />
            ) : postsLoading ? (
              <div className="empty-feed">
                <p>loading posts...</p>
              </div>
            ) : visiblePosts.length ? (
              visiblePosts.map((post) => (
                <ProfilePostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  likeLoadingIds={likeLoadingIds}
                  repostLoadingIds={repostLoadingIds}
                  onOpenReplies={(postId) => navigate(`/post/${postId}`)}
                  onToggleLike={(postId, likedByMe) =>
                    handleToggleLike(postId, likedByMe, showOfflineBlockedToast)
                  }
                  onToggleRepost={(postId, repostedByMe) =>
                    handleToggleRepost(postId, repostedByMe, showOfflineBlockedToast)
                  }
                  onEditPost={startEditingPost}
                  onDeletePost={openDeleteModal}
                />
              ))
            ) : (
              <div className="empty-feed">
                <p>
                  {activeTab === "media"
                    ? "no media yet"
                    : activeTab === "favourites"
                    ? "no favourites yet"
                    : "no posts yet"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* little toast message for saves / offline messages */}
        {saveToast ? <div className="yapsie-toast">{saveToast}</div> : null}

        {/* bottom nav */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <button className="nav-item active" type="button" aria-label="profile">
            <FiUsers />
          </button>

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

        {/* modal for editing a post */}
        <EditPostModal
          editingPostId={editingPostId}
          editingText={editingText}
          setEditingText={setEditingText}
          editLoadingId={editLoadingId}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
        />

        {/* modal for deleting a post */}
        <DeletePostModal
          deleteTargetPostId={deleteTargetPostId}
          deleteLoadingId={deleteLoadingId}
          onClose={closeDeleteModal}
          onDelete={handleDeletePost}
        />
      </div>
    </div>
  );
}