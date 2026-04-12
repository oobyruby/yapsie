// src/components/userProfile/UserProfileHeader.jsx
import React from "react";
import { FiArrowLeft } from "react-icons/fi";

export default function UserProfileHeader({
  profile,
  isOwnProfile,
  followersCount,
  followingCount,
  isFollowing,
  followBusy,
  onToggleFollow,
  onEditProfile,
  onGoBack,
}) {
  if (!profile) return null;

  // avatar + banner setup
  const avatarSrc = profile.avatarUrl || "";
  const bannerStyle = profile.bannerUrl
    ? { backgroundImage: `url(${profile.bannerUrl})` }
    : {};

  const initial = (profile.name || profile.username || "u")
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* banner */}
      <div className="profile-banner viewed-profile-banner" style={bannerStyle}>
        {/* back button */}
        <button
          type="button"
          className="viewed-profile-back-btn"
          onClick={onGoBack}
          aria-label="go back"
        >
          <FiArrowLeft />
        </button>

        {/* edit button (only for own profile) */}
        {isOwnProfile ? (
          <button
            type="button"
            className="profile-edit-btn"
            onClick={onEditProfile}
            aria-label="edit profile"
          >
            edit
          </button>
        ) : null}
      </div>

      {/* profile card */}
      <div className="profile-header-card">
        {/* avatar */}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={profile.name || profile.username || "avatar"}
            className="profile-avatar"
          />
        ) : (
          <div className="profile-avatar-fallback">{initial}</div>
        )}

        {/* name + username */}
        <h1 className="profile-name">{profile.name || "user"}</h1>
        <p className="profile-username">@{profile.username || "user"}</p>

        {/* bio */}
        {profile.bio ? (
          <p className="profile-bio">{profile.bio}</p>
        ) : null}

        {/* follower stats */}
        <div className="profile-follow-row">
          <span>{followersCount} followers</span>
          <span>{followingCount} following</span>
        </div>

        {/* follow button (only when viewing someone else) */}
        {!isOwnProfile ? (
          <div className="profile-follow-btn-wrap">
            <button
              type="button"
              className={`profile-follow-btn ${
                isFollowing ? "following" : ""
              }`}
              onClick={onToggleFollow}
              disabled={followBusy}
            >
              {followBusy
                ? "please wait..."
                : isFollowing
                ? "following"
                : "follow"}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}