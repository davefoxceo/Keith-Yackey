/**
 * Seed content: Keith Yackey's core coaching frameworks and concepts.
 *
 * This content powers RAG retrieval so Coach Keith AI can reference
 * specific frameworks, tools, and concepts from Keith's actual teaching.
 * Each entry has a unique ID, the text content, and metadata about
 * which dial(s) it relates to.
 */

export interface ContentSeed {
  id: string;
  text: string;
  sourceType: 'FRAMEWORK' | 'PODCAST' | 'BOOK' | 'COACHING_SESSION';
  dial?: string;
  topic: string;
}

export const KEITH_CONTENT_SEEDS: ContentSeed[] = [
  // -----------------------------------------------------------------------
  // Five Dials Framework Overview
  // -----------------------------------------------------------------------
  {
    id: 'framework:five-dials-overview',
    text: `The Five Dials Framework is the core of Keith Yackey's coaching system. Every man has five dials he needs to keep tuned: Parent, Partner, Producer, Player, and Power. Most men have one or two dials cranked to 10 while the others are at 2 or 3. The goal isn't perfection on every dial — it's awareness and intentional adjustment. When you know which dial needs attention, you can make targeted changes instead of feeling overwhelmed by everything at once.`,
    sourceType: 'FRAMEWORK',
    topic: 'Five Dials Overview',
  },
  {
    id: 'framework:parent-dial',
    text: `The PARENT dial measures how you show up as a father. This isn't about being your kids' best friend — it's about being the leader they need. Are you present at dinner? Do you know what's going on in their lives? Are you modeling the values you want them to carry? A high Parent dial means your kids feel safe, seen, and guided. A low Parent dial means you're physically there but emotionally checked out. The biggest mistake fathers make is thinking providing financially is the same as being present. Your kids don't need more stuff — they need more of YOU.`,
    sourceType: 'FRAMEWORK',
    dial: 'PARENT',
    topic: 'Parent Dial',
  },
  {
    id: 'framework:partner-dial',
    text: `The PARTNER dial is about your relationship with your wife. Not just romance — the full picture. Friendship, communication, intimacy, emotional safety. Most men think the Partner dial is about date nights and flowers. Wrong. It's about whether your wife feels like she has a true partner or like she's running the household alone. Do you initiate hard conversations? Do you know her current stress? When was the last time you asked what she needs — and actually listened? A strong Partner dial means she feels chosen every day, not just on anniversaries.`,
    sourceType: 'FRAMEWORK',
    dial: 'PARTNER',
    topic: 'Partner Dial',
  },
  {
    id: 'framework:producer-dial',
    text: `The PRODUCER dial covers your professional and financial contribution. This isn't just about making money — it's about economic stability, career growth, and being a reliable provider. Are you building something meaningful? Are your finances in order? Do you have a plan, or are you just surviving paycheck to paycheck? A high Producer dial means your family has stability and you have purpose in your work. A low Producer dial creates anxiety that bleeds into every other area of your life. But here's the trap: many men crank the Producer dial to 10 and neglect everything else. Being a workaholic isn't strength — it's avoidance.`,
    sourceType: 'FRAMEWORK',
    dial: 'PRODUCER',
    topic: 'Producer Dial',
  },
  {
    id: 'framework:player-dial',
    text: `The PLAYER dial is about fun, spontaneity, play, and physical health. When's the last time you did something just because it was fun? Do you still have hobbies? Are you taking care of your body? Most married men slowly let the Player dial die. They stop working out, stop hanging with friends, stop doing the things that made them interesting in the first place. Your wife didn't marry a boring guy — don't become one. The Player dial keeps you alive, energized, and attractive. It's not selfish to take care of yourself — it's necessary. A man who's dying inside can't give life to anyone else.`,
    sourceType: 'FRAMEWORK',
    dial: 'PLAYER',
    topic: 'Player Dial',
  },
  {
    id: 'framework:power-dial',
    text: `The POWER dial is about integrity, follow-through, self-discipline, and emotional regulation. This is the master dial — it affects all the others. Power isn't about control over others. It's about control over yourself. Do you keep your word? When you say you'll do something, do you do it? Can you regulate your emotions or do you blow up when things get hard? A man with a high Power dial is steady, trustworthy, and grounded. His wife and kids feel safe because they know he won't crumble under pressure. Power is built through small daily disciplines — keeping promises to yourself, managing your triggers, staying calm in chaos.`,
    sourceType: 'FRAMEWORK',
    dial: 'POWER',
    topic: 'Power Dial',
  },

  // -----------------------------------------------------------------------
  // Coaching Concepts
  // -----------------------------------------------------------------------
  {
    id: 'concept:provocateur-identity',
    text: `Keith Yackey's Provocateur Identity philosophy is about being the kind of man who provokes growth — in yourself and others. A Provocateur doesn't accept mediocrity. He asks the hard questions. He challenges the comfortable lies men tell themselves. "I'm fine." "We're good." "It'll work itself out." A Provocateur calls BS on all of it — with love, but without flinching. The goal is to provoke men out of complacency and into their best selves.`,
    sourceType: 'COACHING_SESSION',
    topic: 'Provocateur Identity',
  },
  {
    id: 'concept:three-lies',
    text: `The Three Lies Men Believe: (1) "I can figure this out alone" — No, you can't. Every great man has mentors, coaches, and a brotherhood. Isolation is where marriages die. (2) "Things will get better on their own" — They won't. Entropy is real. Without intentional effort, relationships decay. (3) "My wife should just understand" — She's not a mind reader. Communication isn't optional. These three lies keep men stuck in patterns that destroy their marriages and families.`,
    sourceType: 'COACHING_SESSION',
    topic: 'Three Lies Men Believe',
  },
  {
    id: 'concept:roi-of-intimacy',
    text: `The ROI of Intimacy: Most men think intimacy is just physical. Wrong. There are four layers of intimacy: emotional (sharing feelings), intellectual (sharing ideas), experiential (sharing activities), and physical (sharing touch). The ROI — Return on Intimacy — comes when you invest in ALL four. Men who only pursue physical intimacy without building emotional safety will always feel like they're begging. When you build all four layers, physical intimacy flows naturally because trust and connection are the foundation.`,
    sourceType: 'FRAMEWORK',
    dial: 'PARTNER',
    topic: 'ROI of Intimacy',
  },
  {
    id: 'concept:mommy-matrix',
    text: `The Mommy Matrix: After kids arrive, many marriages shift into a parent-only dynamic. The wife becomes "Mom" and the husband becomes "Dad" — and the couple disappears. The Mommy Matrix is when your wife is so consumed by motherhood that she loses herself, and you're so consumed by providing that you lose connection. Breaking out of the Mommy Matrix requires intentional couple time, maintaining your identity outside of parenthood, and remembering that the best thing you can do for your kids is model a strong marriage.`,
    sourceType: 'COACHING_SESSION',
    dial: 'PARTNER',
    topic: 'Mommy Matrix',
  },
  {
    id: 'concept:accountability',
    text: `Real accountability isn't someone checking up on you — it's someone who won't let you lie to yourself. An accountability partner in Keith's Brotherhood isn't a buddy who says "it's okay, man." He's a brother who says "You said you'd do X. Did you do it? No? Why not? What are you going to do differently?" Accountability without truth is just friendship. And friendship without accountability is just hanging out. Men need both.`,
    sourceType: 'COACHING_SESSION',
    dial: 'POWER',
    topic: 'Accountability',
  },
  {
    id: 'concept:crisis-mode',
    text: `When a man is in crisis — whether his wife just said she wants a divorce, he discovered an affair, or he's facing a major life disruption — the first step is always the same: breathe and stabilize. Don't make any big decisions in the first 72 hours. Focus only on what you can control right now. In crisis coaching, Keith focuses on three things: (1) Are you safe? (2) What needs immediate attention? (3) What can wait? Crisis is not the time for deep Five Dials work — it's the time for triage and stabilization.`,
    sourceType: 'COACHING_SESSION',
    topic: 'Crisis Response',
  },
  {
    id: 'concept:morning-kickstart',
    text: `Keith's Morning Kickstart routine: Before you check your phone, before you scroll, before the world gets a piece of you — take 10 minutes for yourself. (1) Gratitude — name three specific things. Not "my family" but "the way my daughter laughed at breakfast yesterday." (2) Intention — what's the ONE thing you're going to do today to move a dial? (3) Commitment — say it out loud. "Today I will ___." This isn't meditation or journaling necessarily. It's a daily alignment practice that keeps you intentional instead of reactive.`,
    sourceType: 'COACHING_SESSION',
    topic: 'Morning Kickstart',
  },
  {
    id: 'concept:evening-reflection',
    text: `Keith's Evening Reflection practice: At the end of each day, spend 5 minutes with four questions: (1) What am I grateful for today? (2) What was my win today — even a small one? (3) What challenged me today? (4) What's my intention for tomorrow? This creates a learning loop. Most men just crash at the end of the day — no reflection, no adjustment. The evening reflection turns every day into a data point for growth. Over time, patterns emerge that show you exactly where your Five Dials need attention.`,
    sourceType: 'COACHING_SESSION',
    topic: 'Evening Reflection',
  },

  // -----------------------------------------------------------------------
  // Podcast Episode Highlights
  // -----------------------------------------------------------------------
  {
    id: 'podcast:communication-framework',
    text: `From the "Order of Man" episode: The HEAR framework for communication with your wife. H - Hold space (stop what you're doing, make eye contact, be fully present). E - Echo back (repeat what she said in your own words so she knows you heard). A - Ask (don't jump to solutions — ask "what do you need from me right now?"). R - Respond (now you can share your perspective or offer help). Most men skip straight to R. They hear a problem and immediately try to fix it. But 80% of the time, she doesn't want a fix — she wants to feel heard.`,
    sourceType: 'PODCAST',
    dial: 'PARTNER',
    topic: 'HEAR Communication Framework',
  },
  {
    id: 'podcast:rebuilding-trust',
    text: `Rebuilding trust after it's been broken takes consistent, small deposits over time. Trust isn't rebuilt with a grand gesture — it's rebuilt with a thousand tiny kept promises. Show up when you say you will. Do what you say you'll do. Be where you say you'll be. Trust is like a bank account: it takes a long time to build up, seconds to drain, and twice as long to rebuild. Keith tells men: "Don't ask her to trust you. Show her she can. Every single day."`,
    sourceType: 'PODCAST',
    dial: 'POWER',
    topic: 'Rebuilding Trust',
  },
  {
    id: 'podcast:physical-health',
    text: `Your body is the vehicle for everything else. If the vehicle breaks down, nothing else matters. Keith emphasizes that physical health isn't vanity — it's stewardship. When you're in shape, you have more energy for your kids, more confidence with your wife, more stamina for your work, and more emotional resilience for stress. You don't need to be a bodybuilder. You need to move your body, eat real food, sleep enough, and stop treating yourself like a garbage disposal. The Player dial starts with taking care of the machine.`,
    sourceType: 'PODCAST',
    dial: 'PLAYER',
    topic: 'Physical Health and Vitality',
  },
];
