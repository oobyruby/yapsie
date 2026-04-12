export default function HomeRoomsRow({ rooms, onOpenRoom }) {
  return (
    <div className="rooms-row">
      {/* loop through available rooms */}
      {rooms.map((room) => (
        <button
          key={room.id}
          className="room-card"
          type="button"
          onClick={() => {
            // only open room if it actually has a path
            if (room.path) onOpenRoom(room.path);
          }}
          style={{
            // disable click feel if room isn't ready
            cursor: room.path ? "pointer" : "default",
            opacity: room.path ? 1 : 0.7,
          }}
        >
          {/* emoji / icon for the room */}
          <span className="room-icon">{room.icon}</span>

          {/* room name */}
          <span className="room-name">{room.name}</span>
        </button>
      ))}
    </div>
  );
}