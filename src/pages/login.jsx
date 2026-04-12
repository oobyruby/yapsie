import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Login() {
  const navigate = useNavigate();

  // form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // state for errors + loading
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const looksLikeEmail = (value) => {
    // quick check to see if user typed an email instead of a username
    return value.includes("@");
  };

  const findEmailFromUsername = async (username) => {
    // clean up the username before checking firestore
    const trimmedUsername = username.trim().toLowerCase();

    if (!trimmedUsername) return null;

    const usersRef = collection(db, "users");

    // try find a user with matching lowercase username
    const usernameQuery = query(
      usersRef,
      where("usernameLower", "==", trimmedUsername),
      limit(1)
    );

    const snapshot = await getDocs(usernameQuery);

    if (snapshot.empty) {
      return null;
    }

    // if found, return their saved email
    const userData = snapshot.docs[0].data();
    return userData.email || null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // stop spam clicking
    if (isLoggingIn) return;

    setErrorMessage("");

    // clean up form values first
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password;

    // basic empty field check
    if (!trimmedIdentifier || !trimmedPassword) {
      setErrorMessage("please enter your username or email and password");
      return;
    }

    try {
      setIsLoggingIn(true);

      // by default, assume user typed an email
      let emailToUse = trimmedIdentifier;

      // if not an email, try find the email from the username
      if (!looksLikeEmail(trimmedIdentifier)) {
        const resolvedEmail = await findEmailFromUsername(trimmedIdentifier);

        if (!resolvedEmail) {
          setErrorMessage("no account found with that username");
          setIsLoggingIn(false);
          return;
        }

        emailToUse = resolvedEmail;
      }

      // log in with firebase auth using the email we now have
      await signInWithEmailAndPassword(auth, emailToUse, trimmedPassword);

      // save basic logged in flag locally
      localStorage.setItem("yapsieLoggedIn", "true");

      // send user into the app
      navigate("/home");
    } catch (error) {
      console.error("login error:", error);
      setErrorMessage("incorrect username/email or password");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="screen">
      <div className="auth-container">
        {/* app logo */}
        <h1 className="logo">yapsie✦</h1>

        {/* page title */}
        <h2 className="auth-title">log in</h2>

        {/* login form */}
        <form className="auth-form" onSubmit={handleLogin}>
          <label>username/email</label>
          <input
            type="text"
            placeholder="enter your username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />

          <label>password</label>
          <input
            type="password"
            placeholder="enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {/* show error if login fails */}
          {errorMessage && <p className="form-error">{errorMessage}</p>}

          {/* button text changes while login is happening */}
          <button type="submit" className="btn" disabled={isLoggingIn}>
            {isLoggingIn ? "logging in..." : "log in"}
          </button>
        </form>

        {/* link to register page for new users */}
        <p className="auth-switch">
          don&apos;t have an account yet?
          <br />
          <Link to="/register">create one here</Link>
        </p>
      </div>
    </div>
  );
}