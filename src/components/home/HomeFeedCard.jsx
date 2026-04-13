import { Link } from "react-router-dom";
import { FiRepeat } from "react-icons/fi";
import { FaHeart, FaRegHeart, FaRegComment } from "react-icons/fa";
import { formatTimeAgo } from "../../utils/homeFormatters";

export default function HomeFeedCard({
  post,
  currentUser,
  cachedProfiles,
  likeLoadingIds,
  repostLoadingIds,
  onOpenReplies,
  onToggleLike,
  onToggleRepost,
  getProfileLink,
}) {
  // check if this is a temporary offline post
  const isTempPost = String(post.id).startsWith("temp-");

  // check if like or repost button is currently loading for this post
  const isLikeLoading = likeLoadingIds.includes(post.id);
  const isRepostLoading = repostLoadingIds.includes(post.id);

  // get correct profile link for this post author
  const profileLink = getProfileLink(post.authorId);

  // build small meta text like "2m ago · glasgow"
  const metaExtras = [formatTimeAgo(post.createdAt), post.locationLabel]
    .filter(Boolean)
    .join(" · ");

  // use cached profile info if fresh post data is missing anything
  const cachedAuthor = cachedProfiles[post.authorId] || {};
  const displayAvatarUrl = post.avatarUrl || cachedAuthor.avatarUrl || "";
  const displayName = post.name || cachedAuthor.name || "user";
  const displayUsername = post.username || cachedAuthor.username || "unknown";

  return (
    <article className="feed-card">
      <div className="feed-top">
        <Link to={profileLink} className="feed-user-link">
          {/* show avatar if there is one, otherwise fallback first letter */}
          {displayAvatarUrl ? (
            <img
              src={displayAvatarUrl}
              alt={displayName || displayUsername || "user"}
              className="feed-avatar"
            />
          ) : (
            <div className="feed-avatar feed-avatar-fallback">
              {(displayName || displayUsername || "y").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="feed-meta">
          <div className="feed-name-row">
            {/* display name links to profile */}
            <Link to={profileLink} className="feed-user-link">
              <span className="feed-name">{displayName}</span>
            </Link>

            {/* username also links to profile */}
            <Link to={profileLink} className="feed-user-link">
              <span className="feed-username">@{displayUsername}</span>
            </Link>

            {/* time ago and optional location */}
            <span className="feed-time">· {metaExtras}</span>

            {/* show little note if post was made offline and will send later */}
            {post.offline ? <span className="feed-time">· sending later</span> : null}
          </div>

          {/* main post text */}
          {post.text || post.editText ? (
            <div>
              <p className="feed-text">
                {post.edited && post.editText ? post.editText : post.text}
              </p>

              {post.edited ? (
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "11px",
                    color: "#8a8a8a",
                    lineHeight: "1.3",
                  }}
                >
                  edited
                </p>
              ) : null}
            </div>
          ) : null}

          {/* optional post image */}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt="post upload"
              className="feed-post-image"
            />
          ) : null}
        </div>
      </div>

      <div className="feed-actions">
        {/* replies button */}
        <button
          type="button"
          className="feed-action"
          onClick={() => !isTempPost && onOpenReplies(post.id)}
          disabled={isTempPost}
        >
          <FaRegComment />
          <span>{post.replyCount || 0}</span>
        </button>

        {/* repost button */}
        <button
          type="button"
          className={`feed-action repost ${post.repostedByMe ? "reposted" : ""}`}
          onClick={() => onToggleRepost(post.id, post.repostedByMe)}
          disabled={isRepostLoading || isTempPost}
        >
          <FiRepeat />
          <span>{post.repostCount || 0}</span>
        </button>

        {/* like button */}
        <button
          type="button"
          className={`feed-action like ${post.likedByMe ? "liked" : ""}`}
          onClick={() => onToggleLike(post.id, post.likedByMe)}
          disabled={isLikeLoading || isTempPost}
        >
          {post.likedByMe ? <FaHeart /> : <FaRegHeart />}
          <span>{post.likeCount || 0}</span>
        </button>
      </div>
    </article>
  );
}