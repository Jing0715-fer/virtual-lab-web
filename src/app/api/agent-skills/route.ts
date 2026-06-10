import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ============================================================
// Types
// ============================================================

interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  skills: SkillDef[];
}

interface SkillDef {
  id: string;
  name: string;
  description: string;
  unlockRequirement: number; // parent category level needed
}

interface AgentSkillXP {
  skillId: string;
  xp: number;
  level: number;
  unlocked: boolean;
}

interface AgentSkillData {
  agentId: string;
  totalXP: number;
  agentLevel: number;
  rankTitle: string;
  skills: Record<string, AgentSkillXP>;
  achievements: Record<string, { earned: boolean; earnedAt: string | null }>;
  xpHistory: { date: string; xp: number }[];
  milestones: { level: number; date: string; label: string }[];
  previousRank: number;
}

interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

// ============================================================
// Skill Definitions (6 categories × 4-6 skills = 32 total)
// ============================================================

const SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: "research-methods",
    name: "Research Methods",
    icon: "BookOpen",
    color: "#8b5cf6",
    skills: [
      { id: "literature-review", name: "Literature Review", description: "Systematic review of existing scientific literature", unlockRequirement: 0 },
      { id: "experimental-design", name: "Experimental Design", description: "Plan and design controlled experiments", unlockRequirement: 0 },
      { id: "hypothesis-generation", name: "Hypothesis Generation", description: "Formulate testable research hypotheses", unlockRequirement: 1 },
      { id: "data-collection", name: "Data Collection", description: "Gather and organize research data", unlockRequirement: 1 },
      { id: "statistical-analysis", name: "Statistical Analysis", description: "Apply statistical methods to research data", unlockRequirement: 2 },
      { id: "peer-review", name: "Peer Review", description: "Critically evaluate research submissions", unlockRequirement: 3 },
    ],
  },
  {
    id: "data-analysis",
    name: "Data Analysis",
    icon: "BarChart3",
    color: "#06b6d4",
    skills: [
      { id: "visualization", name: "Visualization", description: "Create clear and informative data visualizations", unlockRequirement: 0 },
      { id: "statistical-modeling", name: "Statistical Modeling", description: "Build predictive statistical models", unlockRequirement: 0 },
      { id: "machine-learning", name: "Machine Learning", description: "Apply ML algorithms to complex datasets", unlockRequirement: 3 },
      { id: "data-wrangling", name: "Data Wrangling", description: "Clean, transform, and prepare raw data", unlockRequirement: 1 },
      { id: "pattern-recognition", name: "Pattern Recognition", description: "Identify trends and patterns in data", unlockRequirement: 2 },
      { id: "signal-processing", name: "Signal Processing", description: "Extract meaningful signals from noisy data", unlockRequirement: 3 },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    icon: "MessageSquare",
    color: "#10b981",
    skills: [
      { id: "presentation", name: "Presentation", description: "Deliver clear and engaging presentations", unlockRequirement: 0 },
      { id: "writing", name: "Writing", description: "Write clear scientific documentation and papers", unlockRequirement: 0 },
      { id: "mentoring", name: "Mentoring", description: "Guide and support other team members", unlockRequirement: 2 },
      { id: "collaboration", name: "Collaboration", description: "Work effectively across disciplines", unlockRequirement: 1 },
      { id: "debate", name: "Debate", description: "Constructively argue scientific viewpoints", unlockRequirement: 2 },
      { id: "knowledge-transfer", name: "Knowledge Transfer", description: "Share expertise effectively with others", unlockRequirement: 3 },
    ],
  },
  {
    id: "leadership",
    name: "Leadership",
    icon: "Crown",
    color: "#f59e0b",
    skills: [
      { id: "project-management", name: "Project Management", description: "Plan and coordinate research projects", unlockRequirement: 0 },
      { id: "team-building", name: "Team Building", description: "Build and maintain effective research teams", unlockRequirement: 0 },
      { id: "decision-making", name: "Decision Making", description: "Make informed decisions under uncertainty", unlockRequirement: 1 },
      { id: "strategic-planning", name: "Strategic Planning", description: "Develop long-term research strategies", unlockRequirement: 2 },
      { id: "resource-allocation", name: "Resource Allocation", description: "Optimize distribution of research resources", unlockRequirement: 3 },
      { id: "risk-assessment", name: "Risk Assessment", description: "Identify and mitigate research risks", unlockRequirement: 2 },
    ],
  },
  {
    id: "technical",
    name: "Technical",
    icon: "Cpu",
    color: "#ef4444",
    skills: [
      { id: "programming", name: "Programming", description: "Write clean and efficient code", unlockRequirement: 0 },
      { id: "algorithm-design", name: "Algorithm Design", description: "Design efficient algorithms for research tasks", unlockRequirement: 0 },
      { id: "system-architecture", name: "System Architecture", description: "Design scalable research computing systems", unlockRequirement: 2 },
      { id: "debugging", name: "Debugging", description: "Identify and fix issues in code and experiments", unlockRequirement: 1 },
      { id: "performance-optimization", name: "Performance Optimization", description: "Optimize code and experiment performance", unlockRequirement: 3 },
      { id: "code-review", name: "Code Review", description: "Review code for quality and correctness", unlockRequirement: 2 },
    ],
  },
  {
    id: "domain-knowledge",
    name: "Domain Knowledge",
    icon: "Microscope",
    color: "#ec4899",
    skills: [
      { id: "molecular-biology", name: "Molecular Biology", description: "Understanding of molecular biology principles", unlockRequirement: 0 },
      { id: "protein-engineering", name: "Protein Engineering", description: "Design and modify protein structures", unlockRequirement: 0 },
      { id: "immunology", name: "Immunology", description: "Knowledge of immune system mechanisms", unlockRequirement: 1 },
      { id: "computational-chemistry", name: "Computational Chemistry", description: "Apply computational methods to chemical problems", unlockRequirement: 2 },
      { id: "bioinformatics", name: "Bioinformatics", description: "Analyze biological data using computational tools", unlockRequirement: 2 },
      { id: "structural-biology", name: "Structural Biology", description: "Analyze and predict biological structures", unlockRequirement: 3 },
    ],
  },
];

