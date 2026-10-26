/* ============================================================
   Everything you might want to edit lives in this file.
   Paths are relative to the quiz page (/quiz/).
   ============================================================ */

/* ---------- People + portraits ----------
   Drop portraits into quiz/images/ with these names (JPG, ~1000px tall,
   portrait orientation works best). `position` is the CSS object-position
   used when cropping, e.g. "50% 20%" keeps faces near the top in frame.
   If a file is missing, an elegant monogram card is shown instead.

   Show logos appear on the intro screen, where the names stay secret until
   the reveal (transparent PNG or SVG). `plate: "light"` puts the logo on a
   cream card, for logos with dark lettering; leave it out for light logos.
   Until a logo file exists, a typographic wordmark of the show is shown. */
export const PEOPLE = {
  kyle: {
    name: "Kyle Cooke",
    firstName: "Kyle",
    initials: "KC",
    show: "Summer House",
    showShort: "Summer House",   // used on portrait captions
    logo: { src: "images/summer-house-logo.png", alt: "Summer House logo", plate: "light" },
    wordmark: { above: "", main: "Summer House", below: "" },
    image: { src: "images/kyle.jpg", position: "50% 18%" },
    alt: "Portrait of Kyle Cooke from Summer House",
  },
  bethenny: {
    name: "Bethenny Frankel",
    firstName: "Bethenny",
    initials: "BF",
    show: "The Real Housewives of New York City",
    showShort: "RHONY",
    logo: { src: "images/rhony-logo.png", alt: "The Real Housewives of New York City logo", plate: "light" },
    wordmark: { above: "The", main: "Real Housewives", below: "of New York City" },
    image: { src: "images/bethenny.jpg", position: "50% 25%" },
    alt: "Portrait of Bethenny Frankel from The Real Housewives of New York City",
  },
};

/* ---------- Cameo videos ----------
   For each person, set ONE of:
   - videoSrc:    a local file (e.g. "../video/kyle.mp4") or a direct link to an
                  .mp4/.mov/.webm file. Plays right on the page.
   - externalUrl: the Cameo share page link. Shows a "Watch on Cameo" button
                  that opens it (Cameo pages can't be embedded).
   You can set both: if videoSrc fails to load, the button is used instead.
   Leave both empty and the card shows a tasteful "coming soon" state. */
export const CAMEOS = {
  kyle: {
    label: "YOUR SUMMER HOUSE CORRESPONDENT",
    videoSrc: "",
    externalUrl: "",
    poster: "",        // optional still image shown before the video plays
  },
  bethenny: {
    label: "YOUR UNFILTERED ADVISOR",
    videoSrc: "",
    externalUrl: "",
    poster: "",
  },
};

/* ---------- Questions ----------
   `persona` decides who gets the point. Options are shown in the order listed
   here (deliberately alternated so the pattern isn't obvious). */
export const QUESTIONS = [
  {
    kicker: "Friday night",
    text: "It’s Friday night. What’s the plan?",
    options: [
      { persona: "kyle", text: "Go out for one drink and somehow end up closing the place." },
      { persona: "bethenny", text: "Go out, observe everyone’s behavior, and have a full psychological profile by 10 PM." },
    ],
  },
  {
    kicker: "Terrible decisions",
    text: "Your friend is making a terrible decision. You…",
    options: [
      { persona: "bethenny", text: "Tell them exactly why it’s a terrible decision. You’re welcome." },
      { persona: "kyle", text: "Support them enthusiastically and deal with the consequences later." },
    ],
  },
  {
    kicker: "Superpower",
    text: "What’s your biggest superpower?",
    options: [
      { persona: "kyle", text: "Making any situation more fun than it has any right to be." },
      { persona: "bethenny", text: "Knowing you’re right before everyone else catches up." },
    ],
  },
  {
    kicker: "Group-chat drama",
    text: "Someone starts drama in the group chat. Your move?",
    options: [
      { persona: "bethenny", text: "Deliver one devastatingly accurate message and mute the chat." },
      { persona: "kyle", text: "Send a voice memo, get emotionally invested, and accidentally make it worse." },
    ],
  },
  {
    kicker: "The million-dollar idea",
    text: "You have a million-dollar idea. What happens next?",
    options: [
      { persona: "bethenny", text: "Build the business plan, identify the market, and make sure everyone knows you’re the founder." },
      { persona: "kyle", text: "Pitch it to everyone you meet, start a brand, and figure out the details later." },
    ],
  },
  {
    kicker: "Being right",
    text: "What’s your relationship with being right?",
    options: [
      { persona: "kyle", text: "I’d rather have fun than win every argument. (But I’m still probably right.)" },
      { persona: "bethenny", text: "I don’t need to win every argument. I just need everyone to know I was right." },
    ],
  },
  {
    kicker: "Dinner party",
    text: "At a dinner party, what’s your role?",
    options: [
      { persona: "bethenny", text: "The one delivering the funniest commentary about everyone at the table." },
      { persona: "kyle", text: "The one getting everyone to take shots and stay for another round." },
    ],
  },
  {
    kicker: "Toxic trait",
    text: "Your most toxic trait is probably…",
    options: [
      { persona: "kyle", text: "I don’t always know when it’s time to call it a night." },
      { persona: "bethenny", text: "I have absolutely no problem telling people what they need to hear." },
    ],
  },
];

/* ---------- Results ---------- */
export const RESULTS = {
  kyle: {
    headline: "IT’S OFFICIAL.",
    name: "YOU’RE KYLE COOKE!",
    subtitle: "The Life of the Party",
    description:
      "You’re the life of the party, a walking side quest, and an enthusiastic supporter of ideas that may or may not survive the weekend. You don’t just enter a room; you turn it into an event.",
    traits: [
      "Social and energetic",
      "Spontaneous and fun-loving",
      "Enthusiastic about new ideas",
      "Occasionally prone to turning a small situation into a whole event",
    ],
    diagnosis: "summer should be fun.",
  },
  bethenny: {
    headline: "IT’S OFFICIAL.",
    name: "YOU’RE BETHENNY FRANKEL!",
    subtitle: "The Unfiltered Boss",
    description:
      "You’re sharp, independent, and rarely without a comeback. You can spot a bad idea, a bad deal, and a bad personality from across the room. Your unsolicited advice is free. The truth hurts.",
    traits: [
      "Sharp and quick-witted",
      "Independent and ambitious",
      "Direct and opinionated",
      "Unafraid to speak her mind",
    ],
    diagnosis: "mention it all.",
  },
  hybrid: {
    headline: "YOU’RE A",
    name: "BRAVO HYBRID!",
    subtitle: "The Party Starter and the Reunion Host",
    description:
      "You’re the rare combination of party starter and brutally honest commentator. You can create the drama and deliver the reunion takedown. You are both the problem and the person explaining the problem.",
    traits: [
      "Social and entertaining",
      "Sharp and outspoken",
      "Equal parts fun and brutally honest",
      "Capable of creating the drama and providing the commentary",
    ],
    diagnosis: "a two-part reunion is inevitable.",
  },
};
