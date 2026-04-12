import { Link } from "react-router-dom";

export default function NewUserWelcome() {
  // get saved profile from localStorage after register
  const savedProfile = JSON.parse(localStorage.getItem("yapsieProfile")) || {};

  // grab username, fallback to "user" if missing
  const username = savedProfile.username || "user";

  return (
    <div className="screen">
      <div className="welcome-container">
        {/* app logo */}
        <h1 className="logo">yapsie✦</h1>

        {/* personalised welcome message using username */}
        <p className="tagline">welcome, @{username}</p>

        <div className="buttons">
          {/* send new user into main app */}
          <Link to="/home" className="btn">
            get started
          </Link>
        </div>
      </div>
    </div>
  );
}