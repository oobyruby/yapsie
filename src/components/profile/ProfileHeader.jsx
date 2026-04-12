import { Link } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import { getProfileInitial } from "../../utils/profileFormatters";

export default function ProfileHeader({
  collapsed,
  profile,
  followersCount,
  followingCount,
  postCount,
  mediaCount,
  favouritesCount,
  onEditProfile,
}) {
  return (
    <div className={`profile-header-wrap ${collapsed ? "collapsed" : ""}`}>
      {/* banner image */}
      <div
        className="profile-banner"
        style={{
          backgroundImage: profile?.bannerUrl
            ? `url(${profile.bannerUrl})`
            : "none",
        }}
      >
        <button
          type="button"
          className="profile-edit-btn"
          onClick={onEditProfile}
          aria-label="edit profile"
        >
          <FiEdit2 />
        </button>
      </div>

      <div className="profile-header-card">
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.name || profile.username || "user"}
            className="profile-avatar"
          />
        ) : (
          <div className="profile-avatar profile-avatar-fallback">
            {getProfileInitial(profile)}
          </div>
        )}

        <h1 className="profile-name">{profile?.name || "user"}</h1>
        <p className="profile-username">
          @{profile?.username || "username"}
        </p>

        <p className="profile-bio">
          {profile?.bio || "say something about yourself"}
        </p>

        <div className="profile-follow-row">
          <Link to="/profile/followers" className="profile-follow-link">
            <span>{followersCount} followers</span>
          </Link>

          <Link to="/profile/following" className="profile-follow-link">
            <span>{followingCount} following</span>
          </Link>
        </div>

        <div className="profile-stats">
          <span>{postCount} posts</span>
          <span>{mediaCount} media</span>
          <span>{favouritesCount} favourites</span>
        </div>
      </div>
    </div>
  );
}