// Industry profiles for the premium demo design: photos, words, services, fonts and colours per kind of business.
// Rules: words describe the CATEGORY in general (no prices, no invented reviews, awards, years or guarantees);
// every photo is a licensed Unsplash stock photo checked by eye to show that industry; the page labels them "Sample photos".
import type { Palette } from './salon';

export interface Service { title: string; text: string; icon: string; match?: RegExp }
export interface Profile {
  id: string;
  kicker: string;                 // small line above the name
  lead: (city: string) => string; // first sentence under the name
  servicesTitle: string;          // big heading of the services section
  services: Service[];            // matched ones first, then the first defaults, 4 shown
  note: string;                   // under the services
  expKicker: string; expTitle: string; expText: string;
  galleryTitle: string;
  stepsTitle: string; steps: [string, string][];
  finalTitle: string;
  people: string;                 // "clients", "customers", "guests", "patients"
  primary: string;                // main button ("Book on WhatsApp")
  navCta: string;                 // short button in the menu / phone bar
  callLabel: string;
  waText: string;                 // WhatsApp message the visitor sends
  photos: { hero: string; side: string; small: string; exp: string; gallery: string[] };
  font: { display: string; body: string; google: string; weight: number };
  palettes: Palette[];
}

const I = {
  hair: '<path d="M6 3c4 2 6 6 6 11M18 3c-4 2-6 6-6 11M8 21c0-4 1.5-7 4-7s4 3 4 7"/>',
  face: '<circle cx="12" cy="12" r="8"/><path d="M8.5 14c1 1.2 2.1 1.8 3.5 1.8s2.5-.6 3.5-1.8M9 10h.01M15 10h.01"/>',
  makeup: '<path d="M9 21h6M10 21V11h4v10M11 11V6l2-3v8"/>',
  nails: '<path d="M8 21V10a4 4 0 0 1 8 0v11"/><path d="M10 6.5C10 4 11 3 12 3s2 1 2 3.5"/>',
  scissors: '<path d="M4 20 20 4M7 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM17 14a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/>',
  heart: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  car: '<path d="M5 16h14M3 16v-3l2-5h14l2 5v3h-2M5 16H3M7 16a2 2 0 1 0 0 .01M17 16a2 2 0 1 0 0 .01"/><path d="M6 11h12"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  seat: '<path d="M7 4h6l1 9H8zM6 13h10l1 4H5zM7 17v3M15 17v3"/>',
  shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16 10 8h5l3 8M10 8 8 5h3"/>',
  home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  sofa: '<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3M3 11h18v6H3zM5 17v2M19 17v2"/>',
  bath: '<path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM6 12V6a2 2 0 0 1 4 0"/>',
  bug: '<path d="M9 7a3 3 0 0 1 6 0M8 9h8v6a4 4 0 0 1-8 0zM4 13h4M16 13h4M5 8l3 2M19 8l-3 2M5 19l3-2M19 19l-3-2"/>',
  cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3v3M11 3v3M14 3v3"/>',
  cake: '<path d="M4 20h16M5 20v-7h14v7M8 13V9M12 13V9M16 13V9M8 6h.01M12 6h.01M16 6h.01"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7"/>',
  plate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3.5"/><path d="M2 5v6M22 5v14"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  group: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5M14 15c3 0 8 1 8 5"/>',
  dumbbell: '<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>',
  run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 12l3-4 4 1 3 3 3 1"/>',
  tooth: '<path d="M7 4c2 0 3 1 5 1s3-1 5-1 3 2 3 5-1 4-2 7-1 5-2 5-1.5-4-4-4-2 4-4 4-1-2-2-5-2-4-2-7 1-5 3-5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="10"/>',
  wrench: '<path d="M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z"/>',
  bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  pipe: '<path d="M4 6h6v4h6v8M4 10h2M14 18h6"/><path d="M4 4v8M20 16v4"/>',
  brush: '<path d="M18 3l3 3-9 9-3-3zM9 12l-3 3c-2 0-3 2-3 6 4 0 6-1 6-3l3-3"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
};

