export const metadata = {
  title: "Bioncolab",
  description: "Home Page",
};

import Hero from "@/components/hero-home";

import FeaturesPlanet from "@/components/features-planet";
import LargeTestimonial from "@/components/large-testimonial";
import Cta from "@/components/cta";

export default function Home() {
  return (
    <>
      <Hero />
      
      <FeaturesPlanet />
      <LargeTestimonial />
      <Cta />
    </>
  );
}
