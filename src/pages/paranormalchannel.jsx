import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiHome,
  FiUsers,
  FiMessageCircle,
  FiSettings,
  FiBell,
  FiStar,
} from "react-icons/fi";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import useOfflineStatus from "../hooks/useOfflineStatus";
import useAuthUser from "../hooks/useAuthUser";
import useJoinedRoom from "../hooks/useJoinedRoom";

// fixed room id for this whole room section
const ROOM_ID = "paranormal";

// basic room info
const ROOM_DATA = {
  name: "paranormal",
  icon: "👻",
  description: "all things spooky, weird and unexplained",
};

// list of channels inside the paranormal room
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
    description: "tell your experiences",
  },
  {
    id: "questions",
    name: "questions",
    description: "ask anything",
  },
];

const formatTimeAgo = (date) => {
  // make time short and simple like chat apps usually do
  if (!date) return "now";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export default function ParanormalChannel() {
  const navigate = useNavigate();
  const { channelId } = useParams();

  // check if user is offline
  const isOffline = useOfflineStatus();

  // get logged in user info
  const { currentUser, authReady } = useAuthUser(navigate);

  // check if user has joined this room
  const { joinedRoom } = useJoinedRoom(currentUser, ROOM_ID);

  // store current user's profile data
  const [profile, setProfile] = useState(null);

  // all messages in the current channel
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // current message box text
  const [messageText, setMessageText] = useState("");

  // loading states for sending messages and joining room
  const [sendingMessage, setSendingMessage] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);

  // work out which channel we are on from the url
  // if channel id is weird or missing, just fall back to the first one
  const currentChannel =
    CHANNELS.find((channel) => channel.id === channelId) || CHANNELS[0];

  useEffect(() => {
    // if no logged in user, clear profile state
    if (!currentUser) {
      setProfile(null);
      return;
    }

    // load current user's profile in real time
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({
            id: snapshot.id,
            ...snapshot.data(),
          });
        } else {
          setProfile(null);
        }
      },
      (error) => {
        console.error("error loading user profile:", error);
        setProfile(null);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    // do nothing until auth is ready and we know which channel to load
    if (!authReady || !currentChannel?.id) return;

    setLoadingMessages(true);

    // load messages for this channel, oldest to newest
    const messagesQuery = query(
      collection(db, "rooms", ROOM_ID, "channels", currentChannel.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const loadedMessages = snapshot.docs.map((messageDoc) => {
          const data = messageDoc.data();

          return {
            id: messageDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          };
        });

        setMessages(loadedMessages);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("error loading room messages:", error);
        setMessages([]);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [authReady, currentChannel.id]);

  const ensureRoomAndChannel = async () => {
    // make sure the room exists in firestore
    await setDoc(
      doc(db, "rooms", ROOM_ID),
      {
        ...ROOM_DATA,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // make sure the current channel exists too
    await setDoc(
      doc(db, "rooms", ROOM_ID, "channels", currentChannel.id),
      {
        roomId: ROOM_ID,
        name: currentChannel.id,
        description: currentChannel.description,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const handleToggleJoinRoom = async () => {
    // stop if no user, already busy, or offline
    if (!currentUser || joiningRoom || isOffline) return;

    const joinedRoomRef = doc(db, "users", currentUser.uid, "joinedRooms", ROOM_ID);

    try {
      setJoiningRoom(true);

      if (joinedRoom) {
        // if already joined, remove room from user's joined rooms
        await deleteDoc(joinedRoomRef);
      } else {
        // if not joined, save room into user's joined rooms
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
      setJoiningRoom(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();

    // stop sending while offline
    if (isOffline) return;

    // stop empty messages, missing user/profile, or double clicks
    if (!currentUser || !profile || !trimmed || sendingMessage) return;

    try {
      setSendingMessage(true);

      // make sure room and channel docs exist before saving messages inside them
      await ensureRoomAndChannel();

      // add the new message into this channel's messages collection
      await addDoc(
        collection(db, "rooms", ROOM_ID, "channels", currentChannel.id, "messages"),
        {
          roomId: ROOM_ID,
          channelId: currentChannel.id,
          userId: currentUser.uid,
          username: profile.username || "",
          name: profile.name || "",
          avatarUrl: profile.avatarUrl || "",
          text: trimmed,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      // clear input after sending
      setMessageText("");
    } catch (error) {
      console.error("error sending room message:", error);
      alert(error.message || "could not send message right now");
    } finally {
      setSendingMessage(false);
    }
  };

  const renderAvatar = (message) => {
    // show avatar image if user has one
    if (message.avatarUrl) {
      return (
        <img
          src={message.avatarUrl}
          alt={message.name || message.username || "user"}
          style={{
            width: 42,
            height: 42,
            borderRadius: "999px",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      );
    }

    // otherwise show first letter fallback
    return (
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: "999px",
          background: "#f3b8cd",
          color: "#171717",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {(message.name || message.username || "y").charAt(0).toUpperCase()}
      </div>
    );
  };

  // loading screen while auth is still checking
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
            {/* back button to main paranormal room page */}
            <button
              type="button"
              onClick={() => navigate("/rooms/paranormal")}
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
              back to paranormal
            </button>
          </div>

          {/* show offline warning if internet is gone */}
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
              you're offline — posting unavailable
            </div>
          ) : null}

          <div
            style={{
              margin: "10px 12px 12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    minWidth: 0,
                  }}
                >
                  {/* room icon */}
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: "rgba(243, 184, 205, 0.12)",
                      border: "1px solid rgba(243, 184, 205, 0.18)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
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
                        fontSize: "26px",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {ROOM_DATA.name}
                    </div>

                    {/* current channel name */}
                    <div
                      style={{
                        color: "#a8a8a8",
                        fontSize: "13px",
                        marginTop: "5px",
                      }}
                    >
                      #{currentChannel.name}
                    </div>
                  </div>
                </div>

                {/* join / joined button */}
                <button
                  type="button"
                  onClick={handleToggleJoinRoom}
                  disabled={joiningRoom || isOffline}
                  style={{
                    marginLeft: "auto",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "8px 12px",
                    background: joinedRoom ? "#f3b8cd" : "rgba(255,255,255,0.05)",
                    color: joinedRoom ? "#171717" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: joiningRoom || isOffline ? "not-allowed" : "pointer",
                    opacity: joiningRoom || isOffline ? 0.6 : 1,
                    flexShrink: 0,
                  }}
                >
                  <FiStar size={14} />
                  {joiningRoom ? "..." : joinedRoom ? "joined" : "join"}
                </button>
              </div>

              {/* channel description */}
              <p
                style={{
                  margin: 0,
                  color: "#d9d9d9",
                  fontSize: "14px",
                  lineHeight: 1.5,
                }}
              >
                {currentChannel.description}
              </p>
            </div>

            <div
              style={{
                padding: "14px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {CHANNELS.map((channel) => {
                const isActive = channel.id === currentChannel.id;

                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => navigate(`/rooms/paranormal/${channel.id}`)}
                    style={{
                      border: "1px solid rgba(255,255,255,0.06)",
                      background: isActive ? "#f3b8cd" : "rgba(255,255,255,0.03)",
                      color: isActive ? "#171717" : "#fff",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "6px",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    {/* channel name */}
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        lineHeight: 1.2,
                      }}
                    >
                      #{channel.name}
                    </div>

                    {/* channel description */}
                    <div
                      style={{
                        fontSize: "11px",
                        lineHeight: 1.45,
                        opacity: 0.78,
                      }}
                    >
                      {channel.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              margin: "0 12px 12px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                maxHeight: "42vh",
                overflowY: "auto",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {loadingMessages ? (
                <div className="empty-feed">
                  <p>loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="empty-feed">
                  <p>no messages yet</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "flex-start",
                    }}
                  >
                    {renderAvatar(message)}

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          flexWrap: "wrap",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: "13px",
                          }}
                        >
                          {message.name || "user"}
                        </span>

                        <span
                          style={{
                            color: "#a8a8a8",
                            fontSize: "11px",
                          }}
                        >
                          @{message.username || "unknown"}
                        </span>

                        <span
                          style={{
                            color: "#8f8f8f",
                            fontSize: "11px",
                          }}
                        >
                          · {formatTimeAgo(message.createdAt)}
                        </span>
                      </div>

                      {/* actual message text */}
                      <p
                        style={{
                          margin: 0,
                          color: "#efefef",
                          fontSize: "13px",
                          lineHeight: 1.5,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {message.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(255,255,255,0.05)",
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-end",
                }}
              >
                {/* message input */}
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    isOffline ? "you're offline" : `message #${currentChannel.name}`
                  }
                  disabled={isOffline}
                  rows={2}
                  style={{
                    flex: 1,
                    resize: "none",
                    borderRadius: "16px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: isOffline
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    padding: "12px 14px",
                    fontSize: "13px",
                    outline: "none",
                    opacity: isOffline ? 0.65 : 1,
                  }}
                />

                {/* send button */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || isOffline || !messageText.trim()}
                  style={{
                    minWidth: "84px",
                    height: "42px",
                    borderRadius: "14px",
                    border: "none",
                    background:
                      sendingMessage || isOffline || !messageText.trim()
                        ? "rgba(255,255,255,0.10)"
                        : "#f3b8cd",
                    color:
                      sendingMessage || isOffline || !messageText.trim()
                        ? "#9f9f9f"
                        : "#171717",
                    fontWeight: 700,
                    cursor:
                      sendingMessage || isOffline || !messageText.trim()
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {sendingMessage ? "..." : "send"}
                </button>
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