// ============================================================
// Achievements
// ============================================================

const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-meeting", name: "First Meeting", description: "Participated in first meeting", icon: "Users" },
  { id: "wordsmith", name: "Wordsmith", description: "Sent 100+ messages total", icon: "PenTool" },
  { id: "data-driven", name: "Data-driven", description: "Created 10+ data analyses", icon: "BarChart3" },
  { id: "team-player", name: "Team Player", description: "Collaborated with 5+ agents", icon: "Handshake" },
  { id: "night-owl", name: "Night Owl", description: "Active in meetings past midnight", icon: "Moon" },
  { id: "speed-runner", name: "Speed Runner", description: "Completed meeting in record time", icon: "Zap" },
  { id: "mentor", name: "Mentor", description: "Mentored 3+ other agents", icon: "GraduationCap" },
  { id: "centurion", name: "Centurion", description: "Reached Level 10", icon: "Award" },
  { id: "polymath", name: "Polymath", description: "Unlocked skills in all 6 categories", icon: "Brain" },
  { id: "master-researcher", name: "Master Researcher", description: "Maxed out a skill category", icon: "Star" },
];

// ============================================================
// Helpers
// ============================================================

const RANK_TITLES = [
  { minLevel: 1, title: "Novice", cssClass: "rank-novice" },
  { minLevel: 5, title: "Apprentice", cssClass: "rank-apprentice" },
  { minLevel: 10, title: "Journeyman", cssClass: "rank-journeyman" },
  { minLevel: 20, title: "Expert", cssClass: "rank-expert" },
  { minLevel: 35, title: "Master", cssClass: "rank-master" },
  { minLevel: 45, title: "Grandmaster", cssClass: "rank-grandmaster" },
];

function getRankTitle(level: number) {
  let result = RANK_TITLES[0];
  for (const rank of RANK_TITLES) {
    if (level >= rank.minLevel) result = rank;
  }
  return result;
}

function xpToLevel(totalXP: number): number {
  // Cumulative XP needed per level: 100 * level + 50 * (level-1)^1.3
  let level = 1;
  let needed = 0;
  while (level <= 50) {
    const levelXP = Math.floor(100 * level + 50 * Math.pow(level - 1, 1.3));
    needed += levelXP;
    if (totalXP < needed) return level;
    level++;
  }
  return 50;
}

function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += Math.floor(100 * l + 50 * Math.pow(l - 1, 1.3));
  }
  return total;
}

function xpForNextLevel(level: number): number {
  return xpForLevel(level + 1);
}

