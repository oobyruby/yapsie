// src/pages/followers.jsx
import React from "react";
import useFollowers from "../hooks/useFollowers";

export default function FollowersPage({ uid, currentUserId }) {
  // custom hook to get followers + follow/unfollow functions
  const { followers, followUser, unfollowUser } = useFollowers(uid, currentUserId);

  return (
    <div>
      {/* page title */}
      <h2>Followers</h2>

      {/* loop through users that follow this profile */}
      {followers.map((f) => (
        <div key={f.id}>
          {/* display follower username */}
          <span>{f.username}</span>

          {/* follow button - lets you follow them back */}
          <button onClick={followUser}>Follow</button>

          {/* unfollow button - remove them if already followed */}
          <button onClick={unfollowUser}>Unfollow</button>
        </div>
      ))}
    </div>
  );
}