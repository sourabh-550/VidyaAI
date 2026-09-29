import HeroSection from "./HeroSection";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import WhyFast from "./WhyFast";
import UnderTheHood from "./UnderTheHood";
import Footer from "./Footer";

export default function LandingPage({ onSuccess }) {
  return (
    <>
      <HeroSection onSuccess={onSuccess} />
      <HowItWorks />
      <Features />
      <WhyFast />
      <UnderTheHood />
      <Footer />
    </>
  );
}
