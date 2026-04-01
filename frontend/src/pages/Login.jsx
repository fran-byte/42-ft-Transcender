import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Login() {
  const [identifier, setIdentifier] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    const storedUsername = localStorage.getItem("username");
    const storedEmail = localStorage.getItem("email");

    if (!identifier.trim()) {
      alert("Introduce tu email o username");
      return;
    }

    if (!storedUsername || !storedEmail) {
      alert("No existe ninguna cuenta registrada todavía");
      return;
    }

    const value = identifier.trim().toLowerCase();
    const matches =
      value === storedUsername.toLowerCase() ||
      value === storedEmail.toLowerCase();

    if (!matches) {
      alert("Usuario o email no encontrado");
      return;
    }

    localStorage.setItem("isLoggedIn", "true");
    navigate("/lobby");
  };

  return (
    <div className="page shell">
      <Navbar />

      <main className="auth-layout">
        <section className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__eyebrow">Welcome back</span>
            <h1>Iniciar sesión</h1>
            <p>Accede con tu email o tu nombre de usuario.</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label>Email o username</label>
              <input
                type="text"
                placeholder="ej. user o user@email.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block">
              Entrar
            </button>
          </form>

          <p className="auth-helper">
            ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Login;