import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesPushed: 0,
    blackjacks: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/auth/verify", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          navigate("/login");
          return;
        }

        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("email", data.user.email);

        const rawStats = localStorage.getItem(`stats_${data.user.id}`);
        const parsedStats = rawStats ? JSON.parse(rawStats) : null;

        setStats({
          gamesPlayed: Number(parsedStats?.gamesPlayed ?? 0),
          gamesWon: Number(parsedStats?.gamesWon ?? 0),
          gamesLost: Number(parsedStats?.gamesLost ?? 0),
          gamesPushed: Number(parsedStats?.gamesPushed ?? 0),
          blackjacks: Number(parsedStats?.blackjacks ?? 0),
        });
      } catch (error) {
        console.error("Error cargando perfil:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const username = user?.username || "Player";
  const email = user?.email || "No email";
  const initial = username.charAt(0).toUpperCase();

  const winrate = useMemo(() => {
    if (stats.gamesPlayed === 0) return 0;
    return (stats.gamesWon / stats.gamesPlayed) * 100;
  }, [stats.gamesPlayed, stats.gamesWon]);

  const formattedWinrate = `${winrate.toFixed(1)}%`;

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("selectedRoom");

    navigate("/login");
  };

  if (loading) {
    return (
      <div className="page shell">
        <Navbar />
        <main className="profile-page profile-page--decorated">
          <section className="glass-card profile-hero">
            <h1>Loading profile...</h1>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page shell">
      <Navbar />

      <main className="profile-page profile-page--decorated">
        <div className="profile-bg-cards" aria-hidden="true">
          <div className="profile-bg-cards__deck profile-bg-cards__deck--rich">
            <div className="casino-card casino-card--back profile-casino-card profile-casino-card--1">
              <div className="casino-card__inner"></div>
            </div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--2">
              <div className="casino-card__inner">
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
            </div>

            <div className="casino-card casino-card--front profile-casino-card profile-casino-card--3 card-red">
              <div className="casino-card__inner">
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