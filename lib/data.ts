export interface SocialGroup {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  color: string;
  bgGradient: string;
}

export interface IntentZone {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  badge: string;
  color: string;
  allowedFlirting: boolean;
  description: string;
}

export interface MoodOption {
  id: string;
  label: string;
  emoji: string;
  category: "peace" | "guidance" | "casual" | "spark";
  hint: string;
}

export const SOCIAL_GROUPS: SocialGroup[] = [
  {
    id: "OPEN",
    name: "Open Circle",
    emoji: "🌟",
    tagline: "Universal & Welcoming",
    description: "Connect with anyone across the globe on life, thoughts, and shared experiences.",
    color: "text-amber-400",
    bgGradient: "from-amber-500/10 to-yellow-500/10 border-amber-500/30",
  },
  {
    id: "BOYS",
    name: "Boys' Circle",
    emoji: "🛡️",
    tagline: "Brotherhood & Honest Talk",
    description: "A judgment-free space for guys to discuss career pressure, fitness, heartbreaks, and mental health.",
    color: "text-blue-400",
    bgGradient: "from-blue-500/10 to-cyan-500/10 border-blue-500/30",
  },
  {
    id: "GIRLS",
    name: "Girls' Lounge",
    emoji: "🌸",
    tagline: "Sisterhood & Safe Space",
    description: "A respectful, supportive space for girls to share life, relationship advice, career, and mutual support.",
    color: "text-pink-400",
    bgGradient: "from-pink-500/10 to-rose-500/10 border-pink-500/30",
  },
  {
    id: "STUDENTS",
    name: "Student & Fresher Hub",
    emoji: "🎓",
    tagline: "College, Roadmaps & Growth",
    description: "For college students and freshers navigating exams, career roadmaps, job hunt, and early 20s struggles.",
    color: "text-emerald-400",
    bgGradient: "from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
  },
  {
    id: "NIGHT_OWLS",
    name: "Late Night Owls",
    emoji: "🌙",
    tagline: "11 PM - 4 AM Deep Conversations",
    description: "For the midnight thinkers, insomniacs, and quiet souls seeking meaningful night-time talks.",
    color: "text-purple-400",
    bgGradient: "from-purple-500/10 to-indigo-500/10 border-purple-500/30",
  },
  {
    id: "TECH",
    name: "Tech & Builders Hub",
    emoji: "💻",
    tagline: "Coders, Designers & Founders",
    description: "Share coding struggles, startup ideas, portfolio feedback, or find a project companion.",
    color: "text-sky-400",
    bgGradient: "from-sky-500/10 to-blue-500/10 border-sky-500/30",
  },
];

export const INTENT_ZONES: IntentZone[] = [
  {
    id: "PEACE",
    name: "Peace & Healing",
    emoji: "🕊️",
    tagline: "Calm, Empathy & Stress Relief",
    badge: "Strictly Platonic & Safe",
    color: "text-teal-400",
    allowedFlirting: false,
    description: "Safe space to vent heavy stress, overthinking, loneliness, or find someone who listens with warmth.",
  },
  {
    id: "GUIDANCE",
    name: "Guidance & Mentorship",
    emoji: "🧭",
    tagline: "Advice, Solutions & Growth",
    badge: "Constructive & Goal-Driven",
    color: "text-amber-400",
    allowedFlirting: false,
    description: "Get or give actionable advice on career, studies, coding roadmaps, and major life decisions.",
  },
  {
    id: "CASUAL",
    name: "Casual Friendship",
    emoji: "☕",
    tagline: "Friendly Banter & Chill Chat",
    badge: "Platonic Friendship",
    color: "text-emerald-400",
    allowedFlirting: false,
    description: "When you are bored and want a fun, wholesome conversation about movies, music, hobbies, or life.",
  },
  {
    id: "SPARK",
    name: "Flirt & Spark",
    emoji: "💫",
    tagline: "Dating, Chemistry & Fun",
    badge: "Consensual Dating Zone",
    color: "text-pink-400",
    allowedFlirting: true,
    description: "Strictly for users who explicitly want romantic vibes and chemistry. Completely isolated from peace zones.",
  },
];

