import { Link } from "react-router-dom";
import { FiRepeat, FiEdit2, FiTrash2 } from "react-icons/fi";
import { FaHeart, FaRegHeart, FaRegComment } from "react-icons/fa";
import { formatTimeAgo } from "../../utils/profileFormatters";

export default function ProfilePostCard({
  post,
  currentUser,
  likeLoadingIds,
  repostLoadingIds,
  onOpenReplies,
  onToggleLike,
  onToggleRepost,
  onEditPost,
  onDeletePost,
}) {
  // figure out the real post id (handles repost + favourites)
  const realPostId =
    post.originalPostId ||
    (String(post.id).startsWith("repost-")
      ? post.id.replace("repost-", "")
      : String(post.id).startsWith("favourite-")
      ? post.id.replace("favourite-", "")
      : post.id);

  // loading states for like/repost buttons
  const isLikeLoading = likeLoadingIds.includes(realPostId);
  const isRepostLoading = repostLoadingIds.includes(realPostId);

  // choose correct time label depending on type
  const timeLabel = formatTimeAgo(
    post.isRepost ? post.repostedAt : post.isFavourite ? post.likedAt : post.createdAt
  );

  // combine time + optional location
  const metaExtras = [timeLabel, post.locationLabel].filter(Boolean).join(" · ");

  // only allow edit/delete if this is user's own original post
  const isOwnOriginalPost =
    currentUser &&
    post.authorId === currentUser.uid &&
    !post.isRepost &&
    !post.isFavourite;

  // send user to their own profile or another user's profile
  const profileLink =
    post.authorId && currentUser?.uid === post.authorId
      ? "/profile"
      : post.authorId
      ? `/profile/${post.authorId}`
      : "/profile";

  return (
    <article className="profile-post-card">
      {/* repost badge */}
      {post.isRepost ? (
        <div className="post-badge-row">
          <FiRepeat />
          <span>you reposted this</span>
        </div>
      ) : null}

      {/* favourite badge */}
      {post.isFavourite ? (
        <div className="post-badge-row">
          <FaHeart />
          <span>you favourited this</span>
        </div>
      ) : null}

      <div className="profile-post-top">
        {/* avatar now links to correct profile */}
        <Link to={profileLink} className="feed-user-link" aria-label="open profile">
          {post.avatarUrl ? (
            <img
              src={post.avatarUrl}
              alt={post.name || post.username || "user"}
              className="profile-post-avatar"
            />
          ) : (
            <div className="profile-post-avatar profile-post-avatar-fallback">
              {(post.name || post.username || "y").charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="profile-post-meta">
          <div
            className="profile-post-name-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: "100%",
            }}
          >
            {/* name + username now link to correct profile */}
            <Link
              to={profileLink}
              className="feed-user-link"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                minWidth: 0,
                flexWrap: "wrap",
              }}
              aria-label="open profile"
            >
              <span className="profile-post-name">{post.name || "user"}</span>
              <span className="profile-post-username">
                @{post.username || "unknown"}
              </span>
            </Link>

            {/* time + location */}
            <span className="profile-post-time">· {metaExtras}</span>

            {/* edit/delete only for own posts */}
            {isOwnOriginalPost ? (
              <div
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  paddingLeft: "8px",
                  flexShrink: 0,
                }}
              >
                {/* edit button */}
                <button
                  type="button"
                  onClick={() => onEditPost(post)}
                  aria-label="edit post"
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    color: "#a9a9a9",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <FiEdit2 size={11} />
                </button>

                {/* delete button */}
                <button
                  type="button"
                  onClick={() => onDeletePost(post.id)}
                  aria-label="delete post"
                  style={{
                    width: "18px",
                    height: "18px",
                    border: "none",
                    background: "transparent",
                    color: "#a9a9a9",
                    padding: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <FiTrash2 size={11} />
                </button>
              </div>
            ) : null}
          </div>

          {/* main text */}
          <p className="profile-post-text">
          {post.edited && post.editText ? post.editText : post.text}
          </p>

          {/* edited label */}
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

          {/* image */}
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt="post upload"
              className="profile-post-image"
            />
          ) : null}
        </div>
      </div>

      {/* action buttons */}
      <div className="profile-post-actions">
        {/* replies */}
        <button
          type="button"
          className="profile-post-action"
          onClick={() => onOpenReplies(realPostId)}
        >
          <FaRegComment />
          <span>{post.replyCount || 0}</span>
        </button>

        {/* repost */}
        <button
          type="button"
          className={`profile-post-action repost ${
            post.repostedByMe ? "reposted" : ""
          }`}
          onClick={() => onToggleRepost(post.id, post.repostedByMe)}
          disabled={isRepostLoading}
        >
          <FiRepeat />
          <span>{post.repostCount || 0}</span>
        </button>

        {/* like */}
        <button
          type="button"
          className={`profile-post-action like ${
            post.likedByMe ? "liked" : ""
          }`}
          onClick={() => onToggleLike(post.id, post.likedByMe)}
          disabled={isLikeLoading}
        >
          {post.likedByMe ? <FaHeart /> : <FaRegHeart />}
          <span>{post.likeCount || 0}</span>
        </button>
      </div>
    </article>
  );
}