const serif = (family: string, google: string, weight = 500) => ({ display: `'${family}',Georgia,serif`, body: "'Manrope',system-ui,sans-serif", google: `${google}&family=Manrope:wght@400;500;700`, weight });
const sans = (family: string, google: string, weight = 700) => ({ display: `'${family}',system-ui,sans-serif`, body: "'Inter',system-ui,sans-serif", google: `${google}&family=Inter:wght@400;500;700`, weight });

const P = (ink: string, accent: string, soft: string, paper: string): Palette => ({ ink, accent, soft, paper });

const SALON: Profile = {
  id: 'salon', kicker: 'Salon & beauty',
  lead: (c) => `Hair, skin and beauty care${c ? ` in ${c}` : ''}. Walk in, relax, and leave feeling your best.`,
  servicesTitle: 'Care that makes<br>you feel new.',
  services: [
    { title: 'Hair', text: 'Cuts, styling, colour and treatments — for the look you came in for.', icon: I.hair },
    { title: 'Skin & facials', text: 'Facials and clean-ups that leave your skin calm, clear and glowing.', icon: I.face },
    { title: 'Bridal & make-up', text: 'Make-up for parties, functions and your big day.', icon: I.heart, match: /bridal/ },
    { title: 'Make-up', text: 'Make-up for parties, functions and your big day.', icon: I.makeup, match: /make-?up|mehndi/ },
    { title: 'Nails', text: 'Manicures, pedicures and nail art, done neatly and hygienically.', icon: I.nails, match: /nail/ },
    { title: 'Men’s grooming', text: 'Sharp cuts, beard styling and grooming for men.', icon: I.scissors, match: /barber|unisex|\bmen/ },
    { title: 'Waxing & threading', text: 'Quick, gentle and hygienic hair removal.', icon: I.nails },
  ],
  note: 'Full menu and prices on WhatsApp — we reply quickly.',
  expKicker: 'The experience', expTitle: 'A calm chair. An honest consult. A finish you’ll love.', expText: 'Tell us what you want, and we’ll take care of the rest.',
  galleryTitle: 'Inspiration',
  stepsTitle: 'Book in a minute', steps: [['Message us on WhatsApp', 'Tell us the service you want.'], ['Pick a time', 'We confirm a slot that suits you.'], ['Walk in and relax', 'We’ll be ready for you.']],
  finalTitle: 'Your next look starts here.', people: 'clients',
  primary: 'Book on WhatsApp', navCta: 'Book now', callLabel: 'Call the salon', waText: "I'd like to book an appointment.",
  photos: { hero: '1600948836101-f9ffda59d250', side: '1522337360788-8b13dee7a37e', small: '1604654894610-df63bc536371', exp: '1595476108010-b4d1f102b1b1', gallery: ['1487412947147-5cebf100ffc2', '1522337360788-8b13dee7a37e', '1604654894610-df63bc536371', '1560066984-138dadb4c035'] },
  font: serif('Bodoni Moda', 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,500;1,6..96,500'),
  palettes: [P('#1b1614', '#9a5b3c', '#efe4da', '#fbf8f5'), P('#2a1824', '#b0657a', '#f3e3e6', '#fdf8f8'), P('#14211d', '#3f7a63', '#e3eee8', '#f8fbf9'), P('#17151f', '#a07c3b', '#efe8da', '#fbf9f4')],
};

const CARWASH: Profile = {
  id: 'carwash', kicker: 'Car wash & detailing',
  lead: (c) => `Foam wash, interior cleaning and detailing${c ? ` in ${c}` : ''}. Drive in dusty — drive out shining.`,
  servicesTitle: 'Every car leaves<br>looking new.',
  services: [
    { title: 'Foam wash', text: 'A thorough exterior wash that lifts dust and grime without scratching the paint.', icon: I.drop },
    { title: 'Interior cleaning', text: 'Vacuum, dashboard and seat cleaning for a fresh cabin.', icon: I.seat },
    { title: 'Polish & wax', text: 'Polishing and waxing for a deep, lasting shine.', icon: I.spark, match: /polish|wax|shine/ },
    { title: 'Detailing', text: 'Careful inside-and-out detailing for cars that deserve extra care.', icon: I.star, match: /detail/ },
    { title: 'Ceramic & coating', text: 'Paint protection that keeps the gloss and makes washing easier.', icon: I.shield, match: /ceramic|coat|ppf|teflon/ },
    { title: 'Bike wash', text: 'Quick, careful washing for two-wheelers too.', icon: I.bike, match: /bike|two.?wheeler|motorcycle/ },
    { title: 'Underbody wash', text: 'Mud and dirt washed away from where you can’t see it.', icon: I.car },
  ],
  note: 'All packages and prices on WhatsApp — we reply quickly.',
  expKicker: 'The finish', expTitle: 'Careful hands. Proper products. A shine you’ll notice.', expText: 'Tell us your car and what it needs — we’ll take it from there.',
  galleryTitle: 'The shine',
  stepsTitle: 'Book a wash in a minute', steps: [['Message us on WhatsApp', 'Tell us your car and the wash you want.'], ['Pick a time', 'We confirm a slot that suits you.'], ['Drive in', 'We’ll be ready for your car.']],
  finalTitle: 'Your car deserves this shine.', people: 'customers',
  primary: 'Book a wash', navCta: 'Book a wash', callLabel: 'Call us', waText: "I'd like to book a car wash.",
  photos: { hero: '1607860108855-64acf2078ed9', side: '1520340356584-f9917d1eea6f', small: '1492144534655-ae79c964c9d7', exp: '1520340356584-f9917d1eea6f', gallery: ['1492144534655-ae79c964c9d7', '1601362840469-51e4d8d58785', '1503376780353-7e6692767b70', '1619405399517-d7fce0f13302'] },
  font: sans('Space Grotesk', 'family=Space+Grotesk:wght@500;700'),
  palettes: [P('#0c1622', '#1f6fd1', '#e3edf9', '#f7f9fc'), P('#101418', '#d2372b', '#f6e2df', '#fafafa'), P('#0d1b1e', '#0f8a8a', '#dff1f0', '#f6fbfb')],
};

const CLEANING: Profile = {
  id: 'cleaning', kicker: 'Home & office cleaning',
  lead: (c) => `Professional cleaning for homes and offices${c ? ` in ${c}` : ''}. Come home to a space that feels fresh again.`,
  servicesTitle: 'A cleaner space,<br>a lighter mind.',
  services: [
    { title: 'Deep home cleaning', text: 'Room-by-room cleaning of floors, surfaces, corners and fittings.', icon: I.home },
    { title: 'Kitchen & bathroom', text: 'Grease, stains and hard-water marks cleaned properly.', icon: I.bath },
    { title: 'Sofa & carpet', text: 'Shampoo and vacuum cleaning for sofas, carpets and mattresses.', icon: I.sofa, match: /sofa|carpet|mattress|upholster/ },
    { title: 'Office cleaning', text: 'Clean, healthy workplaces your team will notice.', icon: I.group, match: /office|commercial/ },
    { title: 'Pest control', text: 'Treatment for common household pests.', icon: I.bug, match: /pest|termite/ },
    { title: 'Move-in / move-out', text: 'A full clean before you move in or after you move out.', icon: I.spark },
  ],
  note: 'Tell us your space on WhatsApp for a quick quote.',
  expKicker: 'How we work', expTitle: 'Trained people. The right tools. Every corner done.', expText: 'Tell us your space and we’ll plan the clean around you.',
  galleryTitle: 'Fresh spaces',
  stepsTitle: 'Get it cleaned in 3 steps', steps: [['Message us on WhatsApp', 'Tell us your space and what needs cleaning.'], ['Get a quote & a time', 'We confirm the plan and a slot that suits you.'], ['Relax', 'Our team arrives and gets it done.']],
  finalTitle: 'Come home to clean.', people: 'customers',
  primary: 'Get a quote', navCta: 'Get a quote', callLabel: 'Call us', waText: "I'd like a quote for cleaning.",
  photos: { hero: '1581578731548-c64695cc6952', side: '1527515637462-cff94eecc1ac', small: '1563453392212-326f5e854473', exp: '1584622650111-993a426fbf0a', gallery: ['1584622650111-993a426fbf0a', '1527515637462-cff94eecc1ac', '1484154218962-a197022b5858', '1600585154340-be6161a56a0c'] },
  font: sans('Plus Jakarta Sans', 'family=Plus+Jakarta+Sans:wght@500;700;800', 800),
  palettes: [P('#0f2a2e', '#11857a', '#dff2ef', '#f7fbfa'), P('#13233d', '#2f6fde', '#e3ecfb', '#f7f9fd'), P('#1d2416', '#5a8f2e', '#e8f1df', '#f9fbf6')],
};

const CAFE: Profile = {
  id: 'cafe', kicker: 'Café',
  lead: (c) => `Good coffee, fresh food and a place to slow down${c ? ` in ${c}` : ''}. Come for a cup, stay for the mood.`,
  servicesTitle: 'Made fresh,<br>served warm.',
  services: [
    { title: 'Coffee', text: 'Hot and cold coffee, made the way you like it.', icon: I.cup },
    { title: 'Bakes & desserts', text: 'Cakes, pastries and sweet things to go with your cup.', icon: I.cake, match: /bak|cake|dessert|pastr|sweet/ },
    { title: 'Tea & shakes', text: 'Teas, shakes and coolers for every mood.', icon: I.leaf, match: /tea|shake|juice/ },
    { title: 'Snacks & meals', text: 'Sandwiches, bites and comfort food, made fresh.', icon: I.plate },
    { title: 'Takeaway', text: 'Grab your favourites to go.', icon: I.bag, match: /takeaway|take.?out|delivery/ },
    { title: 'Hang out', text: 'A cosy corner for friends, work or a quiet hour.', icon: I.group },
  ],
  note: 'Today’s menu and prices on WhatsApp — just ask.',
  expKicker: 'The mood', expTitle: 'Warm cups. Easy music. A table that’s yours.', expText: 'Bring a friend, a book or your laptop — we’ll bring the coffee.',
  galleryTitle: 'From our counter',
  stepsTitle: 'Drop by anytime', steps: [['Message us on WhatsApp', 'Ask about today’s menu.'], ['Come over', 'Find us using the map below.'], ['Sit back', 'We’ll take care of the rest.']],
  finalTitle: 'Your table is waiting.', people: 'guests',
  primary: 'Message on WhatsApp', navCta: 'Say hi', callLabel: 'Call the café', waText: "I'd like to know today's menu.",
  photos: { hero: '1554118811-1e0d58224f24', side: '1509042239860-f550ce710b93', small: '1495474472287-4d71bcdd2085', exp: '1442512595331-e89e73853f31', gallery: ['1495474472287-4d71bcdd2085', '1511920170033-f8396924c348', '1509042239860-f550ce710b93', '1442512595331-e89e73853f31'] },
  font: serif('Fraunces', 'family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500'),
  palettes: [P('#22160f', '#a3582a', '#f1e4d8', '#fbf7f2'), P('#1c1a14', '#6b7a3a', '#ebeedc', '#fafaf4'), P('#241418', '#9c3d4a', '#f4e1e3', '#fcf8f7')],
};

const RESTAURANT: Profile = {
  id: 'restaurant', kicker: 'Restaurant',
  lead: (c) => `Honest food, generous plates and a warm welcome${c ? ` in ${c}` : ''}. Bring your appetite — and your people.`,
  servicesTitle: 'Food worth<br>coming back for.',
  services: [
    { title: 'Dine in', text: 'Sit down, relax and enjoy your meal with family and friends.', icon: I.plate },
    { title: 'Takeaway & delivery', text: 'Your favourites, packed fresh to enjoy at home.', icon: I.bag, match: /takeaway|take.?out|delivery/ },
    { title: 'Family & groups', text: 'Room for family dinners and get-togethers.', icon: I.group },
    { title: 'Parties & catering', text: 'Food for birthdays, functions and office events.', icon: I.star, match: /cater|party|event|banquet/ },
    { title: 'Vegetarian choices', text: 'Plenty of pure-veg dishes on the menu.', icon: I.leaf, match: /veg/ },
    { title: 'Sweets & desserts', text: 'Something sweet to finish your meal.', icon: I.cake },
  ],
  note: 'Full menu and prices on WhatsApp — just ask.',
  expKicker: 'At the table', expTitle: 'Fresh ingredients. Real recipes. Plates made to share.', expText: 'Come hungry — we’ll take care of the rest.',
  galleryTitle: 'From our kitchen',
  stepsTitle: 'Plan your meal', steps: [['Message us on WhatsApp', 'Ask about the menu or a table.'], ['Choose your time', 'We’ll be ready for you.'], ['Enjoy', 'Good food, good company.']],
  finalTitle: 'Hungry? We’re ready.', people: 'guests',
  primary: 'Message on WhatsApp', navCta: 'Contact', callLabel: 'Call us', waText: "I'd like to know about the menu.",
  photos: { hero: '1517248135467-4c7edcad34c4', side: '1585937421612-70a008356fbe', small: '1565557623262-b51c2513a641', exp: '1414235077428-338989a2e8c0', gallery: ['1631515243349-e0cb75fb8d3a', '1601050690597-df0568f70950', '1555396273-367ea4eb4db5', '1585937421612-70a008356fbe'] },
  font: serif('Playfair Display', 'family=Playfair+Display:ital,wght@0,500;1,500'),
  palettes: [P('#1f1210', '#a8321f', '#f4e0d9', '#fcf8f5'), P('#1a1710', '#b07a1f', '#f3e9d4', '#fcfaf4'), P('#10201a', '#2f7a52', '#e0efe6', '#f8fbf9')],
};

const GYM: Profile = {
  id: 'gym', kicker: 'Gym & fitness',
  lead: (c) => `Train hard, feel strong${c ? ` — right here in ${c}` : ''}. Equipment, guidance and energy to keep you going.`,
  servicesTitle: 'Stronger every<br>single week.',
  services: [
    { title: 'Strength training', text: 'Free weights and machines for every level.', icon: I.dumbbell },
    { title: 'Cardio', text: 'Treadmills, bikes and more to build stamina.', icon: I.run },
    { title: 'Personal training', text: 'One-to-one guidance to reach your goal faster.', icon: I.star, match: /personal|trainer|coach/ },
    { title: 'Yoga & group classes', text: 'Classes that keep you moving and motivated.', icon: I.group, match: /yoga|zumba|class|aerobic|crossfit/ },
    { title: 'Fitness guidance', text: 'Advice on workouts and routines that fit you.', icon: I.heart },
  ],
  note: 'Memberships and timings on WhatsApp — just ask.',
  expKicker: 'The floor', expTitle: 'Real equipment. Real people. Real progress.', expText: 'Start where you are — we’ll help you get where you want to be.',
  galleryTitle: 'Inside the gym',
  stepsTitle: 'Start in 3 steps', steps: [['Message us on WhatsApp', 'Tell us your goal.'], ['Visit the gym', 'Look around and meet the team.'], ['Start training', 'Your first step is the hardest — we’ll help.']],
  finalTitle: 'Your strongest self starts here.', people: 'members',
  primary: 'Join on WhatsApp', navCta: 'Join now', callLabel: 'Call us', waText: "I'd like to know about membership.",
  photos: { hero: '1534438327276-14e5300c3a48', side: '1571019613454-1cb2f99b2d8b', small: '1540497077202-7c8a3999166f', exp: '1540497077202-7c8a3999166f', gallery: ['1571019613454-1cb2f99b2d8b', '1534438327276-14e5300c3a48', '1540497077202-7c8a3999166f', '1571019613454-1cb2f99b2d8b'] },
  font: sans('Archivo', 'family=Archivo:wght@600;800', 800),
  palettes: [P('#0e0f12', '#e4572e', '#fbe5dd', '#f8f8f7'), P('#0b1320', '#2563eb', '#e2eafc', '#f7f9fc'), P('#111111', '#c9a227', '#f3ecd5', '#fafaf7')],
};

const CLINIC: Profile = {
  id: 'clinic', kicker: 'Dental & health care',
  lead: (c) => `Gentle, careful treatment${c ? ` in ${c}` : ''}. We explain everything clearly, so you always feel at ease.`,
  servicesTitle: 'Care you can<br>feel good about.',
  services: [
    { title: 'Check-ups', text: 'Regular check-ups to catch problems early.', icon: I.plus },
    { title: 'Cleaning & whitening', text: 'Professional cleaning for a brighter, healthier smile.', icon: I.spark, match: /dent|teeth|tooth|smile/ },
    { title: 'Root canal & fillings', text: 'Treatment that saves teeth and stops pain.', icon: I.tooth, match: /dent|root|tooth/ },
    { title: 'Braces & aligners', text: 'Straighter teeth for children and adults.', icon: I.star, match: /ortho|brace|align/ },
    { title: 'Consultation', text: 'Talk to the doctor and understand your options.', icon: I.chat },
    { title: 'Follow-up care', text: 'We stay with you until you are fully better.', icon: I.heart },
  ],
  note: 'Timings and appointments on WhatsApp — we reply quickly.',
  expKicker: 'Your visit', expTitle: 'A clean clinic. A gentle hand. Clear answers.', expText: 'Ask anything — we’ll explain every step before we begin.',
  galleryTitle: 'Our clinic',
  stepsTitle: 'Book a visit in a minute', steps: [['Message us on WhatsApp', 'Tell us what you need.'], ['Pick a time', 'We confirm a slot that suits you.'], ['Visit the clinic', 'We’ll be ready for you.']],
  finalTitle: 'Your smile, in good hands.', people: 'patients',
  primary: 'Book on WhatsApp', navCta: 'Book a visit', callLabel: 'Call the clinic', waText: "I'd like to book an appointment.",
  photos: { hero: '1629909613654-28e377c37b09', side: '1606811971618-4486d14f3f99', small: '1588776814546-1ffcf47267a5', exp: '1629909613654-28e377c37b09', gallery: ['1606811971618-4486d14f3f99', '1588776814546-1ffcf47267a5', '1629909613654-28e377c37b09', '1606811971618-4486d14f3f99'] },
  font: sans('Plus Jakarta Sans', 'family=Plus+Jakarta+Sans:wght@500;700;800', 800),
  palettes: [P('#0d2433', '#127bb0', '#e0eff7', '#f7fbfd'), P('#10241f', '#14806a', '#dff1ec', '#f7fbfa')],
};

const trades = (o: { id: string; kicker: string; lead: (c: string) => string; services: Service[]; title: string; exp: string; final: string; photos: Profile['photos'] }): Profile => ({
  id: o.id, kicker: o.kicker, lead: o.lead, servicesTitle: o.title, services: o.services,
  note: 'Tell us the job on WhatsApp for a quick quote.',
  expKicker: 'How we work', expTitle: o.exp, expText: 'Tell us the job — we’ll come, check and explain before we start.',
  galleryTitle: 'Our work',
  stepsTitle: 'Get it fixed in 3 steps', steps: [['Message us on WhatsApp', 'Send a photo or tell us the problem.'], ['Get a quote & a time', 'We confirm the work and a slot.'], ['Job done', 'Neat work, cleaned up after.']],
  finalTitle: o.final, people: 'customers',
  primary: 'Get a quote', navCta: 'Get a quote', callLabel: 'Call us', waText: "I'd like a quote for some work.",
  photos: o.photos,
  font: sans('Archivo', 'family=Archivo:wght@600;800', 800),
  palettes: [P('#0f2236', '#e07a1f', '#fbe9d8', '#f8f9fb'), P('#12161c', '#1f6fd1', '#e2ecfa', '#f7f9fc'), P('#14201a', '#d9a21b', '#f6ecd0', '#fafaf6')],
});

const PLUMBER = trades({
  id: 'plumber', kicker: 'Plumbing', title: 'Leaks fixed.<br>Water flowing.',
  lead: (c) => `Repairs, fittings and installations${c ? ` in ${c}` : ''}. Quick to respond, neat at work.`,
  services: [
    { title: 'Leak repairs', text: 'Dripping taps, leaking pipes and seepage fixed.', icon: I.drop },
    { title: 'Bathroom fittings', text: 'Taps, showers, basins and toilets installed.', icon: I.bath },
    { title: 'Pipes & drainage', text: 'Blocked drains cleared and pipelines laid.', icon: I.pipe },
    { title: 'Tanks & motors', text: 'Water tanks, pumps and motor fitting.', icon: I.wrench },
  ],
  exp: 'On time. Clean work. Fixed properly.', final: 'A leak today is a bigger bill tomorrow.',
  photos: { hero: '1585704032915-c3400ca199e7', side: '1607472586893-edb57bdc0e39', small: '1584622650111-993a426fbf0a', exp: '1607472586893-edb57bdc0e39', gallery: ['1585704032915-c3400ca199e7', '1584622650111-993a426fbf0a', '1607472586893-edb57bdc0e39', '1600585154340-be6161a56a0c'] },
});

const ELECTRICIAN = trades({
  id: 'electrician', kicker: 'Electrical services', title: 'Safe wiring.<br>Bright homes.',
  lead: (c) => `Wiring, repairs and installations${c ? ` in ${c}` : ''}. Safe work, done right the first time.`,
  services: [
    { title: 'Wiring & rewiring', text: 'New wiring and safe upgrades for homes and shops.', icon: I.bolt },
    { title: 'Repairs', text: 'Short circuits, tripping and faults found and fixed.', icon: I.wrench },
    { title: 'Fan & light fitting', text: 'Fans, lights and switches installed neatly.', icon: I.spark },
    { title: 'Inverter & appliances', text: 'Inverters, geysers and appliance points set up.', icon: I.shield },
  ],
  exp: 'Safety first. Neat work. Clear pricing.', final: 'Power you can trust.',
  photos: { hero: '1621905251189-08b45d6a269e', side: '1558618666-fcd25c85cd64', small: '1484154218962-a197022b5858', exp: '1558618666-fcd25c85cd64', gallery: ['1621905251189-08b45d6a269e', '1558618666-fcd25c85cd64', '1484154218962-a197022b5858', '1600607687939-ce8a6c25118c'] },
});

const PAINTER = trades({
  id: 'painter', kicker: 'Painting & interiors', title: 'Fresh walls.<br>A new feeling.',
  lead: (c) => `Interior and exterior painting${c ? ` in ${c}` : ''}. Clean lines, even finish, and we tidy up after.`,
  services: [
    { title: 'Interior painting', text: 'Walls and ceilings painted with a smooth, even finish.', icon: I.brush },
    { title: 'Exterior painting', text: 'Weather-resistant paint that protects and looks great.', icon: I.home },
    { title: 'Textures & designs', text: 'Texture walls and accent designs that stand out.', icon: I.spark },
    { title: 'Waterproofing', text: 'Damp and seepage treatment before painting.', icon: I.drop },
  ],
  exp: 'Covered furniture. Clean lines. A finish you’ll love.', final: 'Ready for a fresh look?',
  photos: { hero: '1562259949-e8e7689d7828', side: '1600585154340-be6161a56a0c', small: '1484154218962-a197022b5858', exp: '1600607687939-ce8a6c25118c', gallery: ['1600585154340-be6161a56a0c', '1484154218962-a197022b5858', '1600607687939-ce8a6c25118c', '1562259949-e8e7689d7828'] },
});

const LOCAL: Profile = {
  id: 'local', kicker: 'Local business',
  lead: (c) => `Friendly, reliable service${c ? ` in ${c}` : ''}. Message us and we’ll help you right away.`,
  servicesTitle: 'Here to help,<br>every day.',
  services: [
    { title: 'Quick replies', text: 'Message us on WhatsApp and we answer fast.', icon: I.chat },
    { title: 'Trusted locally', text: 'People nearby rely on us — and come back.', icon: I.heart },
    { title: 'Honest advice', text: 'We tell you what you need, nothing more.', icon: I.shield },
    { title: 'Easy to find', text: 'Directions and opening hours, right below.', icon: I.clock },
  ],
  note: 'Ask us anything on WhatsApp — we reply quickly.',
  expKicker: 'Why us', expTitle: 'Friendly people. Fair service. Real care.', expText: 'Tell us what you need — we’ll take care of it.',
  galleryTitle: 'A look inside',
  stepsTitle: 'Getting started is easy', steps: [['Message us on WhatsApp', 'Tell us what you need.'], ['We reply quickly', 'With answers and a time that suits you.'], ['Done', 'Simple as that.']],
  finalTitle: 'Let’s talk today.', people: 'customers',
  primary: 'Message on WhatsApp', navCta: 'Contact', callLabel: 'Call us', waText: 'I have a question.',
  photos: { hero: '1600880292203-757bb62b4baf', side: '1484154218962-a197022b5858', small: '1600585154340-be6161a56a0c', exp: '1600607687939-ce8a6c25118c', gallery: ['1484154218962-a197022b5858', '1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c', '1600880292203-757bb62b4baf'] },
  font: serif('Fraunces', 'family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,500'),
  palettes: [P('#14202b', '#2b6cb0', '#e2ecf7', '#f8fafc'), P('#1b1614', '#9a5b3c', '#efe4da', '#fbf8f5')],
};

// Order matters: car words first (a "car spa" is not a beauty spa), then specific before general.
const RULES: [RegExp, Profile][] = [
  [/car ?wash|car ?spa|auto ?spa|detailing|car ?care|car ?clean|bike ?wash|automobile|auto ?wash|ceramic coat/, CARWASH],
  [/dent|clinic|doctor|hospital|physio|medical|health ?care|skin ?clinic|ortho/, CLINIC],
  [/salon|beauty|parlou?r|hair|barber|nail|\bspa\b|makeup|make-up|bridal|lash|wax|mehndi/, SALON],
  [/gym|fitness|yoga|crossfit|zumba|workout/, GYM],
  [/clean|maid|housekeep|pest|sanit|laundry|janitor/, CLEANING],
  [/caf[eé]|coffee|\btea\b|bakery|bakes|cake|dessert|patisserie|juice|shake/, CAFE],
  [/restaurant|dhaba|food|biryani|kitchen|pizza|dining|eatery|grill|bistro|tiffin|mess\b|cater|sweets?\b|bar\b/, RESTAURANT],
  [/plumb|sanitary|pipe|bathroom fitting/, PLUMBER],
  [/electric|wiring|inverter/, ELECTRICIAN],
  [/paint|interior|decor|renovat|carpent|contractor|construction|waterproof/, PAINTER],
];

/** Picks the industry profile from the business type first, then its Google categories and name. */
export function profileFor(lead: { business_type: string; services: string[]; name: string }): Profile {
  for (const text of [lead.business_type, lead.services.join(' '), lead.name]) {
    const t = (text ?? '').toLowerCase();
    for (const [re, p] of RULES) if (re.test(t)) return p;
  }
  return LOCAL;
}

/** 4 services: the ones that match the business's real categories first, then the profile's defaults. */
export function pickServices(p: Profile, services: string[], name: string): Service[] {
  const all = `${services.join(' ')} ${name}`.toLowerCase();
  const out = p.services.filter((s, i) => i === 0 || (s.match && s.match.test(all)));
  for (const s of p.services) { if (out.length >= 4) break; if (!s.match && !out.includes(s)) out.push(s); }
  for (const s of p.services) { if (out.length >= 4) break; if (!out.includes(s)) out.push(s); }
  // Salon: "Bridal & make-up" already covers "Make-up".
  return out.filter((s, _, arr) => !(s.title === 'Make-up' && arr.some((x) => x.title === 'Bridal & make-up'))).slice(0, 4);
}
