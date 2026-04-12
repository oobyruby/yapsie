import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import useFollowers from "../hooks/useFollowers";
import useFollowing from "../hooks/useFollowing";
import useAuthUser from "../hooks/useAuthUser";

// followers page
export default function FollowersPage() {
  const navigate = useNavigate();

  // get logged in user
  const { currentUser, authReady } = useAuthUser();
  const uid = currentUser?.uid;

  // get followers + following
  const { followers, loading } = useFollowers(uid, uid);
  const { following, follow, unfollow } = useFollowing(uid);

  // convert following to set for fast lookup
  const followingIds = new Set(following.map((user) => user.id));

  // wait for auth to load first
  if (!authReady) {
    return (
      <div className="profile-screen">
        <div className="profile-shell">
          <div className="follow-list-header">
            {/* back button */}
            <button className="follow-back-btn" onClick={() => navigate(-1)}>
              <FiArrowLeft />
            </button>

            {/* title */}
            <div className="follow-list-title-wrap">
              <h2 className="follow-list-title">Followers</h2>
              <p className="follow-list-subtitle">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <div className="profile-shell">
        <div className="follow-list-header">
          {/* back button */}
          <button className="follow-back-btn" onClick={() => navigate(-1)}>
            <FiArrowLeft />
          </button>

          {/* title + count */}
          <div className="follow-list-title-wrap">
            <h2 className="follow-list-title">Followers</h2>
            <p className="follow-list-subtitle">
              {loading
                ? "Loading..."
                : `${followers.length} follower${
                    followers.length === 1 ? "" : "s"
                  }`}
            </p>
          </div>
        </div>

        <div className="profile-feed-scroll">
          <div className="follow-list-card">
            {/* empty state */}
            {!loading && followers.length === 0 ? (
              <p className="empty-feed">You do not have any followers yet.</p>
            ) : (
              // map followers
              followers.map((user) => {
                const isFollowingBack = followingIds.has(user.id);

                return (
                  <div key={user.id} className="follow-user-row">
                    {/* user link */}
                    <Link
                      to={`/profile/${user.id}`}
                      className="follow-user-row"
                      style={{
                        flex: 1,
                        padding: 0,
                        background: "transparent",
                        border: "none",
                      }}
                    >
                      {/* avatar */}
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="follow-user-avatar"
                        />
                      ) : (
                        <div className="follow-user-avatar follow-user-avatar-fallback">
                          {(user.displayName || "u")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      {/* user info */}
                      <div className="follow-user-meta">
                        <div className="follow-user-name">
                          {user.displayName}
                        </div>

                        <div className="follow-user-username">
                          {user.username ? `@${user.username}` : "@user"}
                        </div>

                        {/* bio (optional) */}
                        {user.bio ? (
                          <p className="follow-user-bio">{user.bio}</p>
                        ) : null}
                      </div>
                    </Link>

                    {/* follow back button */}
                    {user.id !== uid && (
                      <button
                        className={`follow-inline-btn ${
                          isFollowingBack ? "following" : ""
                        }`}
                        onClick={() =>
                          isFollowingBack
                            ? unfollow(user.id)
                            : follow(user.id)
                        }
                      >
                        {isFollowingBack ? "Following" : "Follow back"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}