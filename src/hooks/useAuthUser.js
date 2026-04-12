import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

export default function useAuthUser(navigate, redirectPath = "/login") {
  // currently signed in firebase user
  const [currentUser, setCurrentUser] = useState(null);

  // prevents UI rendering before auth check finishes
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    // listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setAuthReady(true);

      // redirect to login if not signed in
      if (!user && navigate) {
        navigate(redirectPath);
      }
    });

    // cleanup listener
    return () => unsubscribe();
  }, [navigate, redirectPath]);

  // expose user + loading state
  return { currentUser, authReady };
}