/**
 * Starter content and design defaults per kind of website. `{name}` and `{location}` are filled
 * in when a site is created. Any section an archetype doesn't define falls back to GENERIC.
 */
import type { HeroCard, Section, SectionKind, Theme } from './model.js';

export type SectionContent = Omit<Section, 'kind'>;

export interface Archetype {
  id: string;
  label: string;
  keywords: string[];
  names: string[];
  theme: Theme;
  heroCard: HeroCard;
  sections: SectionKind[];
  content: Partial<Record<SectionKind, SectionContent>>;
  hours?: string;
}

export const GENERIC: Record<SectionKind, SectionContent> = {
  hero: {
    eyebrow: 'Welcome to {name}',
    heading: 'Work that speaks for itself',
    body: 'We help people like you get more done with less stress — thoughtfully, reliably and with a personal touch.',
    cta: 'Get started',
    secondaryCta: 'Learn more',
  },
  logos: {
    heading: 'Trusted by teams and neighbours alike',
    items: ['Northwind', 'Lumen', 'Acme Co.', 'Bluebird', 'Evergreen', 'Polaris'].map((title) => ({
      title,
    })),
  },
  about: {
    eyebrow: 'Our story',
    heading: 'Small team, big care',
    body: '{name} started with a simple idea: do honest work, treat people well and sweat the details. Years later, that is still how we show up every single day.',
  },
  features: {
    eyebrow: 'Why {name}',
    heading: 'Everything you need, nothing you don’t',
    items: [
      {
        title: 'Thoughtful by default',
        description: 'Every detail considered so you never have to.',
        icon: 'heart',
      },
      {
        title: 'Fast and reliable',
        description: 'Quick turnarounds without cutting corners.',
        icon: 'zap',
      },
      {
        title: 'Trusted expertise',
        description: 'Years of experience, proven results.',
        icon: 'shield',
      },
      {
        title: 'Always here for you',
        description: 'Real people who answer real questions.',
        icon: 'smile',
      },
    ],
  },
  services: {
    eyebrow: 'What we do',
    heading: 'Services',
    items: [
      {
        title: 'Consultation',
        description: 'A relaxed first conversation to understand what you need.',
        icon: 'users',
      },
      {
        title: 'Planning',
        description: 'A clear plan with honest timelines and pricing.',
        icon: 'layers',
      },
      {
        title: 'Delivery',
        description: 'Done properly, on time, and explained in plain language.',
        icon: 'check',
      },
    ],
  },
  menu: {
    eyebrow: 'Menu',
    heading: 'Made fresh, every day',
    items: [
      { title: 'House special', description: 'Ask us what is good today.', meta: '$14' },
      { title: 'Seasonal plate', description: 'Whatever the market gave us.', meta: '$16' },
      { title: 'Something sweet', description: 'Baked this morning.', meta: '$7' },
    ],
  },
  rooms: {
    eyebrow: 'Stay',
    heading: 'Rooms & suites',
    items: [
      { title: 'Classic Room', description: 'Queen bed, rain shower, city view.', meta: '$149' },
      { title: 'Deluxe Room', description: 'King bed, reading nook, balcony.', meta: '$219' },
      { title: 'Suite', description: 'Separate lounge, soaking tub, best view.', meta: '$349' },
    ],
  },
  products: {
    eyebrow: 'Shop',
    heading: 'Bestsellers',
    items: [
      { title: 'The Original', description: 'Our first and still our favourite.', meta: '$38' },
      { title: 'The Everyday', description: 'Built for daily use.', meta: '$29' },
      { title: 'The Gift Set', description: 'Beautifully boxed and ready to give.', meta: '$64' },
      { title: 'Limited Edition', description: 'Small batch. Gone soon.', meta: '$45' },
    ],
  },
  stats: {
    heading: 'The numbers',
    items: [
      { title: '10+', description: 'Years of experience' },
      { title: '2,500', description: 'Happy clients' },
      { title: '4.9★', description: 'Average rating' },
      { title: '24h', description: 'Typical response time' },
    ],
  },
  gallery: {
    eyebrow: 'Gallery',
    heading: 'A look inside',
    items: ['Moments', 'Details', 'Craft', 'People', 'Spaces', 'Results'].map((title) => ({
      title,
    })),
  },
  team: {
    eyebrow: 'Team',
    heading: 'The people behind {name}',
    items: [
      {
        title: 'Alex Morgan',
        meta: 'Founder',
        description: 'Started it all and still in every day.',
      },
      { title: 'Priya Shah', meta: 'Lead', description: 'Keeps the quality bar sky high.' },
      {
        title: 'Sam Lee',
        meta: 'Client care',
        description: 'Your first hello and friendliest helper.',
      },
    ],
  },
  testimonials: {
    eyebrow: 'Kind words',
    heading: 'Loved by the people we serve',
    items: [
      {
        title: 'Honestly the best experience I’ve had. Professional, warm and quick.',
        meta: 'Jordan P.',
      },
      {
        title: 'They listened, explained everything and delivered more than promised.',
        meta: 'Maria G.',
      },
      { title: 'I recommend {name} to everyone I know. Ten out of ten.', meta: 'Chris D.' },
    ],
  },
  pricing: {
    eyebrow: 'Pricing',
    heading: 'Simple, honest pricing',
    body: 'No hidden fees. Change or cancel anytime.',
    items: [
      {
        title: 'Starter',
        meta: '$29',
        bullets: ['The essentials', 'Email support', 'Cancel anytime'],
      },
      {
        title: 'Plus',
        meta: '$79',
        highlight: true,
        bullets: ['Everything in Starter', 'Priority support', 'Monthly check-in'],
      },
      {
        title: 'Premium',
        meta: '$149',
        bullets: ['Everything in Plus', 'Dedicated contact', 'Custom options'],
      },
    ],
  },
  faq: {
    eyebrow: 'FAQ',
    heading: 'Questions, answered',
    items: [
      {
        title: 'How do I get started?',
        description: 'Send us a message or book online — we reply within one business day.',
      },
      {
        title: 'What does it cost?',
        description: 'It depends on what you need. We always quote up front, with no surprises.',
      },
      {
        title: 'Can I change my booking?',
        description: 'Of course. Just let us know at least 24 hours in advance.',
      },
    ],
  },
  newsletter: {
    heading: 'Stay in the loop',
    body: 'News, offers and the occasional behind-the-scenes. No spam, ever.',
    cta: 'Subscribe',
  },
  cta: {
    heading: 'Ready when you are',
    body: 'Tell us what you need and we’ll take it from there.',
    cta: 'Get in touch',
  },
  contact: {
    eyebrow: 'Contact',
    heading: 'Say hello',
    body: 'Questions, bookings or just a quick hello — we’d love to hear from you.',
    cta: 'Send message',
  },
};

