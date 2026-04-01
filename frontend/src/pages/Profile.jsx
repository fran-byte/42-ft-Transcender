import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Profile() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Player";
  const email = localStorage.getItem("email") || "No email";

  const storedStats = JSON.parse(localStorage.getItem("stats") || "{}");

  const stats = {
    gamesPlayed: Number(storedStats.gamesPlayed ?? 0),
    gamesWon: Number(storedStats.gamesWon ?? 0),
    gamesLost: Number(storedStats.gamesLost ?? 0),
    gamesPushed: Number(storedStats.gamesPushed ?? 0),
    blackjacks: Number(storedStats.blackjacks ?? 0),
  };

  const initial = username.charAt(0).toUpperCase();

  const winrate =
    stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0;

  const formattedWinrate = `${winrate.toFixed(1)}%`;

  const handleLogout = () => {
    const username = localStorage.getItem("username") || "guest";
    localStorage.removeItem(`blackjackSessionScore_${username}`);
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
          <div className="profile-bg-cards__deck profile-bg-cards__deck--rich">
            <div className="casino-card casino-card--back profile-casino-card profile-casino-card--1"></div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--2">
              <div className="casino-card__corner casino-card__corner--top">
                <span>A</span>
                <span>♠</span>
              </div>
              <div className="casino-card__center">♠</div>
              <div className="casino-card__corner casino-card__corner--bottom">
                <span>A</span>
                <span>♠</span>
              </div>
            </div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--3 card-red">
              <div className="casino-card__corner casino-card__corner--top">
                <span>K</span>
                <span>♥</span>
              </div>
              <div className="casino-card__center">♥</div>
              <div className="casino-card__corner casino-card__corner--bottom">
                <span>K</span>
                <span>♥</span>
              </div>
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

        <section className="stats-grid stats-grid--profile">
          <article className="glass-card stat-card">
            <span>Total Hands</span>
            <strong>{stats.gamesPlayed}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Wins</span>
            <strong>{stats.gamesWon}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Losses</span>
            <strong>{stats.gamesLost}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Pushes</span>
            <strong>{stats.gamesPushed}</strong>
          </article>

          <article className="glass-card stat-card">
            <span>Blackjacks</span>
            <strong>{stats.blackjacks}</strong>
          </article>

          <article className="glass-card stat-card stat-card--highlight">
            <span>Win Rate</span>
            <strong>{formattedWinrate}</strong>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;