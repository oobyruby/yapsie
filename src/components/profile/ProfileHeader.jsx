import { Link } from "react-router-dom";
import { FiEdit2 } from "react-icons/fi";
import { getProfileInitial } from "../../utils/profileFormatters";

export default function ProfileHeader({
  profile,
  followersCount,
  followingCount,
  postCount,
  mediaCount,
  favouritesCount,
  onEditProfile,
}) {
  return (
    <>
      
      {/* banner image */}
      <div
        className="profile-banner"
        style={{
          backgroundImage: profile?.bannerUrl ? `url(${profile.bannerUrl})` : "none",
        }}
      >
        {/* edit profile button */}
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
        {/* avatar image or fallback initial */}
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

        {/* name + username */}
        <h1 className="profile-name">{profile?.name || "user"}</h1>
        <p className="profile-username">@{profile?.username || "username"}</p>

        {/* bio */}
        <p className="profile-bio">
          {profile?.bio || "say something about yourself"}
        </p>

        {/* followers + following links */}
        <div className="profile-follow-row">
          <Link to="/profile/followers" className="profile-follow-link">
            <span>{followersCount} followers</span>
          </Link>

          <Link to="/profile/following" className="profile-follow-link">
            <span>{followingCount} following</span>
          </Link>
        </div>

        {/* profile stats */}
        <div className="profile-stats">
          <span>{postCount} posts</span>
          <span>{mediaCount} media</span>
          <span>{favouritesCount} favourites</span>
        </div>
      </div>
    </>
  );
}