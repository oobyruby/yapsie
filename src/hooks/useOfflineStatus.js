import { useEffect, useState } from "react";

export default function useOfflineStatus() {
  // start by checking browser connection status
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // called when internet disconnects
    const goOffline = () => setIsOffline(true);

    // called when internet reconnects
    const goOnline = () => setIsOffline(false);

    // listen for browser online/offline events
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // cleanup listeners when component unmounts
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // return true/false
  return isOffline;
}