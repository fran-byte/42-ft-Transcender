import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Home() {
  const username = localStorage.getItem("username");
  const isLoggedIn = !!username;

  return (
    <div className="page shell home-page">
      <Navbar />

      <main className="home home--casino">
        <section className="home-hero-mobile">
          <div className="home-hero-mobile__content">
            <h1 className="hero__title hero__title--animated" aria-label="Blackjack">
              {"BLACKJACK".split("").map((letter, index) => (
                <span
                  key={`${letter}-${index}`}
                  className="hero__letter"
                  style={{ "--letter-index": index }}
                >
                  {letter}
                </span>
              ))}
            </h1>
              {!isLoggedIn && (
              <p className="home-hero-mobile__subtitle">
                Log in or sign up with your email to start playing
              </p>
            )}

            <div className="deck-visual deck-visual--fullscreen">
              <div className="deck-stack deck-stack--large deck-stack--fan deck-stack--dealing">
                <div className="casino-card casino-card--back casino-card--1">
                  <div className="casino-card__inner" />
                </div>

                <div className="casino-card casino-card--back casino-card--2">
                  <div className="casino-card__inner" />
                </div>

                <div className="casino-card casino-card--front casino-card--3">
                  <div className="casino-card__inner">
                    <div className="casino-card__corner casino-card__corner--top">
                      <span>A</span>
                      <span>♥</span>
                    </div>
                    <div className="casino-card__center">♥</div>
                    <div className="casino-card__corner casino-card__corner--bottom">
                      <span>A</span>
                      <span>♥</span>
                    </div>
                  </div>
                </div>

                <div className="casino-card casino-card--front casino-card--4">
                  <div className="casino-card__inner">
                    <div className="casino-card__corner casino-card__corner--top">
                      <span>K</span>
                      <span>♠</span>
                    </div>
                    <div className="casino-card__center">♠</div>
                    <div className="casino-card__corner casino-card__corner--bottom">
                      <span>K</span>
                      <span>♠</span>
                    </div>
                  </div>
                </div>

                <div className="casino-card casino-card--front casino-card--5">
                  <div className="casino-card__inner">
                    <div className="casino-card__corner casino-card__corner--top">
                      <span>10</span>
                      <span>♣</span>
                    </div>
                    <div className="casino-card__center">♣</div>
                    <div className="casino-card__corner casino-card__corner--bottom">
                      <span>10</span>
                      <span>♣</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hero__actions hero__actions--mobile">
              {isLoggedIn ? (
                <Link to="/lobby" className="btn btn-gold btn-xl btn-home-main">
                  Play Now
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-login btn-xl btn-home-main">
                    Log In
                  </Link>

                  <Link to="/register" className="btn btn-secondary btn-xl btn-home-secondary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            <div className="hero__links home-hero-mobile__links">
              <Link to="/terms">Terms and Conditions</Link>
              <Link to="/privacy">Privacy Policy</Link>
              {isLoggedIn && <Link to="/profile">Profile</Link>}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;