export const ARCHETYPES: Archetype[] = [
  {
    id: 'clinic',
    label: 'healthcare clinic',
    keywords: [
      'clinic',
      'doctor',
      'dentist',
      'dental',
      'medical',
      'health',
      'healthcare',
      'physio',
      'physiotherapy',
      'therapist',
      'therapy',
      'pediatric',
      'vet',
      'veterinary',
      'chiropractor',
      'hospital',
      'optometrist',
    ],
    names: ['Bright Smile Dental', 'Northside Family Clinic', 'Willow Health', 'Harbor Physio'],
    theme: { mode: 'light', accent: 'teal', font: 'sans', radius: 'soft' },
    heroCard: {
      label: 'Next available',
      title: 'Today · 2:30 PM',
      rows: [
        ['Check-up & clean', '45 min'],
        ['Dr. Sarah Chen', 'In-network'],
      ],
      badge: 'Accepting new patients',
    },
    sections: [
      'hero',
      'stats',
      'services',
      'features',
      'team',
      'testimonials',
      'faq',
      'cta',
      'contact',
    ],
    hours: 'Mon–Fri 8am–6pm · Sat 9am–1pm',
    content: {
      hero: {
        eyebrow: 'Accepting new patients{location}',
        heading: 'Gentle, modern care for the whole family',
        body: 'Same-week appointments, clear pricing and a team that actually listens. Your health, handled with care.',
        cta: 'Book an appointment',
        secondaryCta: 'Our services',
      },
      services: {
        eyebrow: 'Services',
        heading: 'Care for every stage of life',
        items: [
          {
            title: 'Check-ups',
            description: 'Thorough, unhurried exams and preventive care.',
            icon: 'shield',
          },
          {
            title: 'Treatments',
            description: 'Modern techniques with comfort in mind.',
            icon: 'heart',
          },
          {
            title: 'Same-day visits',
            description: 'Urgent? We keep slots open every day.',
            icon: 'clock',
          },
          {
            title: 'Family plans',
            description: 'One place for everyone, from toddlers to grandparents.',
            icon: 'users',
          },
          {
            title: 'Online booking',
            description: 'Pick a time that suits you in seconds.',
            icon: 'calendar',
          },
          {
            title: 'Follow-up care',
            description: 'We check in after every treatment.',
            icon: 'smile',
          },
        ],
      },
      features: {
        eyebrow: 'Why patients choose us',
        heading: 'Healthcare that feels human',
        items: [
          { title: 'No long waits', description: 'Average wait under 10 minutes.', icon: 'clock' },
          {
            title: 'Clear pricing',
            description: 'Know the cost before you sit down.',
            icon: 'check',
          },
          {
            title: 'Experienced team',
            description: 'Board-certified and continuously trained.',
            icon: 'award',
          },
          {
            title: 'Calm environment',
            description: 'Designed to put nervous patients at ease.',
            icon: 'heart',
          },
        ],
      },
      stats: {
        heading: 'Trusted care',
        items: [
          { title: '15+', description: 'Years in practice' },
          { title: '8,000', description: 'Patients cared for' },
          { title: '4.9★', description: 'Google rating' },
          { title: 'Same day', description: 'Urgent appointments' },
        ],
      },
      team: {
        eyebrow: 'Our team',
        heading: 'Meet your care team',
        items: [
          {
            title: 'Dr. Sarah Chen',
            meta: 'Lead Physician',
            description: '15 years of family practice.',
          },
          {
            title: 'Dr. James Okafor',
            meta: 'Specialist',
            description: 'Calm hands, clear explanations.',
          },
          {
            title: 'Maya Patel',
            meta: 'Patient Coordinator',
            description: 'Makes booking and billing easy.',
          },
        ],
      },
      testimonials: {
        eyebrow: 'Patient stories',
        heading: 'Patients who feel at home',
        items: [
          {
            title: 'I used to dread appointments. Not anymore — everyone here is so kind.',
            meta: 'Hannah R.',
          },
          {
            title: 'Booked online, seen on time, and everything was explained clearly.',
            meta: 'David K.',
          },
          { title: 'The whole family comes here now. Wonderful with our kids.', meta: 'Lucia M.' },
        ],
      },
      faq: {
        eyebrow: 'FAQ',
        heading: 'Good questions',
        items: [
          {
            title: 'Do you accept my insurance?',
            description: 'We work with most major providers. Call us and we’ll check in minutes.',
          },
          {
            title: 'Can I book online?',
            description: 'Yes — pick any open slot, 24/7, and get a reminder the day before.',
          },
          {
            title: 'What if I need urgent care?',
            description: 'We hold same-day appointments every morning. Call as early as you can.',
          },
        ],
      },
      cta: {
        heading: 'Your next appointment is a click away',
        body: 'New and returning patients welcome. Most visits within the week.',
        cta: 'Book now',
      },
    },
  },
  {
    id: 'restaurant',
    label: 'restaurant',
    keywords: [
      'restaurant',
      'cafe',
      'café',
      'coffee',
      'bakery',
      'bistro',
      'bar',
      'pizza',
      'pizzeria',
      'food',
      'kitchen',
      'diner',
      'brunch',
      'sushi',
      'ramen',
      'tacos',
      'brewery',
      'wine',
      'eatery',
      'patisserie',
      'catering',
    ],
    names: ['Café Luna', 'Ember & Oak', 'The Little Fig', 'Saffron House'],
    theme: { mode: 'light', accent: 'orange', font: 'serif', radius: 'soft' },
    heroCard: {
      label: 'Tonight’s special',
      title: 'Wood-fired burrata pizza',
      rows: [
        ['Open until', '11 PM'],
        ['Tables for two', 'Available'],
      ],
      badge: 'Walk-ins welcome',
    },
    sections: ['hero', 'about', 'menu', 'gallery', 'testimonials', 'cta', 'contact'],
    hours: 'Tue–Sun 11am–11pm',
    content: {
      hero: {
        eyebrow: 'Now open{location}',
        heading: 'Good food, slow evenings, great company',
        body: 'Seasonal plates cooked over fire, natural wines and a room that feels like home. Pull up a chair.',
        cta: 'Reserve a table',
        secondaryCta: 'See the menu',
      },
      about: {
        eyebrow: 'Our story',
        heading: 'Cooked with heart since day one',
        body: '{name} began as a tiny kitchen with a big oven and a simple promise: honest ingredients, cooked well, served warmly. We buy from local growers and change the menu with the seasons.',
      },
      menu: {
        eyebrow: 'Menu',
        heading: 'Seasonal favourites',
        items: [
          {
            title: 'Burrata & heirloom tomato',
            description: 'Basil oil, sea salt, grilled sourdough',
            meta: '$14',
          },
          {
            title: 'Wood-fired margherita',
            description: 'San Marzano, fior di latte, basil',
            meta: '$18',
          },
          {
            title: 'Hand-cut tagliatelle',
            description: 'Brown butter, sage, aged parmesan',
            meta: '$22',
          },
          {
            title: 'Charred broccolini',
            description: 'Chilli, lemon, toasted almonds',
            meta: '$11',
          },
          {
            title: 'Slow-roasted half chicken',
            description: 'Salsa verde, crispy potatoes',
            meta: '$26',
          },
          { title: 'Olive oil cake', description: 'Mascarpone, poached pear', meta: '$9' },
        ],
      },
      gallery: {
        eyebrow: 'Gallery',
        heading: 'From our kitchen',
        items: ['The oven', 'Fresh pasta', 'Dining room', 'Brunch', 'The bar', 'Desserts'].map(
          (title) => ({ title }),
        ),
      },
      testimonials: {
        eyebrow: 'Reviews',
        heading: 'What our guests say',
        items: [
          {
            title: 'The best pizza in town, hands down. The crust alone is worth the trip.',
            meta: 'Elena V.',
          },
          {
            title: 'Warm service, beautiful room and a wine list full of surprises.',
            meta: 'Tom B.',
          },
          { title: 'Our go-to for date night. Never had a bad dish.', meta: 'Aisha & Ben' },
        ],
      },
      cta: {
        heading: 'Save your seat',
        body: 'Book online in seconds — or just walk in, we always keep a few tables free.',
        cta: 'Reserve a table',
      },
    },
  },
  {
    id: 'hotel',
    label: 'boutique hotel',
    keywords: [
      'hotel',
      'resort',
      'villa',
      'bnb',
      'b&b',
      'inn',
      'lodge',
      'retreat',
      'hostel',
      'guesthouse',
      'stay',
      'cabin',
      'airbnb',
      'vacation rental',
    ],
    names: ['Casa Alma', 'The Lantern House', 'Maison Verde', 'Seacliff Lodge'],
    theme: { mode: 'dark', accent: 'amber', font: 'display', radius: 'soft' },
    heroCard: {
      label: 'Your stay',
      title: 'Deluxe Room · 3 nights',
      rows: [
        ['Check-in', 'Fri, 3 PM'],
        ['Breakfast', 'Included'],
      ],
      badge: 'Best rate guaranteed',
    },
    sections: ['hero', 'features', 'rooms', 'gallery', 'testimonials', 'faq', 'cta', 'contact'],
    hours: 'Reception open 24/7',
    content: {
      hero: {
        eyebrow: 'A boutique hotel{location}',
        heading: 'Stay somewhere that stays with you',
        body: 'Twelve rooms, slow mornings, long dinners and a quiet kind of luxury. Book direct for the best rate.',
        cta: 'Check availability',
        secondaryCta: 'Explore rooms',
      },
      features: {
        eyebrow: 'Amenities',
        heading: 'Every comfort, considered',
        items: [
          {
            title: 'Breakfast included',
            description: 'Local produce, served until noon.',
            icon: 'coffee',
          },
          { title: 'Rooftop terrace', description: 'Sunset views and a curated bar.', icon: 'sun' },
          {
            title: 'Concierge',
            description: 'Insider tips and reservations, sorted.',
            icon: 'star',
          },
          {
            title: 'Central location',
            description: 'Steps from the best of the city.',
            icon: 'pin',
          },
        ],
      },
      gallery: {
        eyebrow: 'Gallery',
        heading: 'Take a look around',
        items: ['Lobby', 'Suites', 'Terrace', 'Breakfast', 'Spa', 'Neighbourhood'].map((title) => ({
          title,
        })),
      },
      testimonials: {
        eyebrow: 'Guest reviews',
        heading: 'Guests who didn’t want to leave',
        items: [
          {
            title: 'Every detail was perfect. The staff remembered our names from day one.',
            meta: 'Claire & Henri',
          },
          {
            title: 'The most beautiful room we’ve ever stayed in. Already planning our return.',
            meta: 'Noah S.',
          },
          { title: 'Breakfast on the terrace is something we still talk about.', meta: 'Yuki T.' },
        ],
      },
      faq: {
        eyebrow: 'Good to know',
        heading: 'Before you arrive',
        items: [
          {
            title: 'What time is check-in?',
            description: 'From 3 PM. Early check-in is often possible — just ask.',
          },
          {
            title: 'Is parking available?',
            description: 'Yes, valet parking is available for guests.',
          },
          {
            title: 'What is the cancellation policy?',
            description: 'Free cancellation up to 48 hours before arrival.',
          },
        ],
      },
      cta: {
        heading: 'Your room is waiting',
        body: 'Book direct for our best rate, free breakfast and late check-out.',
        cta: 'Book your stay',
      },
    },
  },
  {
    id: 'salon',
    label: 'salon & spa',
    keywords: [
      'salon',
      'spa',
      'beauty',
      'hair',
      'hairdresser',
      'nails',
      'nail',
      'massage',
      'barber',
      'barbershop',
      'skincare',
      'esthetician',
      'lashes',
      'makeup',
      'wellness',
    ],
    names: ['Bloom Studio', 'Velvet & Co.', 'The Glow Room', 'Sage Spa'],
    theme: { mode: 'light', accent: 'rose', font: 'serif', radius: 'round' },
    heroCard: {
      label: 'Next opening',
      title: 'Tomorrow · 11:00 AM',
      rows: [
        ['Cut & style', '60 min'],
        ['With Sofia', '★ 5.0'],
      ],
      badge: 'Book in 30 seconds',
    },
    sections: ['hero', 'services', 'pricing', 'team', 'gallery', 'testimonials', 'cta', 'contact'],
    hours: 'Tue–Sat 9am–7pm',
    content: {
      hero: {
        eyebrow: 'Hair · Skin · Wellness{location}',
        heading: 'Feel like yourself again',
        body: 'An unhurried studio for cuts, colour and treatments that leave you glowing. Relax — you’re in good hands.',
        cta: 'Book an appointment',
        secondaryCta: 'View services',
      },
      services: {
        eyebrow: 'Services',
        heading: 'Treatments we love',
        items: [
          {
            title: 'Cut & style',
            description: 'Consultation, wash, precision cut and finish.',
            icon: 'star',
            meta: 'from $65',
          },
          {
            title: 'Colour',
            description: 'Balayage, highlights and glossing.',
            icon: 'sun',
            meta: 'from $120',
          },
          {
            title: 'Facials',
            description: 'Tailored to your skin, with visible results.',
            icon: 'smile',
            meta: 'from $90',
          },
          {
            title: 'Massage',
            description: 'Deep tissue, relaxation and hot stone.',
            icon: 'heart',
            meta: 'from $85',
          },
        ],
      },
      pricing: {
        eyebrow: 'Memberships',
        heading: 'Treat yourself, regularly',
        body: 'Monthly memberships for regulars. Pause anytime.',
        items: [
          {
            title: 'Refresh',
            meta: '$59',
            bullets: ['1 blowout a month', '10% off products', 'Priority booking'],
          },
          {
            title: 'Glow',
            meta: '$119',
            highlight: true,
            bullets: ['1 facial or massage', '15% off services', 'Free birthday treat'],
          },
          {
            title: 'Signature',
            meta: '$199',
            bullets: ['2 treatments a month', '20% off everything', 'Guest passes'],
          },
        ],
      },
      team: {
        eyebrow: 'Stylists',
        heading: 'Meet the artists',
        items: [
          {
            title: 'Sofia Rossi',
            meta: 'Creative Director',
            description: 'Colour specialist, 12 years.',
          },
          {
            title: 'Leah Kim',
            meta: 'Senior Stylist',
            description: 'Precision cuts and curly hair.',
          },
          {
            title: 'Nina Alvarez',
            meta: 'Skin Therapist',
            description: 'Facials that actually work.',
          },
        ],
      },
      testimonials: {
        eyebrow: 'Reviews',
        heading: 'Leaving happier than they came',
        items: [
          { title: 'Sofia is a magician. Best colour I’ve ever had.', meta: 'Rachel T.' },
          { title: 'Such a calm space. The facial was pure bliss.', meta: 'Imani O.' },
          { title: 'Finally a salon that listens to what I actually want.', meta: 'Grace L.' },
        ],
      },
      cta: {
        heading: 'Your chair is ready',
        body: 'Book online anytime — reminders included.',
        cta: 'Book now',
      },
    },
  },
  {
    id: 'fitness',
    label: 'fitness studio',
    keywords: [
      'gym',
      'fitness',
      'yoga',
      'pilates',
      'crossfit',
      'trainer',
      'training',
      'personal trainer',
      'boxing',
      'martial',
      'dance',
      'cycling',
      'workout',
      'coach',
      'coaching',
    ],
    names: ['Pulse Athletics', 'Iron & Flow', 'Kinetic Studio', 'Summit Fitness'],
    theme: { mode: 'dark', accent: 'lime', font: 'grotesk', radius: 'soft' },
    heroCard: {
      label: 'This week',
      title: '5 workouts completed',
      rows: [
        ['Next class', 'HIIT · 6:30 PM'],
        ['Streak', '12 days 🔥'],
      ],
      badge: 'First class free',
    },
    sections: ['hero', 'stats', 'features', 'pricing', 'team', 'testimonials', 'faq', 'cta'],
    hours: 'Mon–Fri 6am–10pm · Weekends 8am–6pm',
    content: {
      hero: {
        eyebrow: 'Strength · Conditioning · Community{location}',
        heading: 'Stronger every single week',
        body: 'Coach-led classes, real programming and a community that shows up for you. Your first class is on us.',
        cta: 'Claim free class',
        secondaryCta: 'See classes',
      },
      features: {
        eyebrow: 'Classes',
        heading: 'Train the way you like',
        items: [
          {
            title: 'Strength',
            description: 'Progressive programming for real gains.',
            icon: 'trend',
          },
          { title: 'HIIT', description: '45 minutes. Maximum effort. Big results.', icon: 'zap' },
          { title: 'Mobility', description: 'Move better, recover faster.', icon: 'heart' },
          {
            title: 'Open gym',
            description: 'Premium equipment, whenever you want.',
            icon: 'clock',
          },
        ],
      },
      stats: {
        heading: 'By the numbers',
        items: [
          { title: '60+', description: 'Classes per week' },
          { title: '1,200', description: 'Active members' },
          { title: '12', description: 'Certified coaches' },
          { title: '6am', description: 'First class daily' },
        ],
      },
      pricing: {
        eyebrow: 'Membership',
        heading: 'Pick your plan',
        body: 'No joining fee. No long contracts.',
        items: [
          {
            title: 'Drop-in',
            meta: '$25',
            bullets: ['Any single class', 'Towel service', 'No commitment'],
          },
          {
            title: 'Unlimited',
            meta: '$149',
            highlight: true,
            bullets: ['Unlimited classes', 'Open gym access', 'Monthly InBody scan'],
          },
          {
            title: 'Personal',
            meta: '$299',
            bullets: ['Everything in Unlimited', '4 PT sessions', 'Nutrition plan'],
          },
        ],
      },
      team: {
        eyebrow: 'Coaches',
        heading: 'Coaches who care',
        items: [
          {
            title: 'Marcus Reid',
            meta: 'Head Coach',
            description: 'Strength & conditioning, CSCS.',
          },
          {
            title: 'Ana Torres',
            meta: 'HIIT & Mobility',
            description: 'Former national sprinter.',
          },
          { title: 'Kai Nakamura', meta: 'Yoga', description: 'Breath-led flows for every level.' },
        ],
      },
      testimonials: {
        eyebrow: 'Members',
        heading: 'Real people, real results',
        items: [
          {
            title: 'Down 12kg and stronger than I was at 25. This place changed my life.',
            meta: 'Daniel F.',
          },
          { title: 'The coaches actually know your name and your goals.', meta: 'Priya N.' },
          { title: 'Never thought I’d love 6am workouts. Here we are.', meta: 'Olivia W.' },
        ],
      },
      cta: {
        heading: 'Your first class is free',
        body: 'Come try a session. No pressure, just good training.',
        cta: 'Book free class',
      },
    },
  },
  {
    id: 'saas',
    label: 'software product',
    keywords: [
      'saas',
      'startup',
      'app',
      'software',
      'platform',
      'ai',
      'tool',
      'product',
      'api',
      'dashboard',
      'analytics',
      'crm',
      'fintech',
      'b2b',
      'developer',
      'devtool',
      'automation',
      'productivity',
    ],
    names: ['Flowbase', 'Northstar AI', 'Launchpad', 'Relay'],
    theme: { mode: 'dark', accent: 'violet', font: 'sans', radius: 'soft' },
    heroCard: {
      label: 'Live dashboard',
      title: '+248% conversion',
      rows: [
        ['Active users', '12,480'],
        ['Time saved', '18 h / week'],
      ],
      badge: 'New: AI workflows',
    },
    sections: ['hero', 'logos', 'features', 'stats', 'pricing', 'testimonials', 'faq', 'cta'],
    content: {
      hero: {
        eyebrow: 'Introducing {name}',
        heading: 'Ship faster with less busywork',
        body: '{name} automates the repetitive parts of your day so your team can focus on work that matters. Set up in minutes.',
        cta: 'Start free trial',
        secondaryCta: 'Book a demo',
      },
      logos: {
        heading: 'Powering 4,000+ fast-moving teams',
        items: ['Vercelia', 'Linearly', 'Notionly', 'Rampart', 'Figmata', 'Loomly'].map(
          (title) => ({ title }),
        ),
      },
      features: {
        eyebrow: 'Features',
        heading: 'Everything your team needs to move fast',
        items: [
          {
            title: 'Automations',
            description: 'Turn repetitive work into one-click workflows.',
            icon: 'zap',
          },
          {
            title: 'Real-time analytics',
            description: 'See what’s working the moment it happens.',
            icon: 'trend',
          },
          {
            title: 'Collaboration',
            description: 'Comments, mentions and shared views built in.',
            icon: 'users',
          },
          {
            title: 'Enterprise security',
            description: 'SOC 2, SSO and granular permissions.',
            icon: 'shield',
          },
          {
            title: 'Integrations',
            description: 'Connect the 100+ tools you already use.',
            icon: 'layers',
          },
          { title: 'Global scale', description: '99.99% uptime across 30 regions.', icon: 'globe' },
        ],
      },
      stats: {
        heading: 'Results that compound',
        items: [
          { title: '4,000+', description: 'Teams onboard' },
          { title: '18h', description: 'Saved per person weekly' },
          { title: '99.99%', description: 'Uptime' },
          { title: '4.9/5', description: 'Average review' },
        ],
      },
      pricing: {
        eyebrow: 'Pricing',
        heading: 'Start free. Scale when you’re ready.',
        body: '14-day free trial on every plan. No credit card required.',
        items: [
          {
            title: 'Starter',
            meta: '$0',
            bullets: ['Up to 3 users', '100 automations/mo', 'Community support'],
          },
          {
            title: 'Pro',
            meta: '$29',
            highlight: true,
            bullets: [
              'Unlimited users',
              'Unlimited automations',
              'Advanced analytics',
              'Priority support',
            ],
          },
          {
            title: 'Enterprise',
            meta: 'Custom',
            bullets: ['SSO & SCIM', 'Dedicated success manager', 'Custom contracts'],
          },
        ],
      },
      testimonials: {
        eyebrow: 'Customers',
        heading: 'Teams love {name}',
        items: [
          {
            title: 'We replaced four tools with {name} and cut our weekly ops time in half.',
            meta: 'Lena Fischer · COO, Brightwave',
          },
          {
            title: 'The onboarding was so smooth our whole team was live the same afternoon.',
            meta: 'Marcus Hill · Head of Ops, Tandem',
          },
          {
            title: 'It just works. Rare for software, and exactly what we needed.',
            meta: 'Ravi Menon · CTO, Pinecone Labs',
          },
        ],
      },
      faq: {
        eyebrow: 'FAQ',
        heading: 'Frequently asked questions',
        items: [
          {
            title: 'Is there a free plan?',
            description: 'Yes — Starter is free forever for small teams.',
          },
          {
            title: 'Can I cancel anytime?',
            description: 'Absolutely. Plans are month-to-month, cancel in one click.',
          },
          {
            title: 'Is my data secure?',
            description:
              'Data is encrypted at rest and in transit. We are SOC 2 Type II certified.',
          },
        ],
      },
      cta: {
        heading: 'Ready to get your time back?',
        body: 'Join thousands of teams already moving faster with {name}.',
        cta: 'Start free trial',
      },
    },
  },
  {
    id: 'portfolio',
    label: 'portfolio',
    keywords: [
      'portfolio',
      'photographer',
      'photography',
      'designer',
      'artist',
      'freelancer',
      'freelance',
      'illustrator',
      'personal',
      'resume',
      'cv',
      'creative',
      'writer',
      'architect',
      'videographer',
    ],
    names: ['Ava Laurent', 'Studio Mori', 'Leo Hart', 'Jun Park'],
    theme: { mode: 'light', accent: 'zinc', font: 'display', radius: 'sharp' },
    heroCard: {
      label: 'Currently',
      title: 'Booking for spring',
      rows: [
        ['Based in', 'Worldwide'],
        ['Response time', '< 24h'],
      ],
      badge: 'Available for work',
    },
    sections: ['hero', 'gallery', 'about', 'services', 'testimonials', 'contact'],
    content: {
      hero: {
        eyebrow: '{name}{location}',
        heading: 'Quiet images with loud stories',
        body: 'Independent creative working with brands, publications and people who care about craft. Selected work below.',
        cta: 'View work',
        secondaryCta: 'Get in touch',
      },
      gallery: {
        eyebrow: 'Selected work',
        heading: 'Recent projects',
        items: [
          'Northern Light',
          'Concrete & Clay',
          'Studio Portraits',
          'Coastline',
          'Mono Series',
          'Field Notes',
        ].map((title) => ({ title })),
      },
      about: {
        eyebrow: 'About',
        heading: 'Hi, I’m {name}',
        body: 'For the past decade I’ve helped brands and individuals tell honest stories through considered, timeless work. I believe in slow process, clear communication and results you’re proud to share.',
      },
      services: {
        eyebrow: 'Services',
        heading: 'How we can work together',
        items: [
          {
            title: 'Brand campaigns',
            description: 'Concept to delivery for launches and seasons.',
            icon: 'star',
          },
          {
            title: 'Editorial',
            description: 'Stories for magazines and online publications.',
            icon: 'book',
          },
          {
            title: 'Portraits',
            description: 'Natural, unforced portraits for people and teams.',
            icon: 'smile',
          },
        ],
      },
      testimonials: {
        eyebrow: 'Clients',
        heading: 'Kind words',
        items: [
          {
            title: 'A true collaborator. The work elevated our entire brand.',
            meta: 'Mia Chen · Creative Lead, Arlo',
          },
          {
            title: 'Calm, prepared and endlessly talented.',
            meta: 'Oscar Diaz · Editor, Field Magazine',
          },
        ],
      },
      contact: {
        eyebrow: 'Contact',
        heading: 'Let’s make something',
        body: 'Tell me about your project — I reply within a day.',
        cta: 'Send message',
      },
    },
  },
  {
    id: 'agency',
    label: 'professional services firm',
    keywords: [
      'agency',
      'marketing',
      'consulting',
      'consultant',
      'consultancy',
      'law',
      'lawyer',
      'attorney',
      'legal',
      'accountant',
      'accounting',
      'finance',
      'firm',
      'real estate',
      'realtor',
      'architecture',
      'construction',
      'plumber',
      'electrician',
      'cleaning',
    ],
    names: ['Meridian Partners', 'Atlas & Co.', 'Brightline Advisory', 'Keystone Group'],
    theme: { mode: 'light', accent: 'blue', font: 'sans', radius: 'soft' },
    heroCard: {
      label: 'Client results',
      title: '$2.4M saved in 2025',
      rows: [
        ['Projects delivered', '320+'],
        ['Client retention', '96%'],
      ],
      badge: 'Free consultation',
    },
    sections: ['hero', 'logos', 'services', 'stats', 'testimonials', 'team', 'cta', 'contact'],
    hours: 'Mon–Fri 9am–6pm',
    content: {
      hero: {
        eyebrow: 'Trusted advisors{location}',
        heading: 'Clear advice. Measurable results.',
        body: '{name} helps ambitious businesses make better decisions, faster — with senior expertise and zero jargon.',
        cta: 'Book a free consultation',
        secondaryCta: 'Our services',
      },
      services: {
        eyebrow: 'Services',
        heading: 'How we help',
        items: [
          { title: 'Strategy', description: 'Find the plays that move the needle.', icon: 'trend' },
          { title: 'Operations', description: 'Cut waste and scale what works.', icon: 'layers' },
          {
            title: 'Advisory',
            description: 'Senior guidance whenever you need it.',
            icon: 'users',
          },
          {
            title: 'Compliance',
            description: 'Stay protected without slowing down.',
            icon: 'shield',
          },
          { title: 'Growth', description: 'Marketing and sales that compound.', icon: 'zap' },
          { title: 'Reporting', description: 'Numbers you actually understand.', icon: 'check' },
        ],
      },
      testimonials: {
        eyebrow: 'Clients',
        heading: 'Partnerships that last',
        items: [
          {
            title: '{name} found savings we didn’t know existed. Paid for itself in a month.',
            meta: 'Sarah J. · CEO, Coastal Goods',
          },
          {
            title: 'Straight answers, fast turnaround and genuinely good people.',
            meta: 'Mike R. · Founder, Fieldwork',
          },
          {
            title: 'They feel like part of our team, not a vendor.',
            meta: 'Anita P. · CFO, Lumen Health',
          },
        ],
      },
      cta: {
        heading: 'Let’s talk about your goals',
        body: 'A free 30-minute call. No obligation, just clarity.',
        cta: 'Book a call',
      },
    },
  },
  {
    id: 'education',
    label: 'education',
    keywords: [
      'school',
      'tutor',
      'tutoring',
      'teacher',
      'course',
      'courses',
      'academy',
      'learning',
      'class',
      'classes',
      'education',
      'kindergarten',
      'preschool',
      'daycare',
      'language',
      'music lessons',
      'bootcamp',
    ],
    names: ['Brightpath Academy', 'Little Oaks', 'Lumen Learning', 'The Study Room'],
    theme: { mode: 'light', accent: 'indigo', font: 'rounded', radius: 'round' },
    heroCard: {
      label: 'Next session',
      title: 'Algebra Foundations',
      rows: [
        ['Starts', 'Monday, 4 PM'],
        ['Seats left', '3 of 8'],
      ],
      badge: 'Free trial lesson',
    },
    sections: ['hero', 'features', 'stats', 'pricing', 'testimonials', 'faq', 'cta', 'contact'],
    content: {
      hero: {
        eyebrow: 'Enrolling now{location}',
        heading: 'Learning that clicks',
        body: 'Small groups, expert teachers and a plan built around every learner. Watch confidence grow week by week.',
        cta: 'Book a free trial',
        secondaryCta: 'View courses',
      },
      features: {
        eyebrow: 'Courses',
        heading: 'Programs for every learner',
        items: [
          { title: 'Maths', description: 'From fundamentals to exam prep.', icon: 'layers' },
          {
            title: 'English',
            description: 'Reading, writing and confident speaking.',
            icon: 'book',
          },
          { title: 'Science', description: 'Hands-on, curiosity-first lessons.', icon: 'zap' },
          {
            title: 'Exam prep',
            description: 'Strategy, practice and calm on the day.',
            icon: 'award',
          },
        ],
      },
      stats: {
        heading: 'Proven progress',
        items: [
          { title: '92%', description: 'Improve a grade within a term' },
          { title: '1:6', description: 'Teacher-to-student ratio' },
          { title: '600+', description: 'Students taught' },
          { title: '4.9★', description: 'Parent rating' },
        ],
      },
      pricing: {
        eyebrow: 'Plans',
        heading: 'Simple monthly plans',
        items: [
          {
            title: 'Weekly',
            meta: '$120',
            bullets: ['1 session per week', 'Progress reports', 'Homework help'],
          },
          {
            title: 'Twice weekly',
            meta: '$220',
            highlight: true,
            bullets: ['2 sessions per week', 'Monthly parent call', 'Practice materials'],
          },
          {
            title: 'Intensive',
            meta: '$380',
            bullets: ['4 sessions per week', 'Mock exams', '1:1 check-ins'],
          },
        ],
      },
      testimonials: {
        eyebrow: 'Parents & students',
        heading: 'Confidence, unlocked',
        items: [
          {
            title: 'My daughter went from dreading maths to asking for extra problems.',
            meta: 'Parent of Year 8 student',
          },
          {
            title: 'The teachers explain things in a way that finally makes sense.',
            meta: 'Leo, age 15',
          },
          {
            title: 'Friendly, organised and truly invested in every child.',
            meta: 'Parent of Year 5 student',
          },
        ],
      },
      cta: {
        heading: 'Start with a free lesson',
        body: 'Meet the teacher, see the approach, no commitment.',
        cta: 'Book free trial',
      },
    },
  },
  {
    id: 'shop',
    label: 'online shop',
    keywords: [
      'shop',
      'store',
      'boutique',
      'ecommerce',
      'e-commerce',
      'clothing',
      'fashion',
      'jewelry',
      'jewellery',
      'candles',
      'candle',
      'ceramics',
      'skincare brand',
      'products',
      'merch',
      'florist',
      'flowers',
      'bookstore',
      'tea',
    ],
    names: ['Hearth & Home', 'Kindred Goods', 'Wildflower Co.', 'Oak & Ash'],
    theme: { mode: 'light', accent: 'emerald', font: 'serif', radius: 'soft' },
    heroCard: {
      label: 'Just dropped',
      title: 'The Autumn Collection',
      rows: [
        ['Free shipping', 'Over $50'],
        ['Returns', '30 days'],
      ],
      badge: 'Handmade in small batches',
    },
    sections: ['hero', 'products', 'features', 'about', 'testimonials', 'newsletter', 'contact'],
    content: {
      hero: {
        eyebrow: 'Handmade goods{location}',
        heading: 'Made slowly. Made to last.',
        body: 'Small-batch goods crafted by hand from honest materials. Things you’ll use every day and keep for years.',
        cta: 'Shop the collection',
        secondaryCta: 'Our story',
      },
      features: {
        eyebrow: 'Why shop with us',
        heading: 'The little things matter',
        items: [
          { title: 'Free shipping', description: 'On every order over $50.', icon: 'box' },
          { title: '30-day returns', description: 'Not in love? Send it back.', icon: 'heart' },
          {
            title: 'Sustainably made',
            description: 'Natural materials, plastic-free packaging.',
            icon: 'globe',
          },
          { title: 'Secure checkout', description: 'All major cards and wallets.', icon: 'shield' },
        ],
      },
      about: {
        eyebrow: 'Our story',
        heading: 'From our workshop to your home',
        body: '{name} started at a kitchen table with a handful of materials and a lot of patience. Today every piece is still made by hand by our small team.',
      },
      testimonials: {
        eyebrow: 'Reviews',
        heading: 'Five stars, five hundred times',
        items: [
          {
            title: 'Even more beautiful in person. Packaging was gorgeous too.',
            meta: 'Emma L. ★★★★★',
          },
          { title: 'My third order — makes the perfect gift every time.', meta: 'Jonah P. ★★★★★' },
        ],
      },
      newsletter: {
        heading: 'Get 10% off your first order',
        body: 'Join the list for new drops and studio news.',
        cta: 'Join',
      },
    },
  },
];

export const BUSINESS: Archetype = {
  id: 'business',
  label: 'business',
  keywords: [],
  names: ['Northwind Studio', 'Bluebird & Co.', 'Evergreen Collective', 'Lumen Works'],
  theme: { mode: 'light', accent: 'violet', font: 'sans', radius: 'soft' },
  heroCard: {
    label: 'This month',
    title: '120 happy customers',
    rows: [
      ['Response time', 'Under 1 hour'],
      ['Rating', '4.9 ★'],
    ],
    badge: 'Now booking',
  },
  sections: ['hero', 'features', 'services', 'testimonials', 'faq', 'cta', 'contact'],
  content: {},
};

export function getArchetype(id: string): Archetype {
  return ARCHETYPES.find((a) => a.id === id) ?? BUSINESS;
}
