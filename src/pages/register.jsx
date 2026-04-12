import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Register() {
  const navigate = useNavigate();

  // form state for each input
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // state for showing errors + stopping double submits
  const [errorMessage, setErrorMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const isValidEmail = (value) => {
    // quick email check using regex
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const isStrongPassword = (value) => {
    // make sure password is not too weak
    const hasMinLength = value.length >= 8;
    const hasCapital = /[A-Z]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);

    return hasMinLength && hasCapital && hasSymbol;
  };

  const sanitiseUsername = (value) => {
    // remove spaces from username and trim extra bits
    return value.replace(/\s+/g, "").trim();
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // stop user clicking register loads of times
    if (isRegistering) return;

    setErrorMessage("");

    // clean up values before checking / saving them
    const trimmedName = name.trim();
    const cleanedUsername = sanitiseUsername(username);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;
    const trimmedConfirmPassword = confirmPassword;

    // basic empty field check
    if (
      !trimmedName ||
      !cleanedUsername ||
      !trimmedEmail ||
      !trimmedPassword ||
      !trimmedConfirmPassword
    ) {
      setErrorMessage("please fill in every field");
      return;
    }

    // make sure email looks valid
    if (!isValidEmail(trimmedEmail)) {
      setErrorMessage("please enter a valid email address");
      return;
    }

    // make sure password matches the app rules
    if (!isStrongPassword(trimmedPassword)) {
      setErrorMessage(
        "password must be at least 8 characters and include 1 capital letter and 1 symbol"
      );
      return;
    }

    // make sure both password boxes match
    if (trimmedPassword !== trimmedConfirmPassword) {
      setErrorMessage("passwords do not match");
      return;
    }

    // keep usernames at a decent minimum length
    if (cleanedUsername.length < 3) {
      setErrorMessage("username must be at least 3 characters");
      return;
    }

    try {
      setIsRegistering(true);

      // create the auth account in firebase auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      const user = userCredential.user;

      // set the display name in firebase auth too
      await updateProfile(user, {
        displayName: trimmedName,
      });

      // create the user's profile document in firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: trimmedName,
        username: cleanedUsername,
        usernameLower: cleanedUsername.toLowerCase(),
        email: trimmedEmail,
        bio: "",
        avatarUrl: "",
        bannerUrl: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // save a little bit of profile info locally for quick access
      localStorage.setItem(
        "yapsieProfile",
        JSON.stringify({
          uid: user.uid,
          name: trimmedName,
          username: cleanedUsername,
          email: trimmedEmail,
        })
      );

      // mark user as logged in locally
      localStorage.setItem("yapsieLoggedIn", "true");

      // send them to the welcome screen after successful sign up
      navigate("/welcome-new");
    } catch (error) {
      console.error("register error:", error);

      // show nicer error messages depending on firebase error code
      switch (error.code) {
        case "auth/email-already-in-use":
          setErrorMessage("that email is already in use");
          break;
        case "auth/invalid-email":
          setErrorMessage("please enter a valid email address");
          break;
        case "auth/weak-password":
          setErrorMessage("password is too weak");
          break;
        default:
          setErrorMessage(error.message || "could not create account right now");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="screen">
      <div className="auth-container">
        {/* app logo */}
        <h1 className="logo">yapsie✦</h1>

        {/* page title */}
        <h2 className="auth-title">create account</h2>

        {/* register form */}
        <form className="auth-form" onSubmit={handleRegister}>
          <label>name</label>
          <input
            type="text"
            placeholder="enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />

          <label>username</label>
          <input
            type="text"
            placeholder="choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <label>email</label>
          <input
            type="email"
            placeholder="enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <label>password</label>
          <input
            type="password"
            placeholder="create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <label>confirm password</label>
          <input
            type="password"
            placeholder="confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {/* show error message if something goes wrong */}
          {errorMessage && <p className="form-error">{errorMessage}</p>}

          {/* button text changes while account is being created */}
          <button type="submit" className="btn" disabled={isRegistering}>
            {isRegistering ? "creating account..." : "create account"}
          </button>
        </form>

        {/* link for users who already have an account */}
        <p className="auth-switch">
          already have an account? <Link to="/login">log in</Link>
        </p>
      </div>
    </div>
  );
}