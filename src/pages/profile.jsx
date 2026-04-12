import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiMessageCircle, FiSettings, FiBell } from "react-icons/fi";

import useProfileData from "../hooks/useProfileData";
import useProfilePosts from "../hooks/useProfilePosts";
import useProfileDrafts from "../hooks/useProfileDrafts";

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

  const {
    currentUser,
    authReady,
    hasUnreadNotifications,
    profile,
    followersCount,
    followingCount,
  } = useProfileData(navigate);

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

  const { drafts, addDraft, deleteDraft, saveDrafts } = useProfileDrafts(currentUser);

  const [activeTab, setActiveTab] = useState("posts");

  const [postText, setPostText] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState("");
  const [saveToast, setSaveToast] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const [postLocationLabel, setPostLocationLabel] = useState("");
  const [postLocationCoords, setPostLocationCoords] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [editingPostId, setEditingPostId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [editLoadingId, setEditLoadingId] = useState("");

  const [deleteTargetPostId, setDeleteTargetPostId] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState("");

  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

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

  const showSaveToast = (message) => {
    setSaveToast(message);

    window.clearTimeout(window.yapsieSaveToastTimer);
    window.yapsieSaveToastTimer = window.setTimeout(() => {
      setSaveToast("");
    }, 2200);
  };

  const showOfflineBlockedToast = () => {
    showSaveToast("not possible in offline mode — please connect to internet");
  };

  const reverseGeocodeLocation = async (latitude, longitude) => {
    try {
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
    const trimmedText = postText.trim();

    if (!trimmedText) {
      alert("write something before saving a draft");
      return;
    }

    addDraft({
      text: trimmedText,
      locationLabel: postLocationLabel,
      locationCoords: postLocationCoords,
    });

    const draftToastMessage = selectedImage
      ? "draft saved — image not included"
      : "draft saved";

    setPostText("");
    clearSelectedImage();
    clearPostLocation();
    showSaveToast(draftToastMessage);
  };

  const handleUseDraft = (draft) => {
    setPostText(draft.text || "");
    setPostLocationLabel(draft.locationLabel || "");
    setPostLocationCoords(draft.locationCoords || null);
    clearSelectedImage();
    setActiveTab("posts");
  };

  const handlePostDraft = async (draft) => {
    if (!currentUser || !profile || isPosting) return;

    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    try {
      setIsPosting(true);

      await postDraft({ draft, profile });

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

    if (!currentUser || (!trimmedText && !selectedImage) || isPosting || !profile) return;

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

      await createPost({
        profile,
        postText,
        selectedImage,
        postLocationLabel,
        postLocationCoords,
      });

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
    if (post.authorId !== currentUser?.uid) return;
    if (post.isRepost || post.isFavourite) return;

    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    setEditingPostId(post.id);
    setEditingText(post.editText || "");
  };

  const closeEditModal = () => {
    if (editLoadingId) return;
    setEditingPostId("");
    setEditingText("");
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !editingPostId) return;

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
    if (!navigator.onLine) {
      showOfflineBlockedToast();
      return;
    }

    setDeleteTargetPostId(postId);
  };

  const closeDeleteModal = () => {
    if (deleteLoadingId) return;
    setDeleteTargetPostId("");
  };

  const handleDeletePost = async () => {
    if (!currentUser || !deleteTargetPostId) return;

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

  const postCount = posts.length;
  const mediaCount = mediaPosts.length;
  const favouritesCount = sortedFavouritePosts.length;

  const visiblePosts = useMemo(() => {
    if (activeTab === "media") return mediaPosts;
    if (activeTab === "favourites") return sortedFavouritePosts;
    if (activeTab === "rooms") return [];
    if (activeTab === "drafts") return [];
    return posts;
  }, [activeTab, mediaPosts, sortedFavouritePosts, posts]);

  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
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
        <div ref={scrollRef} className="profile-feed-scroll">
          <ProfileHeader
            collapsed={collapsed}
            profile={profile}
            followersCount={followersCount}
            followingCount={followingCount}
            postCount={postCount}
            mediaCount={mediaCount}
            favouritesCount={favouritesCount}
            onEditProfile={() => {
              if (!navigator.onLine) {
                showOfflineBlockedToast();
                return;
              }
              navigate("/edit-profile");
            }}
          />

          <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />

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

        {saveToast ? <div className="yapsie-toast">{saveToast}</div> : null}

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

        <EditPostModal
          editingPostId={editingPostId}
          editingText={editingText}
          setEditingText={setEditingText}
          editLoadingId={editLoadingId}
          onClose={closeEditModal}
          onSave={handleSaveEdit}
        />

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