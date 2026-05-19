import { Link, useNavigate } from "react-router-dom";
import { disconnectSocket } from "../socket";

function Navbar() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const isLoggedIn = !!username;

  const protectedRoute = (path) => (isLoggedIn ? path : "/login");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.log("Error cerrando sesión:", error);}
    }

    // Cerrar WebSocket manualmente
    disconnectSocket();

    // Limpiar localStorage
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("email");

    // Limpiar sessionStorage (donde se guarda el rol de espectador/jugador)
    sessionStorage.clear();

    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="navbar__brand">
          Blackjack
        </Link>

        <nav className="navbar__nav">
          <Link to="/" className="navbar__link">Home</Link>
          <Link to={protectedRoute("/lobby")} className="navbar__link">Lobby</Link>
          <Link to={protectedRoute("/game")} className="navbar__link">Game</Link>
          <Link to={protectedRoute("/profile")} className="navbar__link">Profile</Link>
          <Link to="/terms" className="navbar__link">Terms</Link>
          <Link to="/privacy" className="navbar__link">Privacy</Link>

          {isLoggedIn ? (
            <button className="btn btn-logout navbar__button navbar__button--lg" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <Link to="/login" className="btn btn-login navbar__button navbar__button--lg">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;