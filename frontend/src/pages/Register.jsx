import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

const API_URL = "";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanEmail || !cleanPassword) {
      setErrorMsg("Please fill in all required fields");
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!emailValid) {
      setErrorMsg("Please, enter a valid email address");
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg("The password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "User could not be registered");
        return;
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);

     // if (!localStorage.getItem(`stats_${data.user.id}`)) {
       // localStorage.setItem(
         // `stats_${data.user.id}`,
          // JSON.stringify({
           // gamesPlayed: 0,
            // gamesWon: 0,
            // gamesLost: 0,
            // gamesPushed: 0,
            // blackjacks: 0,
            // winrate: 0,
          // })
        // );
     // }

      navigate("/profile");
    } catch (error) {
      console.error("Register error:", error);
      setErrorMsg("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page shell">
      <Navbar />

      <main className="auth-layout auth-layout--clean">
        <section className="auth-card auth-card--clean">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Create account</span>
            <h1>Sign up</h1>
            <p>Create your profile to access the lobby and tables</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errorMsg && <p className="auth-error">{errorMsg}</p>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="auth-helper">
             Already have an account? <Link to="/login">Log in</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Register;
