export default function ProfileTabs({ activeTab, setActiveTab }) {
  return (
    <div className="profile-tabs">
      {/* posts tab */}
      <button
        type="button"
        className={`profile-tab ${activeTab === "posts" ? "active" : ""}`}
        onClick={() => setActiveTab("posts")}
      >
        Posts
      </button>

      {/* media tab */}
      <button
        type="button"
        className={`profile-tab ${activeTab === "media" ? "active" : ""}`}
        onClick={() => setActiveTab("media")}
      >
        Media
      </button>

      {/* favourites tab */}
      <button
        type="button"
        className={`profile-tab ${activeTab === "favourites" ? "active" : ""}`}
        onClick={() => setActiveTab("favourites")}
      >
        Favourites
      </button>

      {/* joined rooms tab */}
      <button
        type="button"
        className={`profile-tab ${activeTab === "rooms" ? "active" : ""}`}
        onClick={() => setActiveTab("rooms")}
      >
        Rooms
      </button>

      {/* drafts tab (localStorage offline drafts) */}
      <button
        type="button"
        className={`profile-tab ${activeTab === "drafts" ? "active" : ""}`}
        onClick={() => setActiveTab("drafts")}
      >
        Drafts
      </button>
    </div>
  );
}