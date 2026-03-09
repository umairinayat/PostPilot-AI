import { FAQ } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { SocialProof } from "@/components/landing/social-proof";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-navy-300 text-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_32%)]" />
      <div className="relative z-10">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <SocialProof />
          <Pricing />
          <FAQ />
        </main>
        <Footer />
      </div>
    </div>
  );
}
