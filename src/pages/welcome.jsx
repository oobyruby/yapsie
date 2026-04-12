import { Link } from "react-router-dom";

// simple welcome screen before user logs in or signs up
export default function Welcome() {
  return (
    // full screen wrapper
    <div className="screen">
      <div className="welcome-container">
        
        {/* app name / logo */}
        <h1 className="logo">yapsie✦</h1>

        {/* little tagline under the logo */}
        <p className="tagline">join the conversation</p>

        {/* buttons for login + register */}
        <div className="buttons">

          {/* go to login page */}
          <Link to="/login" className="btn">
            log in
          </Link>

          {/* go to create account page */}
          <Link to="/register" className="btn">
            create an account
          </Link>

        </div>

      </div>
    </div>
  );
}