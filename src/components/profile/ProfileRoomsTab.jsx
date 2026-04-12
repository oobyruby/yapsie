export default function ProfileRoomsTab({ joinedRooms, roomsLoading, onOpenRoom }) {
  // show loading state while rooms are being fetched
  if (roomsLoading) {
    return (
      <div className="empty-feed">
        <p>loading rooms...</p>
      </div>
    );
  }

  // show empty state if user has not joined any rooms
  if (!joinedRooms.length) {
    return (
      <div className="empty-feed">
        <p>no rooms joined yet</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
      }}
    >
      {/* loop through joined rooms */}
      {joinedRooms.map((room) => (
        <button
          key={room.roomId || room.id}
          type="button"
          onClick={() => onOpenRoom(room.roomId || room.id)}
          style={{
            width: "100%",
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.03)",
            borderRadius: "16px",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {/* room icon */}
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: "rgba(243, 184, 205, 0.12)",
              border: "1px solid rgba(243, 184, 205, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              flexShrink: 0,
            }}
          >
            {room.icon || "💬"}
          </div>

          <div style={{ minWidth: 0 }}>
            {/* room name */}
            <div
              style={{
                color: "#fff",
                fontSize: "17px",
                fontWeight: 700,
                lineHeight: 1.2,
                marginBottom: "4px",
              }}
            >
              {room.name || room.roomId || "room"}
            </div>

            {/* room description */}
            <div
              style={{
                color: "#a8a8a8",
                fontSize: "12px",
                lineHeight: 1.45,
              }}
            >
              {room.description || "joined room"}
            </div>
          </div>

          {/* little arrow on the right */}
          <div
            style={{
              marginLeft: "auto",
              color: "#d8d8d8",
              fontSize: "20px",
              lineHeight: 1,
            }}
          >
            ›
          </div>
        </button>
      ))}
    </div>
  );
}