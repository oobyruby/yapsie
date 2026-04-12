// initialise firebase core app
import { initializeApp } from "firebase/app";

// firebase authentication (login/register)
import { getAuth } from "firebase/auth";

// firestore database with offline persistence support
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// firebase storage (images, uploads, etc)
import { getStorage } from "firebase/storage";

// firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1Fa5RSS145s50O0ma2P2AYdp0Og5T3AA",
  authDomain: "yapsie.firebaseapp.com",
  projectId: "yapsie",
  storageBucket: "yapsie.firebasestorage.app",
  messagingSenderId: "945162472330",
  appId: "1:945162472330:web:60ea52ed170bf64cfdd673",
};

// create firebase app instance
const app = initializeApp(firebaseConfig);

// export authentication service
export const auth = getAuth(app);

// initialise firestore database with offline caching enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    // allows multiple browser tabs to share offline cache
    tabManager: persistentMultipleTabManager(),
  }),
});

// export storage service for image uploads
export const storage = getStorage(app);