export const MOODS: MoodOption[] = [
  // Peace & Healing Moods
  { id: "stress", label: "Stressed & Overwhelmed", emoji: "🌪️", category: "peace", hint: "Need a calm listening ear to decompress" },
  { id: "heartbreak", label: "Heartbroken / Breakup", emoji: "💔", category: "peace", hint: "Processing pain and seeking healing" },
  { id: "lonely", label: "Feeling Lonely & Unheard", emoji: "🥀", category: "peace", hint: "Just want to feel seen and understood" },
  { id: "overthinking", label: "Heavy Overthinking", emoji: "🌀", category: "peace", hint: "Mind won't stop racing with 'what-ifs'" },
  { id: "vent", label: "Just Want to Vent Safely", emoji: "🤐", category: "peace", hint: "Get things off your chest with zero judgment" },
  { id: "empty", label: "Lost & Lacking Direction", emoji: "🌫️", category: "peace", hint: "Feeling disconnected from purpose lately" },

  // Guidance & Mentorship Moods
  { id: "career_stuck", label: "Feeling Stuck in Career", emoji: "🧗", category: "guidance", hint: "Need advice on job switch or next steps" },
  { id: "coding_help", label: "Coding / Tech Roadmaps", emoji: "💻", category: "guidance", hint: "Confusion in learning programming or projects" },
  { id: "college_exams", label: "College & Exam Pressure", emoji: "📚", category: "guidance", hint: "Managing backlogs, studies, and time" },
  { id: "life_decision", label: "Major Life Decision", emoji: "💡", category: "guidance", hint: "Weighing choices and seeking fresh perspective" },
  { id: "interview_fear", label: "Job Hunt & Interview Anxiety", emoji: "😰", category: "guidance", hint: "Preparation tips and confidence boost" },
  { id: "motivation", label: "Need Motivation & Discipline", emoji: "🚀", category: "guidance", hint: "Kickstart habits and stop procrastinating" },

  // Casual Chill Moods
  { id: "bored", label: "Super Bored / Want to Talk", emoji: "😴", category: "casual", hint: "Looking for a spontaneous friendly chat" },
  { id: "gaming_talk", label: "Gaming & Anime Vibes", emoji: "🎮", category: "casual", hint: "Discuss games, anime, shows, and lore" },
  { id: "deep_thoughts", label: "Late Night Philosophy", emoji: "🌌", category: "casual", hint: "Universe, existence, dreams, and fun theories" },
  { id: "music_movies", label: "Music & Cinema Enthusiast", emoji: "🎬", category: "casual", hint: "Share playlists, movie gems, and culture" },
  { id: "celebrate", label: "Celebrating a Milestone!", emoji: "🎉", category: "casual", hint: "Share a recent win with someone who cheers" },

  // Spark Moods
  { id: "fun_flirt", label: "Playful Vibes & Banter", emoji: "✨", category: "spark", hint: "Lighthearted chemistry and fun conversation" },
  { id: "romantic_chat", label: "Looking for a Spark", emoji: "💌", category: "spark", hint: "Connecting on romance and dating perspectives" },
];

export const AVATARS = [
  "🌙", "⚡", "🦊", "🐺", "🦁", "🐼", "🦉", "🌸", "✨", "🔥", "🚀", "🪐", "💎", "🔮", "🌊", "🌿"
];

export const DEMO_USERS = [
  {
    username: "PeaceSeeker_42",
    email: "peaceseeker@example.com",
    role: "PROBLEM_FACER",
    intent: "PEACE",
    socialGroup: "NIGHT_OWLS",
    avatar: "🌙",
    mood: "Stressed & Overwhelmed",
    bio: "College student navigating career uncertainty and late night thoughts.",
  },
  {
    username: "EmpatheticGuide_99",
    email: "guide@example.com",
    role: "GUIDER",
    intent: "PEACE",
    socialGroup: "OPEN",
    avatar: "🌿",
    mood: "Ready to Listen",
    bio: "Here with an open heart. Always happy to listen without judgment.",
  },
  {
    username: "TechMentor_Dev",
    email: "techmentor@example.com",
    role: "GUIDER",
    intent: "GUIDANCE",
    socialGroup: "TECH",
    avatar: "💻",
    mood: "Ready to Help in Code",
    bio: "Full-stack software engineer. Happy to guide freshers in tech & careers.",
  },
  {
    username: "ChillVibes_Bro",
    email: "chill@example.com",
    role: "CASUAL_CHILL",
    intent: "CASUAL",
    socialGroup: "BOYS",
    avatar: "⚡",
    mood: "Super Bored / Want to Talk",
    bio: "Into gaming, gym, music, and wholesome banter.",
  },
];

export const ICEBREAKER_CARDS: Record<string, string[]> = {
  PEACE: [
    "What has been taking up the most mental energy in your head lately?",
    "If you could press a pause button on life for 24 hours, what would you do?",
    "What is one thing you wish someone would understand about you right now?",
    "What helps you feel calm and grounded when everything feels overwhelming?",
    "Tell me about a small win or comfort you experienced recently.",
    "What is a heavy thought you've been holding that you want to put into words?",
  ],
  GUIDANCE: [
    "What is the specific challenge you're facing, and what would a breakthrough look like?",
    "What steps or solutions have you already considered or tried?",
    "What is the single biggest obstacle standing between you and your goal right now?",
    "If you weren't afraid of making a mistake, what decision would you take immediately?",
    "Who is someone you look up to in this area, and how might they handle this?",
  ],
  CASUAL: [
    "What is a movie, show, or song you can re-experience a hundred times without getting tired?",
    "If you could teleport anywhere in the world right now for one hour, where are you going?",
    "What's a weird or super specific hobby or interest you genuinely enjoy?",
    "What is the best food you've eaten recently that blew your mind?",
    "Would you rather explore deep ocean mysteries or travel into distant space?",
    "What is one piece of advice you'd give to your 16-year-old self?",
  ],
  SPARK: [
    "What is something that instantly makes someone attractive to you personality-wise?",
    "What does your ideal spontaneous weekend adventure look like?",
    "What's a song that gives you butterflies every single time you hear it?",
    "Are you more of a cozy coffee date person or a rooftop late-night talker?",
  ],
};

export const DAILY_QUESTIONS = [
  {
    date: "2026-08-15",
    question: "What is something you are silently proud of achieving that nobody noticed?",
    category: "Personal Reflection",
  },
  {
    date: "2026-08-16",
    question: "If you had 1 hour with anyone from your past to say anything, what would it be?",
    category: "Deep Connection",
  },
  {
    date: "2026-08-17",
    question: "What is the biggest lesson your early 20s have taught you so far?",
    category: "Life Lessons",
  },
];

export const SAFETY_WORDS_FILTER = [
  "abuse", "harass", "threat", "kys", "kill", "die", "nude", "nudes", "porn", "sex", "whatsapp", "call me"
];
