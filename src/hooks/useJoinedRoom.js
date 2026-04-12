import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function useJoinedRoom(currentUser, roomId) {
  // whether user has joined this room
  const [joinedRoom, setJoinedRoom] = useState(false);

  // loading state while checking firestore
  const [loadingJoinedRoom, setLoadingJoinedRoom] = useState(true);

  useEffect(() => {
    // if no user or no room id, reset state
    if (!currentUser || !roomId) {
      setJoinedRoom(false);
      setLoadingJoinedRoom(false);
      return;
    }

    // start loading
    setLoadingJoinedRoom(true);

    // listen to this specific joinedRoom document
    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid, "joinedRooms", roomId),
      (snapshot) => {
        // if document exists → user has joined the room
        setJoinedRoom(snapshot.exists());

        // finished loading
        setLoadingJoinedRoom(false);
      },
      (error) => {
        console.error("error loading joined room state:", error);

        // fallback if error
        setJoinedRoom(false);
        setLoadingJoinedRoom(false);
      }
    );

    // cleanup listener when component unmounts
    return () => unsubscribe();
  }, [currentUser, roomId]);

  return { joinedRoom, loadingJoinedRoom };
}