function xpInCurrentLevel(totalXP: number): number {
  const level = xpToLevel(totalXP);
  const baseXP = xpForLevel(level);
  return totalXP - baseXP;
}

function xpNeededForNextLevel(totalXP: number): number {
  const level = xpToLevel(totalXP);
  return xpForNextLevel(level) - xpForLevel(level);
}

function getCategoryLevel(skills: Record<string, AgentSkillXP>, categoryId: string, categories: SkillCategory[]): number {
  const cat = categories.find(c => c.id === categoryId);
  if (!cat) return 0;
  const catSkillLevels = cat.skills.map(s => skills[s.id]?.level || 0);
  if (catSkillLevels.length === 0) return 0;
  return Math.round(catSkillLevels.reduce((a, b) => a + b, 0) / catSkillLevels.length);
}

function computeSkillLevel(xp: number): number {
  if (xp >= 800) return 5;
  if (xp >= 550) return 4;
  if (xp >= 350) return 3;
  if (xp >= 150) return 2;
  if (xp >= 30) return 1;
  return 0;
}

function isSkillUnlocked(skillId: string, parentCategoryId: string, parentReqLevel: number, skills: Record<string, AgentSkillXP>, categories: SkillCategory[]): boolean {
  const catLevel = getCategoryLevel(skills, parentCategoryId, categories);
  return catLevel >= parentReqLevel;
}

function generateInitialSkillData(agentId: string): AgentSkillData {
  const skills: Record<string, AgentSkillXP> = {};
  // Seed each skill with random small XP for variety
  for (const cat of SKILL_CATEGORIES) {
    for (const skillDef of cat.skills) {
      const initialXP = Math.floor(Math.random() * 80);
      const level = computeSkillLevel(initialXP);
      skills[skillDef.id] = {
        skillId: skillDef.id,
        xp: initialXP,
        level,
        unlocked: isSkillUnlocked(skillDef.id, cat.id, skillDef.unlockRequirement, skills, SKILL_CATEGORIES),
      };
    }
  }
  // Recompute unlocks
  for (const cat of SKILL_CATEGORIES) {
    for (const skillDef of cat.skills) {
      skills[skillDef.id].unlocked = isSkillUnlocked(skillDef.id, cat.id, skillDef.unlockRequirement, skills, SKILL_CATEGORIES);
    }
  }
  const totalXP = Object.values(skills).reduce((sum, s) => sum + s.xp, 0);
  const agentLevel = xpToLevel(totalXP);
  const { title: rankTitle } = getRankTitle(agentLevel);
  const achievements: Record<string, { earned: boolean; earnedAt: string | null }> = {};
  for (const ach of ACHIEVEMENTS) {
    achievements[ach.id] = { earned: false, earnedAt: null };
  }
  // Generate some fake xp history
  const xpHistory: { date: string; xp: number }[] = [];
  const now = new Date();
  let cumulativeXP = 0;
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dailyXP = Math.floor(Math.random() * 60) + (i < 10 ? 0 : 10);
    cumulativeXP += dailyXP;
    xpHistory.push({ date: date.toISOString().slice(0, 10), xp: cumulativeXP });
  }
  const milestones: { level: number; date: string; label: string }[] = [];
  if (agentLevel >= 1) milestones.push({ level: 1, date: new Date(now.getTime() - 25 * 86400000).toISOString().slice(0, 10), label: "Agent initialized" });
  if (agentLevel >= 2) milestones.push({ level: 2, date: new Date(now.getTime() - 18 * 86400000).toISOString().slice(0, 10), label: "Started contributing" });
  if (agentLevel >= 3) milestones.push({ level: 3, date: new Date(now.getTime() - 12 * 86400000).toISOString().slice(0, 10), label: "Gaining expertise" });

  return {
    agentId,
    totalXP,
    agentLevel,
    rankTitle,
    skills,
    achievements,
    xpHistory,
    milestones,
    previousRank: 0,
  };
}

// In-memory cache (dev convenience; production would use DB)
const skillDataCache = new Map<string, AgentSkillData>();
let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  try {
    const agents = await db.agent.findMany({ select: { id: true } });
    for (const agent of agents) {
      if (!skillDataCache.has(agent.id)) {
        skillDataCache.set(agent.id, generateInitialSkillData(agent.id));
      }
    }
  } catch {
    // DB not available; seed with sample agents
    const sampleIds = ["agent-1", "agent-2", "agent-3"];
    for (const id of sampleIds) {
      if (!skillDataCache.has(id)) {
        skillDataCache.set(id, generateInitialSkillData(id));
      }
    }
  }
}

