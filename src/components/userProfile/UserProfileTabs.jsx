import React from "react";

export default function UserProfileTabs({ activeTab, setActiveTab }) {
  // tabs shown when viewing another user's profile
  const tabs = ["Posts", "Media", "Favourites", "Rooms"];

  return (
    <div className="profile-tabs">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={`profile-tab ${activeTab === tab ? "active" : ""}`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}