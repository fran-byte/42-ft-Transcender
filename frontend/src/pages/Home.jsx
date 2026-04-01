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
            <h1 className="hero__title">Blackjack</h1>

            <p className="home-hero-mobile__subtitle">
              Inicia sesión o regístrate con tu email para empezar a jugar.
            </p>

            <div className="deck-visual deck-visual--fullscreen">
              <div className="deck-stack deck-stack--large">
                <div className="floating-card floating-card--back floating-card--1"></div>
                <div className="floating-card floating-card--back floating-card--2"></div>
                <div className="floating-card floating-card--front floating-card--3">
                  <span>A♠</span>
                </div>
                <div className="floating-card floating-card--front floating-card--4">
                  <span>K♥</span>
                </div>
                <div className="floating-card floating-card--front floating-card--5">
                  <span>10♣</span>
                </div>
              </div>
            </div>

            <div className="hero__actions hero__actions--mobile">
              {isLoggedIn ? (
                <Link to="/lobby" className="btn btn-gold btn-xl btn-home-main">
                  Entrar a jugar
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn btn-login btn-xl btn-home-main">
                    Iniciar sesión
                  </Link>

                  <Link to="/register" className="btn btn-secondary btn-xl btn-home-secondary">
                    Crear cuenta
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