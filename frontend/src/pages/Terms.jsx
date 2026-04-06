import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Index.css";

function Terms() {
  return (
    <>
      <div className="page shell">
        <Navbar />

      <main className="terms">
        <section className="terms__header">
          <h1>Terms and Conditions</h1>
          <p>Last updated: March 2026</p>
        </section>

        <section className="terms__content">
          <article>
            <h2>1. Acceptance of terms</h2>
            <p>
              By accessing or using Transcendence, you agree to comply with
              these Terms and Conditions. If you do not agree with them, you
              must not use the platform.
            </p>
          </article>

          <article>
            <h2>2. Use of the platform</h2>
            <p>
              Transcendence is an online multiplayer game platform. You agree
              to use it only for lawful purposes and in a way that does not
              harm the platform, its users or its services.
            </p>
          </article>

          <article>
            <h2>3. User accounts</h2>
            <p>
              You may be required to create an account to access certain
              features. You are responsible for maintaining the confidentiality
              of your account credentials and for all activity under your
              account.
            </p>
          </article>

          <article>
            <h2>4. Prohibited conduct</h2>
            <p>
              Users must not attempt to cheat, exploit bugs, harass other
              players, disrupt matches, access unauthorized data or interfere
              with the normal operation of the platform.
            </p>
          </article>

          <article>
            <h2>5. Service availability</h2>
            <p>
              We do not guarantee uninterrupted availability of the service.
              The platform may be temporarily unavailable due to maintenance,
              updates or technical issues.
            </p>
          </article>

          <article>
            <h2>6. Limitation of liability</h2>
            <p>
              Transcendence is provided on an as-is basis. We are not liable
              for any direct or indirect damages arising from the use or
              inability to use the platform.
            </p>
          </article>

          <article>
            <h2>7. Changes to the terms</h2>
            <p>
              These terms may be updated from time to time. Continued use of
              the platform after changes are published means you accept the
              revised terms.
            </p>
          </article>

          <article>
            <h2>8. Contact</h2>
            <p>
              For questions regarding these Terms and Conditions, please contact
              the project administrators.
            </p>
          </article>
        </section>
      </main>

      <Footer />
      </div>
    </>
  );
}

export default Terms;