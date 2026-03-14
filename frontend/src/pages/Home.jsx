import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home-page">
      <Navbar />

      <main className="home">
        <section className="home__hero">
          <p className="home__subtitle">42 Project</p>
          <h1 className="home__title">Transcendence</h1>
          <p className="home__description">
            Bienvenida a la página principal del proyecto. Accede al juego o
            consulta los términos y condiciones de la plataforma.
          </p>

          <div className="home__actions">
            <Link to="/game" className="home__primary-btn">
              Entrar al juego
            </Link>

            <Link to="/terms" className="home__secondary-btn">
              Terms and Conditions
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;