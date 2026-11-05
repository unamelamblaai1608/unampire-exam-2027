
import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import SiteHeader from "../../../components/SiteHeader";

export default function SignInPage() {
  return (
    <main className="auth-page">
      <div className="auth-glow" />
      <SiteHeader />

      <div className="auth-content">
        <div className="auth-heading">
          <span className="auth-eyebrow">THE WORLD AWAITS</span>
          <h1>WELCOME BACK,<br /><em>COMMANDER.</em></h1>
          <p>
            Your campaign awaits. Sign in to return to the
            world theatre and continue your conquest.
          </p>
        </div>

        <div className="auth-card">
          <Suspense fallback={<p role="status">Loading secure sign-in…</p>}>
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              appearance={{
                variables: {
                  colorPrimary: "#D5AE62",
                  colorBackground: "#101D2D",
                  colorNeutral: "#FFFFFF",
                  colorMutedForeground: "#D1D9E2",
                  borderRadius: "8px",
                },
              }}
            />
          </Suspense>
        </div>

        <p className="auth-bottom">
          ONE WORLD. TEN NATIONS. ONE EMPIRE.
        </p>
      </div>
    </main>
  );
}
