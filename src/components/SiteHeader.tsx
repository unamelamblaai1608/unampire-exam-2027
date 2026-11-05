import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span>UNAM</span><i>pire</i>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/">Home</Link>
        <Link href="/game">Play Game</Link>
        <Link href="/sign-in">Login</Link>
        <Link href="/sign-up">Register</Link>
      </nav>
    </header>
  );
}
