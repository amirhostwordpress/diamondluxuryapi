/**
 * Full seed script — pushes all static content from the frontend into MySQL.
 * Run once:  node scripts/seed.js
 */

const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const pool = mysql.createPool({
  host: "srv629.hstgr.io",
  port: 3306,
  user: "u184056080_diamonduser",
  password: "Onion@123321",
  database: "u184056080_diamondluxury",
  connectionLimit: 3,
  waitForConnections: true,
});

const photo = (id, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;

// ─────────────────────────────────────────────────────────────────────────────
// AGENTS (must be inserted first — properties FK to them)
// ─────────────────────────────────────────────────────────────────────────────
const agents = [
  { id: 1, name: "Sarah Jones",       role: "Senior Consultant",      email: "sarah@diamondluxury.ae",  phone: "+971501234567", bio: "10+ years placing discerning clients in Dubai's most sought-after addresses.",           image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" },
  { id: 2, name: "Ahmed Hassan",      role: "Luxury Specialist",      email: "ahmed@diamondluxury.ae",  phone: "+971502345678", bio: "Expert in ultra-prime villas across Palm Jumeirah and Emirates Hills.",                  image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80" },
  { id: 3, name: "Nadia Petrov",      role: "Ultra-Prime Specialist", email: "nadia@diamondluxury.ae",  phone: "+971503456789", bio: "Fluent in six languages, serving a global HNWI client base since 2015.",                 image_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80" },
  { id: 4, name: "Omar Khalil",       role: "Senior Advisor",         email: "omar@diamondluxury.ae",   phone: "+971504567890", bio: "Specialises in off-plan investments and developer negotiations.",                         image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" },
  { id: 5, name: "Layla Al Mansoori", role: "Property Consultant",    email: "layla@diamondluxury.ae",  phone: "+971505678901", bio: "Expert in waterfront properties and Palm Jebel Ali developments.",                       image_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80" },
  { id: 6, name: "Fatima Raza",       role: "Property Advisor",       email: "fatima@diamondluxury.ae", phone: "+971506789012", bio: "Specialist in family villas across Al Barari and Dubai Hills Estate.",                   image_url: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&w=400&q=80" },
  { id: 7, name: "Rami Yousef",       role: "Villa Specialist",       email: "rami@diamondluxury.ae",   phone: "+971507890123", bio: "Expert in lagoon communities and Tilal Al Ghaf developments.",                           image_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80" },
  { id: 8, name: "Hana Svensson",     role: "Villa Expert",           email: "hana@diamondluxury.ae",   phone: "+971508901234", bio: "Luxury villa specialist with expertise in Dubai Hills Estate and golf communities.",    image_url: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SALE PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
const saleProperties = [
  {
    slug: "signature-villa-palm-jumeirah",
    title: "Signature Villa on Palm Jumeirah",
    listing_type: "sale", status: "active",
    price: 12500000, price_sqft: 2850, sqft: 4380,
    beds: 5, baths: 6, parking: 3,
    highlights: "Beachfront / Private Pool / Fully Furnished",
    location: "Frond M, Palm Jumeirah, Dubai",
    community: "Palm Jumeirah",
    description: "An exceptional beachfront villa occupying a prime frond position on Palm Jumeirah, this five-bedroom masterpiece offers direct private beach access, an infinity pool, and panoramic views of the Dubai skyline. Fully furnished to the highest specification with Miele appliances and custom Italian joinery throughout.",
    images: [photo("photo-1613490493576-7fde63acd811"), photo("photo-1600596542815-ffad4c1539a9")],
    agent_id: 1,
  },
  {
    slug: "mega-villa-jumeirah-bay-island",
    title: "Mega Villa at Jumeirah Bay Island",
    listing_type: "sale", status: "active",
    price: 22000000, price_sqft: 3600, sqft: 6110,
    beds: 6, baths: 7, parking: 4,
    highlights: "Ocean Front / Infinity Pool / Cinema Room",
    location: "Bulgari Resort & Residences, Jumeirah Bay, Dubai",
    community: "Jumeirah Bay Island",
    description: "Nestled within the exclusive Bulgari Resort & Residences, this iconic six-bedroom mega villa commands sweeping ocean views from every floor. Features include an infinity pool cantilevered over the sea, a dedicated cinema room, wine cellar and a private yacht berth.",
    images: [photo("photo-1600585154526-990dced4db0d"), photo("photo-1600573472592-401b489a3cdc")],
    agent_id: 3,
  },
  {
    slug: "contemporary-estate-emirates-hills",
    title: "Contemporary Estate in Emirates Hills",
    listing_type: "sale", status: "active",
    price: 18900000, price_sqft: 3375, sqft: 5600,
    beds: 6, baths: 7, parking: 4,
    highlights: "Golf Course View / Private Lift / Landscaped Garden",
    location: "Sector W, Emirates Hills, Dubai",
    community: "Emirates Hills",
    description: "A stunning contemporary estate in the most prestigious sector of Emirates Hills, overlooking the Montgomerie Golf Course. This architectural masterpiece features six bedrooms, a private lift, temperature-controlled wine room, and an immaculately landscaped garden with a resort-style pool.",
    images: [photo("photo-1600047509807-ba8f99d2cdde"), photo("photo-1600566752355-35792bedcfea")],
    agent_id: 2,
  },
  {
    slug: "waterfront-villa-palm-jebel-ali",
    title: "Waterfront Villa on Palm Jebel Ali",
    listing_type: "sale", status: "active",
    price: 15750000, price_sqft: 3075, sqft: 5120,
    beds: 5, baths: 6, parking: 3,
    highlights: "Beachfront / Private Pool / Sunset Terrace",
    location: "Frond K, Palm Jebel Ali, Dubai",
    community: "Palm Jebel Ali",
    description: "A rare opportunity to own a brand-new beachfront villa on Palm Jebel Ali — the next great address in Dubai. Five bedrooms, a spectacular sunset terrace, private beach and pool, with Nakheel's world-class amenities at your doorstep.",
    images: [photo("photo-1582407947304-fd86f028f716"), photo("photo-1600585154340-be6161a56a0c")],
    agent_id: 5,
  },
  {
    slug: "grand-estate-district-one",
    title: "Grand Estate in District One",
    listing_type: "sale", status: "active",
    price: 11400000, price_sqft: 2325, sqft: 4900,
    beds: 5, baths: 6, parking: 4,
    highlights: "Crystal Lagoon View / Rooftop Terrace / Private Lift",
    location: "District One, MBR City, Dubai",
    community: "District One",
    description: "Set on the shores of the world's largest crystal lagoon, this grand five-bedroom estate in District One offers resort-style living in the heart of Mohammed Bin Rashid City. A rooftop terrace with 360° views, a private lift and landscaped gardens complete this extraordinary home.",
    images: [photo("photo-1512917774080-9991f1c4c750"), photo("photo-1600607687644-c7171b42498b")],
    agent_id: 4,
  },
  {
    slug: "garden-villa-al-barari",
    title: "Garden Villa in Al Barari",
    listing_type: "sale", status: "active",
    price: 9800000, price_sqft: 2060, sqft: 4750,
    beds: 5, baths: 6, parking: 3,
    highlights: "Private Pool / Lush Landscaping / Smart Home",
    location: "The Nest, Al Barari, Dubai",
    community: "Al Barari",
    description: "Tucked within the verdant sanctuary of Al Barari, this five-bedroom garden villa is a serene escape from city life. Set among 60% natural green space, the property features a private pool, an award-winning landscape garden, full smart-home automation and Miele-equipped kitchen.",
    images: [photo("photo-1613977257363-707ba9348227"), photo("photo-1600210492493-0946911123ea")],
    agent_id: 6,
  },
  {
    slug: "signature-villa-tilal-al-ghaf",
    title: "Signature Villa in Tilal Al Ghaf",
    listing_type: "sale", status: "active",
    price: 8600000, price_sqft: 2020, sqft: 4250,
    beds: 5, baths: 6, parking: 3,
    highlights: "Lagoon Access / Private Pool / Contemporary Interiors",
    location: "Harmony, Tilal Al Ghaf, Dubai",
    community: "Tilal Al Ghaf",
    description: "A contemporary signature villa within Meraas's iconic Tilal Al Ghaf community, offering direct lagoon access and a private pool. Five bedrooms with open-plan living, high ceilings, floor-to-ceiling glazing and a seamless indoor-outdoor lifestyle.",
    images: [photo("photo-1600596542815-ffad4c1539a9"), photo("photo-1613490493576-7fde63acd811")],
    agent_id: 7,
  },
  {
    slug: "modern-villa-dubai-hills-estate",
    title: "Modern Villa in Dubai Hills Estate",
    listing_type: "sale", status: "active",
    price: 7900000, price_sqft: 1985, sqft: 3980,
    beds: 4, baths: 5, parking: 3,
    highlights: "Golf View / Private Garden / Maid's Room",
    location: "Parkway Vistas, Dubai Hills Estate, Dubai",
    community: "Dubai Hills Estate",
    description: "A beautifully presented four-bedroom modern villa overlooking the Dubai Hills Golf Club fairway. Part of the exclusive Parkway Vistas enclave, this home features an open-plan kitchen-living-dining, private landscaped garden, maid's room and a three-car garage.",
    images: [photo("photo-1600210491892-03d54c0aaf87"), photo("photo-1600566752355-35792bedcfea")],
    agent_id: 8,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RENTAL PROPERTIES
// ─────────────────────────────────────────────────────────────────────────────
const rentalProperties = [
  {
    slug: "signature-villa-palm-jumeirah-rent",
    title: "Signature Villa on Palm Jumeirah",
    listing_type: "rent", status: "active",
    price: 850000, price_sqft: 194, sqft: 4380,
    beds: 5, baths: 6, parking: 3,
    highlights: "Beachfront / Private Pool / Fully Furnished",
    location: "Frond M, Palm Jumeirah, Dubai",
    community: "Palm Jumeirah",
    description: "Available for annual or short-term lease, this stunning beachfront villa on Palm Jumeirah is offered fully furnished to a five-star standard. Enjoy direct beach access, an infinity pool and panoramic Dubai Marina skyline views.",
    images: [photo("photo-1613490493576-7fde63acd811"), photo("photo-1600596542815-ffad4c1539a9")],
    agent_id: 1,
  },
  {
    slug: "contemporary-estate-emirates-hills-rent",
    title: "Contemporary Estate in Emirates Hills",
    listing_type: "rent", status: "active",
    price: 1200000, price_sqft: 214, sqft: 5600,
    beds: 6, baths: 7, parking: 4,
    highlights: "Golf Course View / Private Lift / Landscaped Garden",
    location: "Sector W, Emirates Hills, Dubai",
    community: "Emirates Hills",
    description: "A prestigious six-bedroom estate available for rent in the heart of Emirates Hills, overlooking the Montgomerie Golf Course. Offered on a flexible annual lease with optional furnishing packages.",
    images: [photo("photo-1600047509807-ba8f99d2cdde"), photo("photo-1600566752355-35792bedcfea")],
    agent_id: 2,
  },
  {
    slug: "grand-estate-district-one-rent",
    title: "Grand Estate in District One",
    listing_type: "rent", status: "active",
    price: 750000, price_sqft: 153, sqft: 4900,
    beds: 5, baths: 6, parking: 4,
    highlights: "Crystal Lagoon View / Rooftop Terrace / Private Lift",
    location: "District One, MBR City, Dubai",
    community: "District One",
    description: "Overlooking the crystal lagoon in MBR City, this five-bedroom estate is available for annual rent. Features include a rooftop terrace, private lift and landscaped gardens with lagoon-side access.",
    images: [photo("photo-1512917774080-9991f1c4c750"), photo("photo-1600607687644-c7171b42498b")],
    agent_id: 4,
  },
  {
    slug: "garden-villa-al-barari-rent",
    title: "Garden Villa in Al Barari",
    listing_type: "rent", status: "active",
    price: 580000, price_sqft: 122, sqft: 4750,
    beds: 5, baths: 6, parking: 3,
    highlights: "Private Pool / Lush Landscaping / Smart Home",
    location: "The Nest, Al Barari, Dubai",
    community: "Al Barari",
    description: "A rare rental opportunity in Al Barari's coveted Nest enclave. This smart five-bedroom villa with private pool and award-winning gardens is available on a 12-month lease with the option to extend.",
    images: [photo("photo-1613977257363-707ba9348227"), photo("photo-1600210492493-0946911123ea")],
    agent_id: 6,
  },
  {
    slug: "modern-villa-dubai-hills-estate-rent",
    title: "Modern Villa in Dubai Hills Estate",
    listing_type: "rent", status: "active",
    price: 480000, price_sqft: 121, sqft: 3980,
    beds: 4, baths: 5, parking: 3,
    highlights: "Golf View / Private Garden / Maid's Room",
    location: "Parkway Vistas, Dubai Hills Estate, Dubai",
    community: "Dubai Hills Estate",
    description: "A four-bedroom modern villa available for rent in Dubai Hills Estate, overlooking the championship golf course. Perfect for families seeking a premium community lifestyle.",
    images: [photo("photo-1600210491892-03d54c0aaf87"), photo("photo-1600566752355-35792bedcfea")],
    agent_id: 8,
  },
  {
    slug: "signature-villa-tilal-al-ghaf-rent",
    title: "Signature Villa in Tilal Al Ghaf",
    listing_type: "rent", status: "active",
    price: 520000, price_sqft: 122, sqft: 4250,
    beds: 5, baths: 6, parking: 3,
    highlights: "Lagoon Access / Private Pool / Contemporary Interiors",
    location: "Harmony, Tilal Al Ghaf, Dubai",
    community: "Tilal Al Ghaf",
    description: "A five-bedroom contemporary villa in Tilal Al Ghaf available for annual rent. Direct lagoon access, private pool and open-plan interiors — the ultimate in modern luxury living.",
    images: [photo("photo-1600596542815-ffad4c1539a9"), photo("photo-1613490493576-7fde63acd811")],
    agent_id: 7,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// OFF-PLAN PROJECTS
// ─────────────────────────────────────────────────────────────────────────────
const offPlanProjects = [
  {
    slug: "the-woodland-residences",
    title: "The Woodland Residences",
    developer: "Emaar Properties",
    location: "Dubai Hills Estate",
    community: "Dubai Hills Estate",
    completion: "Q4 2027",
    price_from: 4200000,
    beds: "3 – 6 BR",
    image_url: photo("photo-1600607687920-4e2a09cf159d", 700),
    tag: "NEW LAUNCH",
    description: "Emaar's landmark nature-inspired development in Dubai Hills Estate, featuring 30 architectural masterpieces surrounded by lush woodland. Residences range from three to six bedrooms with private pools, smart-home integration and seamless access to Dubai Hills Golf Club.",
    is_active: 1,
  },
  {
    slug: "azure-shores-palm-jebel-ali",
    title: "Azure Shores",
    developer: "Nakheel",
    location: "Palm Jebel Ali",
    community: "Palm Jebel Ali",
    completion: "Q2 2028",
    price_from: 6800000,
    beds: "4 – 7 BR",
    image_url: photo("photo-1512453979798-5ea266f8880c", 700),
    tag: "SELLING FAST",
    description: "Nakheel's most anticipated beachfront villa collection on Palm Jebel Ali. Azure Shores offers four to seven-bedroom villas with private beach access, infinity pools and uninterrupted Arabian Gulf views. Flexible 60/40 payment plan available.",
    is_active: 1,
  },
  {
    slug: "infinity-gardens-jumeirah-bay",
    title: "Infinity Gardens",
    developer: "Meraas",
    location: "Jumeirah Bay Island",
    community: "Jumeirah Bay Island",
    completion: "Q1 2028",
    price_from: 9500000,
    beds: "5 – 8 BR",
    image_url: photo("photo-1519501025264-65ba15a82390", 700),
    tag: "EXCLUSIVE",
    description: "Meraas presents Infinity Gardens — an exclusive collection of 12 ultra-prime villas on Jumeirah Bay Island. Each five to eight-bedroom residence is oriented to maximise ocean views, with bespoke interiors by a world-renowned designer and a private jetty for each villa.",
    is_active: 1,
  },
  {
    slug: "crystal-lagoon-villas-district-one-west",
    title: "Crystal Lagoon Villas",
    developer: "Meydan",
    location: "District One West",
    community: "MBR City",
    completion: "Q3 2027",
    price_from: 5100000,
    beds: "4 – 6 BR",
    image_url: photo("photo-1600566753086-00f18fb6b3ea", 700),
    tag: "LIMITED UNITS",
    description: "An exclusive enclave of 48 villas within District One West, each offering direct access to a 7km crystal lagoon. Four to six bedrooms with private pools, smart-home systems and dedicated concierge services. Only limited units remain at pre-launch pricing.",
    is_active: 1,
  },
  {
    slug: "palmiera-residences-the-oasis",
    title: "Palmiera Residences",
    developer: "Emaar Properties",
    location: "The Oasis",
    community: "The Oasis",
    completion: "Q2 2027",
    price_from: 3900000,
    beds: "3 – 5 BR",
    image_url: photo("photo-1600607687644-c7171b42498b", 700),
    tag: "NEW LAUNCH",
    description: "Emaar's Palmiera is a serene collection of contemporary villas within The Oasis — a new master community defined by lush parks, waterways and walking trails. Three to five bedrooms with flexible payment plans and early-bird pricing available now.",
    is_active: 1,
  },
  {
    slug: "elara-waterfront-dubai-maritime-city",
    title: "Elara Waterfront",
    developer: "DAMAC Properties",
    location: "Dubai Maritime City",
    community: "Dubai Maritime City",
    completion: "Q4 2028",
    price_from: 7200000,
    beds: "4 – 7 BR",
    image_url: photo("photo-1600585154340-be6161a56a0c", 700),
    tag: "COMING SOON",
    description: "DAMAC's most ambitious waterfront project — Elara brings a collection of four to seven-bedroom villas to the all-new Dubai Maritime City. Each villa features a private rooftop terrace, yacht parking and panoramic views of the Arabian Gulf and Port Rashid.",
    is_active: 1,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NEWS ARTICLES
// ─────────────────────────────────────────────────────────────────────────────
const newsArticles = [
  {
    slug: "dubai-luxury-market-surge-2026",
    title: "Dubai Real Estate: The Luxury Market Continues to Surge in 2026",
    excerpt: "Transaction volumes in the ultra-prime segment hit a record high in Q3 2026, with villa sales on Palm Jumeirah and Emirates Hills leading the charge. Global investors continue to view Dubai as the world's safest luxury property bet.",
    category: "Market Report",
    image_url: photo("photo-1512453979798-5ea266f8880c", 800),
    read_time: "6 min read",
    is_featured: 1,
    published_at: "2026-10-28 09:00:00",
    body: `<h2>Record Transactions in Q3 2026</h2>
<p>The Dubai luxury real estate market has once again defied global headwinds, recording its highest-ever quarterly transaction volume in Q3 2026. According to Dubai Land Department (DLD) data, ultra-prime properties — defined as transactions above AED 15 million — surged 42% year-on-year, with Palm Jumeirah and Emirates Hills accounting for over 60% of deal flow.</p>
<h2>Who Is Buying?</h2>
<p>European HNWIs remain the dominant buyer group, followed closely by investors from Russia, India and China. The UAE's golden visa programme continues to be a key driver, with an estimated 35% of buyers citing long-term residency as a primary motivation.</p>
<h2>Price Outlook</h2>
<p>Prime villa prices rose an average of 18% in the 12 months to September 2026. Analysts at Knight Frank and Savills both project continued double-digit growth through 2027, citing constrained supply in the ultra-prime segment against a backdrop of robust global demand.</p>`,
  },
  {
    slug: "uae-real-estate-market-2030-forecast",
    title: "The UAE Real Estate Market to Reach AED 2.6 Trillion by 2030",
    excerpt: "Industry analysts share forecasts on what's driving the extraordinary growth of the UAE real estate sector and where the opportunities lie.",
    category: "Market Insights",
    image_url: photo("photo-1519501025264-65ba15a82390", 800),
    read_time: "5 min read",
    is_featured: 0,
    published_at: "2026-10-20 09:00:00",
    body: `<p>A new report by JLL and ValuStrat forecasts the UAE residential real estate market will reach a combined value of AED 2.6 trillion by 2030, driven by population growth, continued government investment in infrastructure and the ongoing appeal of Dubai as a global business hub.</p>`,
  },
  {
    slug: "woodland-residences-launch",
    title: "30 Masterpieces, One Horizon: The Woodland Residences Launch",
    excerpt: "Emaar's latest off-plan project redefines luxury living with nature-inspired architecture and world-class amenities in Dubai Hills Estate.",
    category: "New Developments",
    image_url: photo("photo-1600607687920-4e2a09cf159d", 800),
    read_time: "4 min read",
    is_featured: 0,
    published_at: "2026-10-15 09:00:00",
    body: `<p>Emaar Properties has officially launched The Woodland Residences in Dubai Hills Estate — a collection of 30 signature villas designed by award-winning architects in harmony with the surrounding natural landscape. Prices start from AED 4.2 million for a three-bedroom residence and the development is scheduled for completion in Q4 2027.</p>`,
  },
  {
    slug: "hnwi-investors-choose-dubai",
    title: "Why HNWI Investors Are Choosing Dubai Over London and New York",
    excerpt: "Zero income tax, golden visas and a 24/7 luxury lifestyle — we explore why the world's wealthiest are relocating their real estate portfolios to Dubai.",
    category: "Investment",
    image_url: photo("photo-1486406146926-c627a92ad1ab", 800),
    read_time: "7 min read",
    is_featured: 0,
    published_at: "2026-10-10 09:00:00",
    body: `<p>For the first time since records began, Dubai has surpassed London in the number of ultra-high-net-worth individuals (UHNWIs) purchasing residential property, according to the 2026 Wealth Report by Knight Frank. Zero personal income tax, a stable currency pegged to the USD, and a growing financial services ecosystem are cited as primary factors.</p>`,
  },
  {
    slug: "palm-jebel-ali-ultra-prime-destination",
    title: "Palm Jebel Ali: The Next Ultra-Prime Destination in Dubai",
    excerpt: "With Nakheel's master plan taking shape, Palm Jebel Ali is set to become the most exclusive address in the region. Here's what you need to know.",
    category: "Area Focus",
    image_url: photo("photo-1582407947304-fd86f028f716", 800),
    read_time: "5 min read",
    is_featured: 0,
    published_at: "2026-10-05 09:00:00",
    body: `<p>When Palm Jumeirah was completed, it redefined Dubai's coastline. Now, Palm Jebel Ali — twice the size and twice as ambitious — is set to do the same. Nakheel's master plan includes 80 fronds, 110km of coastline, two hotel islands and an underwater restaurant. Early investors are already seeing 20–30% appreciation on pre-launch prices.</p>`,
  },
  {
    slug: "finance-luxury-villa-dubai-expat",
    title: "How to Finance a Luxury Villa Purchase in Dubai as an Expat",
    excerpt: "A practical guide to mortgage options, eligibility criteria and the best banks offering competitive rates for non-resident buyers in 2026.",
    category: "Buyer's Guide",
    image_url: photo("photo-1600047509807-ba8f99d2cdde", 800),
    read_time: "8 min read",
    is_featured: 0,
    published_at: "2026-09-28 09:00:00",
    body: `<p>Purchasing a luxury villa in Dubai as a non-resident is entirely achievable with the right financial planning. In 2026, expats can finance up to 75% of a property's value through UAE banks, with Emirates NBD, ADCB and ENBD offering the most competitive rates for premium properties.</p>`,
  },
  {
    slug: "top-5-communities-family-living-dubai-2026",
    title: "Top 5 Communities for Family Living in Dubai 2026",
    excerpt: "From Al Barari's lush greenery to District One's crystal lagoons, we rank Dubai's most family-friendly luxury villa communities this year.",
    category: "Lifestyle",
    image_url: photo("photo-1600607687939-ce8a6c25118c", 800),
    read_time: "5 min read",
    is_featured: 0,
    published_at: "2026-09-20 09:00:00",
    body: `<p>Dubai's villa communities offer vastly different lifestyles. For families, the key factors are school proximity, green space, community amenities and security. Our top five for 2026: 1) Dubai Hills Estate, 2) Al Barari, 3) District One, 4) Tilal Al Ghaf, 5) Emirates Hills.</p>`,
  },
  {
    slug: "dubai-golden-visa-property-buyers-2026",
    title: "Dubai Golden Visa: What Property Buyers Need to Know in 2026",
    excerpt: "Updated eligibility, processing times and how investing in Dubai real estate can unlock long-term UAE residency for you and your family.",
    category: "Legal & Visa",
    image_url: photo("photo-1600585154526-990dced4db0d", 800),
    read_time: "6 min read",
    is_featured: 0,
    published_at: "2026-09-12 09:00:00",
    body: `<p>The UAE Golden Visa allows property investors who purchase a property valued at AED 2 million or more to obtain a 10-year renewable residency visa. In 2026, the process has been streamlined further with approvals now issued within 5 working days through the DLD's Golden Visa portal.</p>`,
  },
  {
    slug: "smart-villas-dubai-technology-luxury",
    title: "The Rise of Smart Villas in Dubai — Technology Meets Luxury",
    excerpt: "From AI-powered climate control to biometric security, we explore how technology is transforming Dubai's ultra-prime villa segment.",
    category: "Lifestyle",
    image_url: photo("photo-1613490493576-7fde63acd811", 800),
    read_time: "4 min read",
    is_featured: 0,
    published_at: "2026-09-05 09:00:00",
    body: `<p>Today's ultra-prime buyers expect more than marble and glass — they demand intelligence. The latest generation of Dubai villas integrates AI-powered climate control, biometric entry, automated sunshades, EV charging, solar panels and centralised home management via smartphone. Developers like Emaar and Meraas now offer smart-home packages as standard on all premium launches.</p>`,
  },
  {
    slug: "dubai-short-term-rental-boom",
    title: "Dubai's Short-Term Rental Boom: What Landlords Need to Know",
    excerpt: "Holiday home regulations, licensing requirements and the platforms generating the highest yields for Dubai villa owners in 2026.",
    category: "Market Insights",
    image_url: photo("photo-1600566753086-00f18fb6b3ea", 800),
    read_time: "6 min read",
    is_featured: 0,
    published_at: "2026-08-28 09:00:00",
    body: `<p>Dubai's short-term rental market generated over AED 3.8 billion in 2025 and is set to grow a further 25% in 2026. Holiday home licences, required from the Department of Tourism, can now be obtained within 48 hours online. Premium villa owners on Palm Jumeirah are achieving yields of 7–12% through platforms like Airbnb and Booking.com.</p>`,
  },
  {
    slug: "record-aed-22m-villa-sale-palm-jumeirah",
    title: "Record AED 22M Villa Sale on Palm Jumeirah Sets New Benchmark",
    excerpt: "A Frond M beachfront villa becomes the highest-priced residential transaction on the Palm this year, signalling continued ultra-prime momentum.",
    category: "Market Report",
    image_url: photo("photo-1613977257363-707ba9348227", 800),
    read_time: "3 min read",
    is_featured: 0,
    published_at: "2026-08-20 09:00:00",
    body: `<p>A six-bedroom beachfront villa on Frond M, Palm Jumeirah has sold for AED 22 million — the highest residential transaction recorded on the Palm this year and a new benchmark for the community. The sale was brokered off-market by Diamond Luxury Real Estate and completed within 14 days of the initial enquiry.</p>`,
  },
  {
    slug: "off-plan-vs-ready-investment-dubai",
    title: "Off-Plan vs Ready: Which is the Better Investment in Dubai Today?",
    excerpt: "We break down the risk, reward and timing considerations to help investors decide between off-plan developments and ready-to-move-in villas.",
    category: "Investment",
    image_url: photo("photo-1600210492493-0946911123ea", 800),
    read_time: "7 min read",
    is_featured: 0,
    published_at: "2026-08-12 09:00:00",
    body: `<p>Off-plan properties in Dubai currently trade at a 15–25% discount to comparable ready units. Payment plans of 60/40 or 70/30 make entry highly accessible. However, ready properties offer immediate rental income and no construction risk. Our recommendation: for investors with a 3–5 year horizon, off-plan offers superior returns; for those seeking immediate yield, ready properties win.</p>`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

async function seedAgents(conn) {
  console.log("\n── Seeding agents ──");
  for (const a of agents) {
    const [existing] = await conn.query("SELECT id FROM agents WHERE email = ?", [a.email]);
    if (existing.length > 0) {
      await conn.query(
        `UPDATE agents SET name=?, role=?, phone=?, bio=?, image_url=?, is_active=1 WHERE email=?`,
        [a.name, a.role, a.phone, a.bio, a.image_url, a.email]
      );
      console.log(`  updated  ${a.name}`);
    } else {
      await conn.query(
        `INSERT INTO agents (name, role, email, phone, bio, image_url, is_active) VALUES (?,?,?,?,?,?,1)`,
        [a.name, a.role, a.email, a.phone, a.bio, a.image_url]
      );
      console.log(`  inserted ${a.name}`);
    }
  }
}

async function getAgentIdByEmail(conn, email) {
  const [rows] = await conn.query("SELECT id FROM agents WHERE email = ? LIMIT 1", [email]);
  return rows[0]?.id ?? null;
}

async function seedProperties(conn, properties) {
  console.log("\n── Seeding properties ──");
  const agentEmails = [
    "sarah@diamondluxury.ae",
    "ahmed@diamondluxury.ae",
    "nadia@diamondluxury.ae",
    "omar@diamondluxury.ae",
    "layla@diamondluxury.ae",
    "fatima@diamondluxury.ae",
    "rami@diamondluxury.ae",
    "hana@diamondluxury.ae",
  ];
  // Build agent-index to real DB id map
  const agentMap = {};
  for (let i = 0; i < agentEmails.length; i++) {
    agentMap[i + 1] = await getAgentIdByEmail(conn, agentEmails[i]);
  }

  for (const p of properties) {
    const agentId = agentMap[p.agent_id] ?? null;
    const [existing] = await conn.query("SELECT id FROM properties WHERE slug = ?", [p.slug]);
    if (existing.length > 0) {
      await conn.query(
        `UPDATE properties SET
           title=?, listing_type=?, status=?, price=?, price_sqft=?, sqft=?,
           beds=?, baths=?, parking=?, highlights=?, location=?, community=?,
           description=?, images=?, agent_id=?
         WHERE slug=?`,
        [
          p.title, p.listing_type, p.status, p.price, p.price_sqft, p.sqft,
          p.beds, p.baths, p.parking, p.highlights, p.location, p.community,
          p.description, JSON.stringify(p.images), agentId,
          p.slug,
        ]
      );
      console.log(`  updated  ${p.slug}`);
    } else {
      await conn.query(
        `INSERT INTO properties
           (slug, title, listing_type, status, price, price_sqft, sqft,
            beds, baths, parking, highlights, location, community,
            description, images, agent_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          p.slug, p.title, p.listing_type, p.status, p.price, p.price_sqft, p.sqft,
          p.beds, p.baths, p.parking, p.highlights, p.location, p.community,
          p.description, JSON.stringify(p.images), agentId,
        ]
      );
      console.log(`  inserted ${p.slug}`);
    }
  }
}

async function seedOffPlan(conn) {
  console.log("\n── Seeding off-plan projects ──");
  for (const p of offPlanProjects) {
    const [existing] = await conn.query("SELECT id FROM off_plan_projects WHERE slug = ?", [p.slug]);
    if (existing.length > 0) {
      await conn.query(
        `UPDATE off_plan_projects SET
           title=?, developer=?, location=?, community=?, completion=?,
           price_from=?, beds=?, image_url=?, tag=?, description=?, is_active=?
         WHERE slug=?`,
        [p.title, p.developer, p.location, p.community, p.completion,
         p.price_from, p.beds, p.image_url, p.tag, p.description, p.is_active, p.slug]
      );
      console.log(`  updated  ${p.slug}`);
    } else {
      await conn.query(
        `INSERT INTO off_plan_projects
           (slug, title, developer, location, community, completion, price_from,
            beds, image_url, tag, description, is_active)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [p.slug, p.title, p.developer, p.location, p.community, p.completion,
         p.price_from, p.beds, p.image_url, p.tag, p.description, p.is_active]
      );
      console.log(`  inserted ${p.slug}`);
    }
  }
}

async function seedNews(conn) {
  console.log("\n── Seeding news articles ──");
  for (const a of newsArticles) {
    const [existing] = await conn.query("SELECT id FROM news_articles WHERE slug = ?", [a.slug]);
    if (existing.length > 0) {
      await conn.query(
        `UPDATE news_articles SET
           title=?, excerpt=?, body=?, category=?, image_url=?,
           read_time=?, is_featured=?, published_at=?
         WHERE slug=?`,
        [a.title, a.excerpt, a.body, a.category, a.image_url,
         a.read_time, a.is_featured, a.published_at, a.slug]
      );
      console.log(`  updated  ${a.slug}`);
    } else {
      await conn.query(
        `INSERT INTO news_articles
           (slug, title, excerpt, body, category, image_url, read_time, is_featured, published_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [a.slug, a.title, a.excerpt, a.body, a.category, a.image_url,
         a.read_time, a.is_featured, a.published_at]
      );
      console.log(`  inserted ${a.slug}`);
    }
  }
}

async function seedAdminUser(conn) {
  console.log("\n── Seeding admin user ──");
  const password = "Admin@Diamond2026!";
  const hash = await bcrypt.hash(password, 12);
  const [existing] = await conn.query("SELECT id FROM admin_users WHERE username = 'admin'");
  if (existing.length > 0) {
    await conn.query("UPDATE admin_users SET password_hash=?, email=? WHERE username='admin'",
      [hash, "admin@diamondluxury.ae"]);
    console.log("  updated  admin (password reset)");
  } else {
    await conn.query(
      "INSERT INTO admin_users (username, email, password_hash) VALUES ('admin', 'admin@diamondluxury.ae', ?)",
      [hash]
    );
    console.log("  inserted admin");
  }
  console.log(`  Admin credentials: admin / ${password}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await pool.getConnection();
  try {
    await seedAgents(conn);
    await seedProperties(conn, saleProperties);
    await seedProperties(conn, rentalProperties);
    await seedOffPlan(conn);
    await seedNews(conn);
    await seedAdminUser(conn);

    // Summary counts
    console.log("\n── Verification counts ──");
    const tables = ["agents", "properties", "off_plan_projects", "news_articles", "admin_users"];
    for (const t of tables) {
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM ${t}`);
      console.log(`  ${t.padEnd(25)} ${n} rows`);
    }

    console.log("\n✅ Seed complete!\n");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e.message);
  process.exit(1);
});
