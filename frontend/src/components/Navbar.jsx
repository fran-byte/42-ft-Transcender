import { Link } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__container">
        <Link to="/" className="navbar__logo">
          Transcendence
        </Link>

        <nav className="navbar__links">
          <Link to="/" className="navbar__link">
            Home
          </Link>
          <Link to="/terms" className="navbar__link">
            Terms
          </Link>
          <Link to="/game" className="navbar__button">
            Play
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;