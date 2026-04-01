import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Privacy() {
  return (
    <>
    <div className="page shell">
      <Navbar />

      <main className="terms">
        <section className="terms__header">
          <h1>Privacy Policy</h1>
          <p>Last updated: March 2026</p>
        </section>

        <section className="terms__content">
          <article>
            <h2>1. Data collection</h2>
            <p>
              We may collect basic user information such as username and email
              to provide access to platform features.
            </p>
          </article>

          <article>
            <h2>2. Use of data</h2>
            <p>
              Personal data is used only to support access, improve the user
              experience and maintain the normal operation of the platform.
            </p>
          </article>

          <article>
            <h2>3. Data security</h2>
            <p>
              We take reasonable technical measures to protect user information,
              although no system can guarantee absolute security.
            </p>
          </article>

          <article>
            <h2>4. User rights</h2>
            <p>
              Users may request information about the data stored on the
              platform and request corrections or deletion where applicable.
            </p>
          </article>

          <article>
            <h2>5. Policy changes</h2>
            <p>
              This privacy policy may be updated periodically. Continued use of
              the platform implies acceptance of the latest published version.
            </p>
          </article>
        </section>
      </main>

      <Footer />
    </div>
    </>
  );
}

export default Privacy;