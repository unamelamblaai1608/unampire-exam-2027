
import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import SiteHeader from "../../../components/SiteHeader";

export default function SignUpPage() {
  return (
    <main className="auth-page">
      <div className="auth-glow" />
      <SiteHeader />

      <div className="auth-content">
        <div className="auth-heading">
          <span className="auth-eyebrow">YOUR EMPIRE STARTS HERE</span>
          <h1>CLAIM YOUR<br /><em>PLACE IN HISTORY.</em></h1>
          <p>
            Create your commander account, choose your nation
            and prepare to lead your campaign.
          </p>
        </div>

        <div className="auth-card">
          <Suspense fallback={<p role="status">Loading secure registration…</p>}>
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
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
