import { useEffect, useState } from "react";
import {
  ArrowDown,
  ClockCounterClockwise,
  DownloadSimple,
  FileArrowDown,
  GithubLogo,
  List,
  Ruler,
  Sparkle,
  Stack,
  X,
} from "@phosphor-icons/react";

const releaseUrl = "https://github.com/YazeKT/Nestform/releases/latest";
const sourceUrl = "https://github.com/YazeKT/Nestform";
const issuesUrl = "https://github.com/YazeKT/Nestform/issues";
const assetUrl = (filename) => `${import.meta.env.BASE_URL}assets/${filename}`;

const workflow = [
  { number: "01", title: "Import your parts", copy: "Bring in SVG outlines locally. DXF and CDR conversion is available only after you approve it." },
  { number: "02", title: "Nest and improve", copy: "Set quantities, sheets, offcuts and spacing. Auto Nest keeps searching for better arrangements." },
  { number: "03", title: "Choose and export", copy: "Compare retained results, choose the layout you want, and export in your working units." },
];

const features = [
  { icon: Stack, title: "Multiple sheets and offcuts", copy: "List full stock and reusable remnants, including the quantity available for each." },
  { icon: Sparkle, title: "Auto Nest", copy: "Prepare a strong search setup quickly while keeping every setting visible and editable." },
  { icon: FileArrowDown, title: "Import and export", copy: "Work locally with SVG. Use confirmed online conversion when DXF or CDR is required." },
  { icon: ArrowDown, title: "Search control", copy: "Watch progress, stop whenever you are ready, and keep the best result found so far." },
  { icon: ClockCounterClockwise, title: "History and backups", copy: "Reopen completed layouts after restart and keep optional SVG copies outside the app." },
  { icon: Ruler, title: "Working units", copy: "Prepare sheets and export layouts in millimetres or inches with exact physical units." },
];

const gallery = [
  { id: "prepare", image: assetUrl("nestform-auto-nest.png"), alt: "Nestform Auto Nest setup guiding a user through choosing drawing files", number: "1", title: "Prepare the job", copy: "Choose parts, stock and search settings." },
  { id: "nest", image: assetUrl("nestform-workspace.png"), alt: "Nestform actively nesting three shapes on a workshop canvas", number: "2", title: "Watch it improve", copy: "Follow real progress and better candidates." },
  { id: "history", image: assetUrl("nestform-history.png"), alt: "Nestform History showing a saved completed nesting result", number: "3", title: "Keep the result", copy: "Reopen and export completed work." },
];

function Brand({ footer = false }) {
  return (
    <a className={`brand ${footer ? "brand--footer" : ""}`} href="#top" aria-label="Nestform home">
      <img src={assetUrl("nestform-logo.png")} alt="" />
      <span>nestform</span>
    </a>
  );
}

