// src/pages/following.jsx
import React from "react";
import useFollowing from "../hooks/useFollowing";

export default function FollowingPage({ uid }) {
  // custom hook to get users this profile is following
  const { following, follow, unfollow } = useFollowing(uid);

  return (
    <div>
      {/* page title */}
      <h2>Following</h2>

      {/* loop through all followed users */}
      {following.map((f) => (
        <div key={f.id}>
          {/* display username */}
          <span>{f.username}</span>

          {/* follow button (re-follow if previously unfollowed) */}
          <button onClick={() => follow(f.id)}>Follow</button>

          {/* unfollow button */}
          <button onClick={() => unfollow(f.id)}>Unfollow</button>
        </div>
      ))}
    </div>
  );
}