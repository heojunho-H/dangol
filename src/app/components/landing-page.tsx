import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth-context";
import { Navigation } from "./landing/Navigation";
import { Hero } from "./landing/Hero";
import { ProblemSolution } from "./landing/ProblemSolution";
import { Features } from "./landing/Features";
import { Industries } from "./landing/Industries";
import { Demo } from "./landing/Demo";
import { Pricing } from "./landing/Pricing";
import { CaseStudies } from "./landing/CaseStudies";
import { FinalCTA } from "./landing/FinalCTA";
import { Footer } from "./landing/Footer";
import "./landing-page.css";

export function LandingPage() {
  const nav = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) nav("/home", { replace: true });
  }, [loading, session, nav]);

  return (
    <div className="landing-page min-h-screen">
      <Navigation />
      <Hero />
      <ProblemSolution />
      <div className="h-px bg-[var(--lp-border)] w-full"></div>
      <Features />
      <Industries />
      <Demo />
      <Pricing />
      <CaseStudies />
      <FinalCTA />
      <Footer />
    </div>
  );
}
