// src/components/userProfile/UserProfilePostCard.jsx
import React from "react";
import { FiMessageCircle, FiRepeat, FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

// formats timestamp into short social style time
function formatPostTime(date) {
  if (!date) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString();
}

export default function UserProfilePostCard({
  post,
  fallbackProfile,
  onOpenPost,
  onToggleLike,
  onToggleRepost,
  likeLoading,
  repostLoading,
}) {
  if (!post) return null;

  // fallback display values if post missing profile info
  const displayName = post.name || fallbackProfile?.name || "user";
  const displayUsername = post.username || fallbackProfile?.username || "user";
  const avatarSrc = post.avatarUrl || fallbackProfile?.avatarUrl || "";
  const initial = (displayName || "u").charAt(0).toUpperCase();

  // reposts show repost time instead of original post time
  const displayTime = post.isRepost ? post.repostedAt : post.createdAt;

  return (
    <article className="profile-post-card">
      {/* repost badge */}
      {post.isRepost ? (
        <div className="post-badge-row">
          <FiRepeat />
          <span>reposted</span>
        </div>
      ) : null}

      <div className="profile-post-top">
        {/* avatar */}
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={displayName}
            className="profile-post-avatar"
          />
        ) : (
          <div className="profile-post-avatar-fallback">{initial}</div>
        )}

        <div className="profile-post-meta">
          {/* name row */}
          <div className="profile-post-name-row">
            <span className="profile-post-name">{displayName}</span>
            <span className="profile-post-username">@{displayUsername}</span>
            <span className="profile-post-time">
              {formatPostTime(displayTime)}
            </span>
          </div>

          {/* post text */}
          {post.text ? (
            <p className="profile-post-text">{post.text}</p>
          ) : null}

          {/* image */}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt="post"
              className="profile-post-image"
            />
          ) : null}

          {/* actions */}
          <div className="viewed-profile-post-actions">
            {/* replies */}
            <button
              type="button"
              className="viewed-profile-post-action"
              onClick={() => onOpenPost(post.originalPostId || post.id)}
            >
              <FiMessageCircle />
              <span>{post.replyCount || 0}</span>
            </button>

            {/* repost */}
            <button
              type="button"
              className={`viewed-profile-post-action repost ${
                post.repostedByMe ? "reposted" : ""
              }`}
              onClick={() => onToggleRepost(post)}
              disabled={repostLoading}
            >
              <FiRepeat />
              <span>{post.repostCount || 0}</span>
            </button>

            {/* like */}
            <button
              type="button"
              className={`viewed-profile-post-action like ${
                post.likedByMe ? "liked" : ""
              }`}
              onClick={() => onToggleLike(post)}
              disabled={likeLoading}
            >
              {post.likedByMe ? <FaHeart /> : <FiHeart />}
              <span>{post.likeCount || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}