function DownloadLink({ className = "", children = "Download for Windows" }) {
  return (
    <a className={`button button--primary ${className}`} href={releaseUrl} target="_blank" rel="noreferrer">
      <DownloadSimple size={20} weight="bold" aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}

export function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="site-shell" id="top">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <Brand />
        <nav className={`nav ${menuOpen ? "nav--open" : ""}`} aria-label="Primary navigation">
          <a href="#product" onClick={closeMenu}>Product</a>
          <a href="#how-it-works" onClick={closeMenu}>How it works</a>
          <a href="#features" onClick={closeMenu}>Features</a>
          <a href="#open-source" onClick={closeMenu}>Open source</a>
          <a href={issuesUrl} target="_blank" rel="noreferrer" onClick={closeMenu}>Support</a>
        </nav>
        <div className="header-actions">
          <DownloadLink className="header-download" />
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"}>
            {menuOpen ? <X size={24} /> : <List size={24} />}
          </button>
        </div>
      </header>

      <main id="main">
        <section className="hero ruled-section" id="product">
          <div className="hero-copy reveal">
            <p className="eyebrow">Nesting for laser &amp; CNC</p>
            <h1>Fit more parts.<br />Waste less material.</h1>
            <p className="hero-intro">Nestform is a free, open-source Windows nesting workspace for laser cutting and CNC fabrication. Arrange parts across full sheets and offcuts, then keep searching for a better layout.</p>
            <div className="button-row">
              <DownloadLink />
              <a className="button button--secondary" href={sourceUrl} target="_blank" rel="noreferrer"><GithubLogo size={20} weight="bold" aria-hidden="true" /><span>View source</span></a>
            </div>
            <p className="download-note">Windows release · Free and open source · Unsigned build</p>
          </div>
          <div className="hero-media reveal reveal--delay">
            <div className="screen-frame"><img src={assetUrl("nestform-workspace.png")} alt="Nestform workspace showing an active nesting search with results" /></div>
            <span className="frame-label frame-label--top">Active search / candidate 25</span>
            <span className="frame-label frame-label--bottom">Real interface / verified build</span>
          </div>
        </section>

        <section className="statement ruled-section">
          <p className="margin-note">Less waste<br />More makes<br />A clearer tomorrow</p>
          <h2>Good material<br />is worth using well.</h2>
          <p className="statement-copy">Nestform helps you get more from every sheet, reuse offcuts and lower material waste without hiding the work behind a black box.</p>
        </section>

        <section className="workflow ruled-section" id="how-it-works">
          <div className="section-intro"><p className="eyebrow">A simple workflow</p><h2>From parts<br />to layouts<br />in three steps.</h2></div>
          <div className="workflow-grid">
            {workflow.map((item) => <article className="workflow-step" key={item.number}><span className="step-number">{item.number}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}
          </div>
        </section>

        <section className="features ruled-section" id="features">
          <div className="section-intro"><p className="eyebrow">Built for real work</p><h2>Tools for<br />how you work.</h2></div>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, copy }) => <article className="feature" key={title}><Icon size={32} weight="regular" aria-hidden="true" /><div><h3>{title}</h3><p>{copy}</p></div></article>)}
          </div>
        </section>

        <section className="showcase ruled-section" aria-labelledby="showcase-title">
          <div className="showcase-copy"><p className="eyebrow">See it in action</p><h2 id="showcase-title">Real workspace.<br />Real results.</h2><p>From guided setup to a saved layout, every frame comes from the working Windows app.</p></div>
          <div className="gallery">
            {gallery.map((shot) => (
              <article className="shot-card" key={shot.id}>
                <img src={shot.image} alt={shot.alt} />
                <p><strong>{shot.number}. {shot.title}</strong><span>{shot.copy}</span></p>
              </article>
            ))}
          </div>
        </section>

        <section className="open-source ruled-section" id="open-source">
          <div><p className="eyebrow">Open source</p><h2>Open by design.<br />Useful by default.</h2></div>
          <div className="open-copy"><p>Nestform is available under the GPL-3.0 license. Inspect the source, study it, modify it and share improvements with the people who make things.</p><a className="button button--secondary" href={sourceUrl} target="_blank" rel="noreferrer"><GithubLogo size={20} weight="bold" aria-hidden="true" /><span>View source on GitHub</span></a></div>
          <ul className="open-list" aria-label="Open source benefits"><li>Free to use</li><li>GPL-3.0</li><li>No account required</li><li>SVG stays local</li></ul>
        </section>

        <section className="download ruled-section" id="download">
          <div><p className="eyebrow">Get started</p><h2>Download Nestform<br />for Windows.</h2></div>
          <div className="download-action">
            <DownloadLink />
            <p>The latest GitHub release includes the normal Setup EXE, portable build, source and SHA-256 checksums.</p>
            <div className="trust-note"><strong>About the Windows warning</strong><span>The current release is not code-signed, so Windows may show Unknown Publisher or SmartScreen. Verify the checksum or inspect the public source before installing.</span></div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div><Brand footer /><p>More from every sheet.</p></div>
        <nav aria-label="Footer navigation"><a href="#product">Product</a><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#open-source">Open source</a></nav>
        <div className="footer-meta"><p>Made by Yaze Media</p><p>Powered by the preserved Deepnest engine.</p><p>© {new Date().getFullYear()} Yaze Media</p></div>
      </footer>
    </div>
  );
}
