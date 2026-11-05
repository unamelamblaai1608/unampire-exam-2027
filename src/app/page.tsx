import Link from "next/link";
import countryData from "../../public/database/countries.json";
import SiteHeader from "../components/SiteHeader";
import WorldMap from "../components/WorldMap";

const features = [
  {
    number: "01",
    title: "Choose your nation",
    description:
      "Begin with a nation of your choice and build your campaign around its strengths.",
  },
  {
    number: "02",
    title: "Command and conquer",
    description:
      "Manage your troops, choose your battles, and expand your influence across the map.",
  },
  {
    number: "03",
    title: "Outthink rival powers",
    description:
      "Adapt to every turn, reinforce your territories, and compete to unite the world.",
  },
];

export default function Home() {
  return (
    <main className="app-shell home-page">
      <SiteHeader />

      <section className="home-hero">
        <div className="home-hero-copy">
          <div className="eyebrow">A GEOPOLITICAL STRATEGY EXPERIENCE</div>
          <h1>
            ONE WORLD.
            <br />
            <em>TEN NATIONS.</em>
            <br />
            ONE EMPIRE.
          </h1>
          <p className="home-tagline">One world. Ten nations. One empire.</p>
          <p className="lead">
            Lead one of ten nations in a contest for global supremacy. Build
            your forces, make every move count, and outthink rival powers as
            you shape the fate of the world.
          </p>
          <div className="home-actions">
            <Link href="/game" className="primary-btn">
              PLAY NOW <span>↗</span>
            </Link>
            <Link href="#features" className="secondary-btn">
              DISCOVER THE GAME
            </Link>
          </div>
          <div className="home-highlights" aria-label="Game highlights">
            <div>
              <strong>10</strong>
              <span>NATIONS</span>
            </div>
            <div>
              <strong>1</strong>
              <span>SHARED THEATRE</span>
            </div>
            <div>
              <strong>∞</strong>
              <span>WAYS TO STRATEGIZE</span>
            </div>
          </div>
        </div>

        <div className="home-map-card" id="world">
          <div className="panel-head">
            <div>
              <small>THE WORLD THEATRE</small>
              <h2>A world of opportunity</h2>
            </div>
            <span className="live-tag">{countryData.length} NATIONS</span>
          </div>
          <WorldMap countries={countryData} selected="South Africa" />
          <p className="map-hint">
            Ten nations. One map. The next move is yours.
          </p>
        </div>
      </section>

      <section className="home-features" id="features">
        <div className="home-section-heading">
          <div className="eyebrow">THE ART OF EMPIRE</div>
          <h2>Every decision changes the map.</h2>
          <p>
            Build your campaign through careful planning, bold decisions, and
            control of the world theatre.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.number}>
              <span>{feature.number}</span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-callout">
        <div>
          <div className="eyebrow">YOUR CAMPAIGN AWAITS</div>
          <h2>Command your destiny.</h2>
        </div>
        <Link href="/game" className="primary-btn">
          PLAY NOW <span>↗</span>
        </Link>
      </section>

      <footer className="home-footer">
        <div className="home-footer-brand">
          <span>
            UNAM<span className="footer-italic">pire</span>
          </span>
          <p>One world. Ten nations. One empire.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/game">Play Game</Link>
          <Link href="/sign-in">Login</Link>
          <Link href="/sign-up">Register</Link>
        </nav>
        <div className="home-footer-bottom">
          <span>UNAMPIRE · COMMAND YOUR DESTINY</span>
          <span>DESIGNED FOR STRATEGIC THINKING</span>
        </div>
      </footer>
    </main>
  );
}
