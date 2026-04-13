import { Link } from "react-router-dom";
import { FiMessageCircle, FiRepeat, FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";

// turn a date into short time like now, 5m, 2h, 3d
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

  // use post info first, then fall back to profile info if needed
  const displayName = post.name || fallbackProfile?.name || "user";
  const displayUsername = post.username || fallbackProfile?.username || "user";
  const avatarSrc = post.avatarUrl || fallbackProfile?.avatarUrl || "";
  const initial = (displayName || "u").charAt(0).toUpperCase();

  // if it is a repost, show repost time instead
  const displayTime = post.isRepost ? post.repostedAt : post.createdAt;

  // make sure clicking name or avatar goes to the right profile
  const profileLink = post.authorId ? `/profile/${post.authorId}` : "/profile";

  return (
    <article className="profile-post-card">
      {/* show small repost label above the post */}
      {post.isRepost ? (
        <div className="post-badge-row">
          <FiRepeat />
          <span>reposted</span>
        </div>
      ) : null}

      <div className="profile-post-top">
        {/* avatar on the left */}
        <Link
          to={profileLink}
          className="feed-user-link"
          aria-label="open profile"
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={displayName}
              className="profile-post-avatar"
            />
          ) : (
            <div className="profile-post-avatar-fallback">{initial}</div>
          )}
        </Link>

        <div className="profile-post-meta">
          {/* name, @username and time */}
          <Link
            to={profileLink}
            className="feed-user-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              flexWrap: "wrap",
            }}
            aria-label="open profile"
          >
            <div className="profile-post-name-row">
              <span className="profile-post-name">{displayName}</span>
              <span className="profile-post-username">@{displayUsername}</span>
              <span className="profile-post-time">
                {formatPostTime(displayTime)}
              </span>
            </div>
          </Link>

          {/* post text */}
          {post.text || post.editText ? (
            <p className="profile-post-text">
              {post.edited && post.editText ? post.editText : post.text}
            </p>
          ) : null}

          {/* single uploaded image */}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt="post"
              className="profile-post-image"
            />
          ) : null}

          {/* if a post has more than one image, show them in a grid */}
          {Array.isArray(post.mediaUrls) && post.mediaUrls.length > 0 ? (
            <div className="profile-post-image-grid">
              {post.mediaUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt="post"
                  className="profile-post-image"
                />
              ))}
            </div>
          ) : null}

          {/* small edited label under the text */}
          {post.edited ? (
            <span
              style={{
                fontSize: "11px",
                color: "#8a8a8a",
                marginTop: "4px",
                display: "inline-block",
              }}
            >
              edited
            </span>
          ) : null}
        </div>
      </div>

      {/* post action buttons */}
      <div className="profile-post-actions">
        {/* replies */}
        <button
          type="button"
          className="profile-post-action"
          onClick={() => onOpenPost(post.originalPostId || post.id)}
        >
          <FiMessageCircle />
          <span>{post.replyCount || 0}</span>
        </button>

        {/* repost button */}
        <button
          type="button"
          className={`profile-post-action repost ${
            post.repostedByMe ? "reposted" : ""
          }`}
          onClick={() => onToggleRepost(post)}
          disabled={repostLoading}
        >
          <FiRepeat />
          <span>{post.repostCount || 0}</span>
        </button>

        {/* like button */}
        <button
          type="button"
          className={`profile-post-action like ${
            post.likedByMe ? "liked" : ""
          }`}
          onClick={() => onToggleLike(post)}
          disabled={likeLoading}
        >
          {post.likedByMe ? <FaHeart /> : <FiHeart />}
          <span>{post.likeCount || 0}</span>
        </button>
      </div>
    </article>
  );
}