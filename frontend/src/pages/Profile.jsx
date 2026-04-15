import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesPushed: 0,
    blackjacks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch("/api/auth/verify", {
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

        const statsRes = await fetch("/api/auth/stats", {
          method: "GET",
          credentials: "include",
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats({
            gamesPlayed: statsData.gamesPlayed || 0,
            gamesWon: statsData.gamesWon || 0,
            gamesLost: statsData.gamesLost || 0,
            gamesPushed: statsData.gamesPushed || 0,
            blackjacks: statsData.blackjacks || 0,
          });
        }

        const leaderboardRes = await fetch("/api/auth/leaderboard", {
          method: "GET",
          credentials: "include",
        });

        if (leaderboardRes.ok) {
          const leaderboardData = await leaderboardRes.json();
          setLeaderboard(
            Array.isArray(leaderboardData.leaderboard)
              ? leaderboardData.leaderboard.slice(0, 3)
              : []
          );
        }

        const historyRes = await fetch("/api/auth/history", {
          method: "GET",
          credentials: "include",
        });

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          setHistory(
            Array.isArray(historyData.history)
              ? historyData.history.slice(0, 10)
              : []
          );
        }
      } catch (error) {
        console.error("Error cargando perfil:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const getResultLabel = (result) => {
    if (result === "win") return "Win";
    if (result === "lose") return "Loss";
    if (result === "push") return "Push";
    return "Unknown";
  };

  const getResultClass = (result) => {
    if (result === "win") return "history-badge--win";
    if (result === "lose") return "history-badge--lose";
    if (result === "push") return "history-badge--push";
    return "";
  };

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
      await fetch("/api/auth/logout", {
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

  const top1 = leaderboard[0] || null;
  const top2 = leaderboard[1] || null;
  const top3 = leaderboard[2] || null;

  const renderPodiumCard = (player, rank, extraClass = "") => {
    if (!player) {
      return (
        <article
          className={`podium-slot podium-slot--empty podium-slot--rank-${rank} ${extraClass}`}
          aria-hidden="true"
        >
          <div className={`podium-block podium-block--rank-${rank}`}>
            <div className="podium-block__top">
              <div className="podium-block__avatar">
                <span>?</span>
              </div>

              <div className="podium-block__meta">
                <strong>Empty</strong>
                <span>No player</span>
              </div>
            </div>

            <div className="podium-block__rank">#{rank}</div>
          </div>
        </article>
      );
    }

    const isCurrentUser = String(player.id) === String(user?.id);
    const playerInitial = player.username?.charAt(0)?.toUpperCase() || "?";

    return (
      <article
        className={`podium-slot podium-slot--rank-${rank} ${extraClass} ${
          isCurrentUser ? "podium-slot--me" : ""
        }`}
      >
        <div className={`podium-block podium-block--rank-${rank}`}>
          <div className="podium-block__top">
            <div className="podium-block__avatar">
              <span>{playerInitial}</span>
            </div>

            <div className="podium-block__meta">
              <strong>
                {player.username}
                {isCurrentUser ? " (You)" : ""}
              </strong>

              <span className="podium-block__balance">
                <span className="podium-block__coin">◉</span>
                {Number(player.balance || 0)}
              </span>
            </div>
          </div>

          <div className="podium-block__rank">#{rank}</div>
        </div>
      </article>
    );
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
          <article className="glass-card stat-card stat-card--highlight">
            <span>Win Rate</span>
            <strong>{formattedWinrate}</strong>
          </article>

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
        </section>

        <div className="profile-bottom-grid">
          <section className="glass-card profile-leaderboard">
            <div className="profile-leaderboard__header">
              <span className="profile-hero__eyebrow">Leaderboard</span>
              <h2>Top 3 Players</h2>
            </div>

            {leaderboard.length === 0 ? (
              <p className="profile-history__empty">No leaderboard data yet.</p>
            ) : (
              <div className="podium">
                <div className="podium__stage">
                  {renderPodiumCard(top2, 2, "podium__slot podium__slot--left")}
                  {renderPodiumCard(
                    top1,
                    1,
                    "podium__slot podium__slot--center"
                  )}
                  {renderPodiumCard(
                    top3,
                    3,
                    "podium__slot podium__slot--right"
                  )}
                </div>

                <div className="leaderboard-mini-list">
                  {leaderboard.map((player, index) => {
                    const rank = index + 1;
                    const isCurrentUser = String(player.id) === String(user?.id);

                    return (
                      <div
                        key={player.id || index}
                        className={`leaderboard-mini-item ${
                          isCurrentUser ? "leaderboard-mini-item--me" : ""
                        }`}
                      >
                        <span className={`leaderboard-mini-item__rank rank-${rank}`}>
                          #{rank}
                        </span>
                        <strong>{player.username}</strong>
                        <span className="leaderboard-mini-item__balance">
                          <span className="leaderboard-mini-item__coin">◉</span>
                          {Number(player.balance || 0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <section className="glass-card profile-history">
            <div className="profile-history__header">
              <span className="profile-hero__eyebrow">History</span>
              <h2>Recent Games</h2>
            </div>

            {history.length === 0 ? (
              <p className="profile-history__empty">No games played yet.</p>
            ) : (
              <div className="profile-history__list">
                {history.map((match, index) => (
                  <article
                    key={`${match.playedAt || index}-${index}`}
                    className="history-item"
                  >
                    <div className="history-item__main">
                      <strong>{match.roomName || "Blackjack Table"}</strong>
                      <span>
                        {match.playedAt
                          ? new Date(match.playedAt).toLocaleString()
                          : "Unknown date"}
                      </span>
                    </div>

                    <div className="history-item__meta">
                      <span
                        className={`history-badge ${getResultClass(match.result)}`}
                      >
                        {getResultLabel(match.result)}
                      </span>
                      <span>Bet: {match.bet ?? 0}</span>
                      <span>Your score: {match.score ?? 0}</span>
                      <span>Dealer: {match.dealerScore ?? 0}</span>
                      <span>Chips after: {match.chipsAfter ?? 0}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;