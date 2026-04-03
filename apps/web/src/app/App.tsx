import { useMutation } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import logo from "../assets/logo.svg";
import "./App.css";

function App() {
  const joinWaitlist = useMutation(api.waitlist.join);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "exists" | "error">("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const result = await joinWaitlist({ email: email.trim() });
      setStatus(result.alreadyJoined ? "exists" : "done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <header className="header">
        <div className="header-left">
          <img src={logo} alt="imprfct Log" className="header-logo" />
          <span className="header-name">imprfct Log</span>
          <span className="header-domain">/ log.imprfct.dev</span>
        </div>
        <span className="badge">Building</span>
      </header>

      <section className="hero">
        <p className="hero-label">
          commit #1 — <span className="accent">day 1</span>
        </p>
        <h1 className="hero-title">
          A place to commit,
          <br />
          document the struggle,
          <br />
          and <span className="accent">ship</span>.
        </h1>
        <p className="subtitle">
          Public commitments. Auto devlogs from your git history.
          <br />
          No editing. No curation. Just work.
        </p>
      </section>

      <div className="timeline">
        <div className="timeline-entry">
          <span className="timeline-day">day 1</span>
          <span className="timeline-text">I'm building imprfct Log.</span>
        </div>
        <div className="timeline-entry">
          <span className="timeline-day">day 3</span>
          <span className="timeline-text">First feature works. Pushing forward.</span>
        </div>
        <div className="timeline-entry">
          <span className="timeline-day">now</span>
          <span className="timeline-text">
            Building in public.
            <span className="cursor" />
          </span>
        </div>
      </div>

      <div className="cta">
        {status === "done" ? (
          <p className="cta-success">You're in. We'll let you know.</p>
        ) : status === "exists" ? (
          <p className="cta-success">Already on the list. We got you.</p>
        ) : (
          <>
            <p className="cta-label">Get notified when it ships &rarr;</p>
            <form className="cta-form" onSubmit={handleSubmit}>
              <input
                className="cta-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "sending"}
              />
              <button className="cta-button" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "..." : "notify me"}
              </button>
            </form>
            {status === "error" && <p className="cta-error">Something went wrong. Try again.</p>}
          </>
        )}
      </div>
    </>
  );
}

export default App;
