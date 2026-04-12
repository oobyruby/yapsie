import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
  FiHeart,
} from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import useOfflineStatus from "../hooks/useOfflineStatus";
import useAuthUser from "../hooks/useAuthUser";
import useJoinedRoom from "../hooks/useJoinedRoom";

// fixed room id for this room
const ROOM_ID = "paranormal";

// basic room info used when showing the room and saving it to firestore
const ROOM_DATA = {
  name: "paranormal",
  icon: "👻",
  description: "all things spooky, weird and unexplained",
};

// list of channels inside this room
const CHANNELS = [
  {
    id: "general",
    name: "general",
    description: "main discussion",
  },
  {
    id: "photos",
    name: "photos",
    description: "share spooky pics",
  },
  {
    id: "stories",
    name: "stories",
    description: "tell experiences",
  },
  {
    id: "questions",
    name: "questions",
    description: "ask anything",
  },
];

export default function ParanormalRoom() {
  const navigate = useNavigate();

  // check if user is offline
  const isOffline = useOfflineStatus();

  // get logged in user info
  const { currentUser, authReady } = useAuthUser(navigate);

  // check if this user has already joined the room
  const { joinedRoom: joined } = useJoinedRoom(currentUser, ROOM_ID);

  // loading state for join / unjoin button
  const [joinLoading, setJoinLoading] = useState(false);

  const handleToggleJoin = async () => {
    // stop if no user, button is busy, or app is offline
    if (!currentUser || joinLoading || isOffline) return;

    const joinedRoomRef = doc(db, "users", currentUser.uid, "joinedRooms", ROOM_ID);
    const roomRef = doc(db, "rooms", ROOM_ID);

    try {
      setJoinLoading(true);

      if (joined) {
        // if already joined, remove it from the user's joined rooms
        await deleteDoc(joinedRoomRef);
      } else {
        // make sure the room exists in the main rooms collection
        await setDoc(
          roomRef,
          {
            ...ROOM_DATA,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // save this room into the user's joined rooms
        await setDoc(joinedRoomRef, {
          roomId: ROOM_ID,
          ...ROOM_DATA,
          joinedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("error toggling joined room:", error);
      alert(error.message || "could not update room right now");
    } finally {
      setJoinLoading(false);
    }
  };

  // loading screen while auth is still being checked
  if (!authReady) {
    return (
      <div className="home-screen">
        <div className="home-shell">
          <div className="home-scroll">
            <div className="empty-feed">
              <p>loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-screen">
      <div className="home-shell">
        <div className="home-scroll">
          <div style={{ padding: "10px 12px 0" }}>
            {/* back button to go back home */}
            <button
              type="button"
              onClick={() => navigate("/home")}
              style={{
                border: "none",
                background: "transparent",
                color: "#d9d9d9",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 0",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <FiArrowLeft />
              back to home
            </button>
          </div>

          {/* show offline message if internet is gone */}
          {isOffline ? (
            <div
              style={{
                margin: "10px 12px 0",
                padding: "10px 12px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#e9e9e9",
                fontSize: "12px",
              }}
            >
              you're offline
            </div>
          ) : null}

          <div
            style={{
              margin: "10px 12px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "22px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  minWidth: 0,
                }}
              >
                {/* room icon */}
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "16px",
                    background: "rgba(243, 184, 205, 0.12)",
                    border: "1px solid rgba(243, 184, 205, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                    flexShrink: 0,
                  }}
                >
                  {ROOM_DATA.icon}
                </div>

                <div style={{ minWidth: 0 }}>
                  {/* room name */}
                  <div
                    style={{
                      color: "#fff",
                      fontSize: "30px",
                      fontWeight: 700,
                      lineHeight: 1,
                    }}
                  >
                    {ROOM_DATA.name}
                  </div>

                  {/* little subtitle under room name */}
                  <div
                    style={{
                      color: "#a8a8a8",
                      fontSize: "14px",
                      marginTop: "6px",
                    }}
                  >
                    spooky discussion hub
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "14px",
                }}
              >
                {/* join / joined button */}
                <button
                  type="button"
                  onClick={handleToggleJoin}
                  disabled={joinLoading || isOffline}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    background: joined ? "#f3b8cd" : "rgba(255,255,255,0.05)",
                    color: joined ? "#171717" : "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: joinLoading || isOffline ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "13px",
                    minWidth: "100px",
                    justifyContent: "center",
                    opacity: joinLoading || isOffline ? 0.55 : 1,
                  }}
                >
                  {joined ? <FaHeart size={14} /> : <FiHeart size={14} />}
                  {joinLoading ? "..." : joined ? "joined" : "join"}
                </button>
              </div>

              {/* room description */}
              <p
                style={{
                  margin: "14px 0 0 0",
                  color: "#d9d9d9",
                  fontSize: "14px",
                  lineHeight: 1.55,
                }}
              >
                {ROOM_DATA.description}. pick a channel and jump in.
              </p>
            </div>

            <div style={{ padding: "16px" }}>
              {/* channels heading */}
              <div
                style={{
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                channels
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                {CHANNELS.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => navigate(`/rooms/paranormal/${channel.id}`)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.03)",
                      color: "#fff",
                      borderRadius: "14px",
                      padding: "14px 14px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "6px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* channel name */}
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      #{channel.name}
                    </div>

                    {/* short channel description */}
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#b8b8b8",
                        lineHeight: 1.45,
                      }}
                    >
                      {channel.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* bottom nav */}
        <nav className="bottom-nav">
          <Link to="/home" className="nav-item" aria-label="home">
            <FiHome />
          </Link>

          <Link to="/profile" className="nav-item" aria-label="profile">
            <FiUsers />
          </Link>

          <Link to="/messages" className="nav-item" aria-label="messages">
            <FiMessageCircle />
          </Link>

          <Link to="/notifications" className="nav-item" aria-label="notifications">
            <span className="nav-icon-wrap">
              <FiBell />
            </span>
          </Link>

          <Link to="/settings" className="nav-item" aria-label="settings">
            <FiSettings />
          </Link>

          <div className="nav-logo">yapsie</div>
        </nav>
      </div>
    </div>
  );
}