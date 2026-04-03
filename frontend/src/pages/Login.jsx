import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

const API_URL = "";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg("Please fill out user name/password field accurately and submit again");
      return;
    }
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.message || "Couldn't log in");
        return;
      }

      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("username", data.user.username);
      localStorage.setItem("email", data.user.email);

      navigate("/lobby");
    } catch (error) {
      console.error("Log in error:", error);
      setErrorMsg("Unable to connect to the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page shell">
      <Navbar />

      <main className="auth-layout">
        <section className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Welcome back</span>
            <h1>Log In</h1>
            <p>Log in with your username and password</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
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
              {loading ? "Logging in..." : "Join Game"}
            </button>
          </form>

          <p className="auth-helper">
            Dont't have an account? <Link to="/register">Sign up</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Login;