// ============================================================
// Route handlers
// ============================================================

export async function GET(request: NextRequest) {
  await ensureInitialized();
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  // GET /api/agent-skills?agentId=xxx — single agent data
  const agentId = searchParams.get("agentId");
  if (agentId) {
    let data = skillDataCache.get(agentId);
    if (!data) {
      data = generateInitialSkillData(agentId);
      skillDataCache.set(agentId, data);
    }
    return NextResponse.json({ agentSkills: data, skillCategories: SKILL_CATEGORIES, achievements: ACHIEVEMENTS });
  }

  // GET /api/agent-skills?path=leaderboard
  if (path === "leaderboard") {
    const entries = Array.from(skillDataCache.entries()).map(([id, data]) => ({
      agentId: id,
      totalXP: data.totalXP,
      agentLevel: data.agentLevel,
      rankTitle: data.rankTitle,
      previousRank: data.previousRank,
    }));
    entries.sort((a, b) => b.totalXP - a.totalXP);
    // Assign ranks and compute rank changes
    entries.forEach((entry, idx) => {
      const prev = entry.previousRank;
      if (prev === 0 || prev === idx + 1) {
        entry.previousRank = idx + 1;
      }
    });
    return NextResponse.json({ leaderboard: entries });
  }

  // GET /api/agent-skills?path=achievements&agentId=xxx
  if (path === "achievements") {
    const targetId = agentId;
    if (targetId) {
      const data = skillDataCache.get(targetId);
      const achievementsWithStatus = ACHIEVEMENTS.map(ach => ({
        ...ach,
        earned: data?.achievements[ach.id]?.earned || false,
        earnedAt: data?.achievements[ach.id]?.earnedAt || null,
      }));
      return NextResponse.json({ achievements: achievementsWithStatus, agentId: targetId });
    }
    // All agents
    const allStatus: Record<string, { agentId: string; earned: AchievementDef[] }[]> = {};
    for (const [id, data] of skillDataCache.entries()) {
      const earned = ACHIEVEMENTS.filter(a => data.achievements[a.id]?.earned);
      if (!allStatus[id]) allStatus[id] = [];
      allStatus[id].push({ agentId: id, earned });
    }
    return NextResponse.json({ allStatus, achievements: ACHIEVEMENTS });
  }

  // GET /api/agent-skills — all agents
  const allData: Record<string, AgentSkillData> = {};
  for (const [id, data] of skillDataCache.entries()) {
    allData[id] = data;
  }
  return NextResponse.json({
    agents: allData,
    skillCategories: SKILL_CATEGORIES,
    achievements: ACHIEVEMENTS,
  });
}

