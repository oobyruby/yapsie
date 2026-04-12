// router components for page navigation
import { BrowserRouter, Routes, Route } from "react-router-dom";

// react hooks
import { useEffect, useState } from "react";

// app pages
import Welcome from "./pages/welcome";
import Login from "./pages/login";
import Register from "./pages/register";
import Home from "./pages/home";
import NewUserWelcome from "./pages/newuserwelcome";
import Profile from "./pages/profile";
import UserProfile from "./pages/userprofile";
import EditProfile from "./pages/editprofile";
import Followers from "./pages/followers";
import Following from "./pages/following";
import Notifications from "./pages/notifications";
import Replies from "./pages/replies";
import ParanormalRoom from "./pages/paranormalroom";
import ParanormalChannel from "./pages/paranormalchannel";
import ComingSoon from "./pages/comingsoon";

function App() {
  // track online/offline state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // when connection returns
    const handleOnline = () => setIsOffline(false);

    // when connection is lost
    const handleOffline = () => setIsOffline(true);

    // listen for browser connection changes
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // cleanup listeners
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>

      {/* offline banner shown when user loses internet */}
      {isOffline && (
        <div className="offline-banner">
          you're offline — your feed may not be up to date
        </div>
      )}

      {/* application routes */}
      <Routes>

        {/* auth + entry pages */}
        <Route path="/" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* main feed */}
        <Route path="/home" element={<Home />} />
        <Route path="/welcome-new" element={<NewUserWelcome />} />

        {/* profile pages */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:uid" element={<UserProfile />} />
        <Route path="/edit-profile" element={<EditProfile />} />

        {/* followers / following */}
        <Route path="/profile/followers" element={<Followers />} />
        <Route path="/profile/following" element={<Following />} />
        <Route path="/profile/:uid/followers" element={<Followers />} />
        <Route path="/profile/:uid/following" element={<Following />} />

        {/* notifications */}
        <Route path="/notifications" element={<Notifications />} />

        {/* replies page */}
        <Route path="/post/:postId" element={<Replies />} />

        {/* rooms */}
        <Route path="/rooms/paranormal" element={<ParanormalRoom />} />
        <Route path="/rooms/paranormal/:channelId" element={<ParanormalChannel />} />

        {/* placeholder pages */}
        <Route path="/messages" element={<ComingSoon />} />
        <Route path="/settings" element={<ComingSoon />} />

      </Routes>

    </BrowserRouter>
  );
}

export default App;