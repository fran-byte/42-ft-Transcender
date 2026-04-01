import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanUsername || !cleanEmail) {
      alert("Completa todos los campos");
      return;
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!emailValid) {
      alert("Introduce un email válido");
      return;
    }

    localStorage.setItem("username", cleanUsername);
    localStorage.setItem("email", cleanEmail);
    localStorage.setItem("isLoggedIn", "true");

    if (!localStorage.getItem("stats")) {
      localStorage.setItem(
        "stats",
        JSON.stringify({
          gamesPlayed: 0,
          gamesWon: 0,
          gamesLost: 0,
          blackjacks: 0,
        })
      );
    }

    navigate("/profile");
  };

  return (
    <div className="page shell">
      <Navbar />

      <main className="auth-layout auth-layout--clean">
        <section className="auth-card auth-card--clean">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Create account</span>
            <h1>Registro</h1>
            <p>Crea tu perfil para acceder al lobby y a las mesas.</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Tu nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Crear cuenta
            </button>
          </form>

          <p className="auth-helper">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Register;
