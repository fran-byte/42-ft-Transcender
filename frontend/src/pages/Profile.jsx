import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Profile() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Player";
  const email = localStorage.getItem("email") || "Sin email";
  const stats = JSON.parse(
    localStorage.getItem("stats") ||
      JSON.stringify({
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        blackjacks: 0,
      })
  );

  const initial = username.charAt(0).toUpperCase();

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("selectedRoom");
    localStorage.removeItem("isLoggedIn");
    navigate("/");
  };

  return (
    <div className="page shell">
      <Navbar />

      <main className="profile-page profile-page--decorated">
        <div className="profile-bg-cards" aria-hidden="true">
          <div className="profile-bg-cards__deck">
            <div className="floating-card floating-card--back profile-card--1"></div>
            <div className="floating-card floating-card--front profile-card--2">
              <span>A♠</span>
            </div>
            <div className="floating-card floating-card--front profile-card--3">
              <span>K♥</span>
            </div>
          </div>
        </div>

        <section className="glass-card profile-hero">
          <div className="profile-hero__main">
            <div className="profile-avatar">
              <span className="profile-avatar__initial">{initial}</span>
            </div>

            <div className="profile-hero__copy">
              <span className="profile-hero__eyebrow">Profile</span>
              <h1>{username}</h1>
              <p>{email}</p>
            </div>
          </div>

          <div className="profile-hero__actions">
            <button className="btn btn-logout-pill" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </section>

        <section className="stats-grid">
          <article className="glass-card stat-card">
            <span>Partidas jugadas</span>
            <strong>{stats.gamesPlayed}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Victorias</span>
            <strong>{stats.gamesWon}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Derrotas</span>
            <strong>{stats.gamesLost}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Blackjacks</span>
            <strong>{stats.blackjacks}</strong>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;