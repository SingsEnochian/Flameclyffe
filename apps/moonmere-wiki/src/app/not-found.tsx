import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found reading-panel">
      <span aria-hidden="true">☾</span>
      <h1>The path leaves the map here.</h1>
      <p>This page is not public, has moved, or has not yet been entered into the Moonmere Archive.</p>
      <Link className="button gold" href="/">Return to the gate</Link>
    </section>
  );
}
