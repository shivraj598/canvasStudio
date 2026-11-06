import { About } from './components/About';
import { CallToAction } from './components/CallToAction';
import { Contact } from './components/Contact';
import { Faq } from './components/Faq';
import { FeatureGrid } from './components/FeatureGrid';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Hero } from './components/Hero';
import { Logos } from './components/Logos';
import { Menu } from './components/Menu';
import { Navbar } from './components/Navbar';
import { Newsletter } from './components/Newsletter';
import { Pricing } from './components/Pricing';
import { ProductGrid } from './components/ProductGrid';
import { Stats } from './components/Stats';
import { Team } from './components/Team';
import { Testimonials } from './components/Testimonials';
import { site } from './content';
import type { Section } from './types';

function renderSection(section: Section) {
  switch (section.kind) {
    case 'hero':
      return <Hero section={section} card={site.heroCard} />;
    case 'logos':
      return <Logos section={section} />;
    case 'about':
      return <About section={section} />;
    case 'features':
    case 'services':
      return <FeatureGrid section={section} />;
    case 'menu':
      return <Menu section={section} />;
    case 'rooms':
      return <ProductGrid section={section} action="Book this room" />;
    case 'products':
      return <ProductGrid section={section} action="Add to cart" />;
    case 'stats':
      return <Stats section={section} />;
    case 'gallery':
      return <Gallery section={section} />;
    case 'team':
      return <Team section={section} />;
    case 'testimonials':
      return <Testimonials section={section} />;
    case 'pricing':
      return <Pricing section={section} />;
    case 'faq':
      return <Faq section={section} />;
    case 'newsletter':
      return <Newsletter section={section} />;
    case 'cta':
      return <CallToAction section={section} />;
    case 'contact':
      return <Contact section={section} contact={site.contact} />;
  }
}

export function App() {
  return (
    <div className="min-h-screen bg-page text-ink antialiased">
      <Navbar />
      <main>
        {site.sections.map((section) => (
          <div key={section.kind}>{renderSection(section)}</div>
        ))}
      </main>
      <Footer />
    </div>
  );
}