export async function POST(request: NextRequest) {
  await ensureInitialized();
  const body = await request.json();
  const { agentId, skillId, amount, reason, path } = body;

  // POST /api/agent-skills with path=achievements/check
  if (path === "achievements/check") {
    const checkId = body.agentId;
    if (!checkId) {
      return NextResponse.json({ error: "agentId required" }, { status: 400 });
    }
    let data = skillDataCache.get(checkId);
    if (!data) {
      data = generateInitialSkillData(checkId);
      skillDataCache.set(checkId, data);
    }
    // Simulate checking achievements
    const newlyEarned: string[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (data.achievements[ach.id]?.earned) continue;
      let shouldAward = false;
      switch (ach.id) {
        case "centurion":
          shouldAward = data.agentLevel >= 10;
          break;
        case "polymath": {
          const catsWithSkills = SKILL_CATEGORIES.filter(cat =>
            cat.skills.some(s => (data.skills[s.id]?.level || 0) >= 1)
          ).length;
          shouldAward = catsWithSkills >= 6;
          break;
        }
        case "master-researcher": {
          const hasMaxCat = SKILL_CATEGORIES.some(cat =>
            cat.skills.every(s => (data.skills[s.id]?.level || 0) >= 4)
          );
          shouldAward = hasMaxCat;
          break;
        }
        default:
          shouldAward = Math.random() < 0.15; // Random chance for simulation
      }
      if (shouldAward) {
        data.achievements[ach.id] = { earned: true, earnedAt: new Date().toISOString() };
        newlyEarned.push(ach.id);
      }
    }
    skillDataCache.set(checkId, data);
    return NextResponse.json({ newlyEarned, achievements: data.achievements });
  }

  // POST /api/agent-skills — award XP
  if (!agentId || !skillId || amount === undefined) {
    return NextResponse.json({ error: "agentId, skillId, and amount required" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "amount must be positive" }, { status: 400 });
  }
  if (amount > 1000) {
    return NextResponse.json({ error: "max 1000 XP per award" }, { status: 400 });
  }

  let data = skillDataCache.get(agentId);
  if (!data) {
    data = generateInitialSkillData(agentId);
    skillDataCache.set(agentId, data);
  }

  const skill = data.skills[skillId];
  if (!skill) {
    return NextResponse.json({ error: "Invalid skillId" }, { status: 400 });
  }
  if (!skill.unlocked) {
    return NextResponse.json({ error: "Skill is locked" }, { status: 403 });
  }

  // Award XP
  const oldLevel = skill.level;
  skill.xp = Math.min(skill.xp + amount, 1000);
  skill.level = computeSkillLevel(skill.xp);
  const leveledUp = skill.level > oldLevel;

  // Recalculate totals
  data.totalXP = Object.values(data.skills).reduce((sum, s) => sum + s.xp, 0);
  const oldAgentLevel = data.agentLevel;
  data.agentLevel = xpToLevel(data.totalXP);
  const { title: rankTitle } = getRankTitle(data.agentLevel);
  data.rankTitle = rankTitle;
  const agentLeveledUp = data.agentLevel > oldAgentLevel;

  // Update unlocks across all skills
  for (const cat of SKILL_CATEGORIES) {
    for (const skillDef of cat.skills) {
      const s = data.skills[skillDef.id];
      if (s) {
        s.unlocked = isSkillUnlocked(skillDef.id, cat.id, skillDef.unlockRequirement, data.skills, SKILL_CATEGORIES);
      }
    }
  }

  // Add to XP history
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = data.xpHistory.find(h => h.date === today);
  if (todayEntry) {
    todayEntry.xp += amount;
  } else {
    data.xpHistory.push({ date: today, xp: data.totalXP });
  }
  // Keep only last 30 days
  if (data.xpHistory.length > 30) {
    data.xpHistory = data.xpHistory.slice(-30);
  }

  // Add milestone if agent leveled up
  if (agentLeveledUp) {
    data.milestones.push({
      level: data.agentLevel,
      date: today,
      label: `Reached Level ${data.agentLevel}`,
    });
  }

  // Persist back
  skillDataCache.set(agentId, data);

  return NextResponse.json({
    success: true,
    skillId,
    newXP: skill.xp,
    newLevel: skill.level,
    skillLeveledUp: leveledUp,
    totalXP: data.totalXP,
    agentLevel: data.agentLevel,
    agentLeveledUp,
    rankTitle: data.rankTitle,
    reason: reason || null,
  });
}

export async function PUT(request: NextRequest) {
  await ensureInitialized();
  const body = await request.json();
  const { agentId, skillId, name, description, unlockRequirement } = body;

  if (!agentId || !skillId) {
    return NextResponse.json({ error: "agentId and skillId required" }, { status: 400 });
  }

  let data = skillDataCache.get(agentId);
  if (!data) {
    data = generateInitialSkillData(agentId);
    skillDataCache.set(agentId, data);
  }

  const skill = data.skills[skillId];
  if (!skill) {
    return NextResponse.json({ error: "Invalid skillId" }, { status: 400 });
  }

  // Update the skill category definition too (in-memory)
  for (const cat of SKILL_CATEGORIES) {
    const skillDef = cat.skills.find(s => s.id === skillId);
    if (skillDef) {
      if (name) skillDef.name = name;
      if (description) skillDef.description = description;
      if (typeof unlockRequirement === "number") skillDef.unlockRequirement = unlockRequirement;
      // Recompute unlock
      skill.unlocked = isSkillUnlocked(skillId, cat.id, skillDef.unlockRequirement, data.skills, SKILL_CATEGORIES);
      break;
    }
  }

  return NextResponse.json({ success: true, skillId });
}

// ============================================================
// Helper: expose XP calculations for client use
// ============================================================

export function getSkillCategories() {
  return SKILL_CATEGORIES;
}

export function getAchievements() {
  return ACHIEVEMENTS;
}

export function getRankTitles() {
  return RANK_TITLES;
}
