import { NextResponse } from "next/server";

// ============================================================
// Types
// ============================================================

type MemberStatus = "online" | "busy" | "offline" | "away";
type Proficiency = "beginner" | "intermediate" | "expert";
type TeamVisibility = "public" | "internal" | "private";

interface Skill {
  name: string;
  proficiency: Proficiency;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  skills: Skill[];
  bio: string;
  timezone: string;
  availability: string;
  joinedAt: string;
  avatar: string;
  stats: {
    meetingsAttended: number;
    messagesSent: number;
    reviewsGiven: number;
    experimentsRun: number;
  };
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  type: "join" | "role_change" | "meeting" | "experiment" | "review" | "permission" | "status_change";
}

interface Role {
  id: string;
  name: string;
  color: string;
  description: string;
  permissions: Record<string, boolean>;
  inheritsFrom?: string;
}

interface TeamSettings {
  teamName: string;
  description: string;
  visibility: TeamVisibility;
  defaultMeetingDuration: number;
  defaultMeetingType: string;
  notifications: {
    memberJoined: boolean;
    roleChanged: boolean;
    meetingCreated: boolean;
    experimentCompleted: boolean;
  };
}

interface PermissionDef {
  id: string;
  name: string;
  description: string;
  category: string;
}

// ============================================================
// Permission Definitions
// ============================================================

const PERMISSIONS: PermissionDef[] = [
  { id: "create_meeting", name: "Create Meeting", description: "Can create new meetings", category: "Meetings" },
  { id: "run_meeting", name: "Run Meeting", description: "Can start and run meetings", category: "Meetings" },
  { id: "edit_meeting", name: "Edit Meeting", description: "Can edit meeting settings and agendas", category: "Meetings" },
  { id: "delete_meeting", name: "Delete Meeting", description: "Can delete meetings", category: "Meetings" },
  { id: "manage_agents", name: "Manage Agents", description: "Can create, edit, and manage agents", category: "Agents" },
  { id: "view_analytics", name: "View Analytics", description: "Can view analytics dashboards", category: "Analytics" },
  { id: "export_data", name: "Export Data", description: "Can export data and reports", category: "Data" },
  { id: "manage_pipeline", name: "Manage Pipeline", description: "Can manage research pipelines", category: "Pipelines" },
  { id: "edit_wiki", name: "Edit Wiki", description: "Can edit knowledge base articles", category: "Knowledge" },
  { id: "manage_experiments", name: "Manage Experiments", description: "Can create and manage experiments", category: "Experiments" },
  { id: "review_meetings", name: "Review Meetings", description: "Can review and annotate meetings", category: "Meetings" },
  { id: "admin_settings", name: "Admin Settings", description: "Can modify team and system settings", category: "Admin" },
];

// ============================================================
// Default Roles
// ============================================================

function getDefaultRoles(): Role[] {
  return [
    {
      id: "admin",
      name: "Admin",
      color: "#ef4444",
      description: "Full access to all team features and settings",
      permissions: Object.fromEntries(PERMISSIONS.map(p => [p.id, true])),
    },
    {
      id: "lead_researcher",
      name: "Lead Researcher",
      color: "#8b5cf6",
      description: "Leads research direction, can manage most resources",
      inheritsFrom: "researcher",
      permissions: {
        create_meeting: true,
        run_meeting: true,
        edit_meeting: true,
        delete_meeting: true,
        manage_agents: true,
        view_analytics: true,
        export_data: true,
        manage_pipeline: true,
        edit_wiki: true,
        manage_experiments: true,
        review_meetings: true,
        admin_settings: false,
      },
    },
    {
      id: "researcher",
      name: "Researcher",
      color: "#10b981",
      description: "Conducts research, runs experiments, contributes to meetings",
      permissions: {
        create_meeting: true,
        run_meeting: true,
        edit_meeting: true,
        delete_meeting: false,
        manage_agents: false,
        view_analytics: true,
        export_data: true,
        manage_pipeline: true,
        edit_wiki: true,
        manage_experiments: true,
        review_meetings: true,
        admin_settings: false,
      },
    },
    {
      id: "analyst",
      name: "Analyst",
      color: "#06b6d4",
      description: "Analyzes data, creates reports, reviews experiments",
      permissions: {
        create_meeting: true,
        run_meeting: false,
        edit_meeting: false,
        delete_meeting: false,
        manage_agents: false,
        view_analytics: true,
        export_data: true,
        manage_pipeline: false,
        edit_wiki: true,
        manage_experiments: false,
        review_meetings: true,
        admin_settings: false,
      },
    },
    {
      id: "reviewer",
      name: "Reviewer",
      color: "#f59e0b",
      description: "Reviews meetings, experiments, and provides feedback",
      permissions: {
        create_meeting: true,
        run_meeting: false,
        edit_meeting: false,
        delete_meeting: false,
        manage_agents: false,
        view_analytics: true,
        export_data: true,
        manage_pipeline: false,
        edit_wiki: false,
        manage_experiments: false,
        review_meetings: true,
        admin_settings: false,
      },
    },
    {
      id: "viewer",
      name: "Viewer",
      color: "#6b7280",
      description: "Read-only access to view team content and analytics",
      permissions: {
        create_meeting: false,
        run_meeting: false,
        edit_meeting: false,
        delete_meeting: false,
        manage_agents: false,
        view_analytics: true,
        export_data: false,
        manage_pipeline: false,
        edit_wiki: false,
        manage_experiments: false,
        review_meetings: false,
        admin_settings: false,
      },
    },
  ];
}

// ============================================================
// Sample Team Members
// ============================================================

function getSampleMembers(): TeamMember[] {
  const now = Date.now();
  return [
    {
      id: "mem-001",
      name: "Dr. Sarah Chen",
      email: "sarah.chen@virtuallab.io",
      role: "Admin",
      status: "online",
      skills: [
        { name: "Machine Learning", proficiency: "expert" },
        { name: "Data Analysis", proficiency: "expert" },
        { name: "Project Management", proficiency: "expert" },
        { name: "Python", proficiency: "expert" },
      ],
      bio: "Lead researcher specializing in computational biology and machine learning applications in drug discovery. 15+ years of experience leading cross-functional research teams.",
      timezone: "UTC-8 (Pacific)",
      availability: "Full-time",
      joinedAt: new Date(now - 365 * 86400000).toISOString(),
      avatar: "#ef4444",
      stats: { meetingsAttended: 142, messagesSent: 1834, reviewsGiven: 67, experimentsRun: 23 },
      recentActivity: [
        { id: "a1", action: "Updated team settings", description: "Changed visibility to Internal", timestamp: new Date(now - 3600000).toISOString(), type: "permission" },
        { id: "a2", action: "Created experiment", description: "Launched protein folding experiment #E-042", timestamp: new Date(now - 7200000).toISOString(), type: "experiment" },
        { id: "a3", action: "Reviewed meeting", description: "Reviewed sprint planning session notes", timestamp: new Date(now - 86400000).toISOString(), type: "review" },
        { id: "a4", action: "Role change", description: "Promoted Marcus to Lead Researcher", timestamp: new Date(now - 172800000).toISOString(), type: "role_change" },
        { id: "a5", action: "Status change", description: "Changed status to online", timestamp: new Date(now - 259200000).toISOString(), type: "status_change" },
      ],
    },
    {
      id: "mem-002",
      name: "Marcus Williams",
      email: "marcus.w@virtuallab.io",
      role: "Lead Researcher",
      status: "online",
      skills: [
        { name: "NLP", proficiency: "expert" },
        { name: "Deep Learning", proficiency: "expert" },
        { name: "Research Methods", proficiency: "intermediate" },
        { name: "R", proficiency: "intermediate" },
      ],
      bio: "Computational linguist focused on transformer architectures and their applications in scientific literature analysis. Passionate about reproducible research.",
      timezone: "UTC-5 (Eastern)",
      availability: "Full-time",
      joinedAt: new Date(now - 300 * 86400000).toISOString(),
      avatar: "#8b5cf6",
      stats: { meetingsAttended: 98, messagesSent: 1245, reviewsGiven: 42, experimentsRun: 18 },
      recentActivity: [
        { id: "a6", action: "Created meeting", description: "Scheduled NLP model review session", timestamp: new Date(now - 1800000).toISOString(), type: "meeting" },
        { id: "a7", action: "Ran experiment", description: "Completed BERT fine-tuning experiment", timestamp: new Date(now - 5400000).toISOString(), type: "experiment" },
        { id: "a8", action: "Edited wiki", description: "Updated transformer architecture guide", timestamp: new Date(now - 43200000).toISOString(), type: "review" },
      ],
    },
    {
      id: "mem-003",
      name: "Dr. Yuki Tanaka",
      email: "yuki.t@virtuallab.io",
      role: "Researcher",
      status: "busy",
      skills: [
        { name: "Bioinformatics", proficiency: "expert" },
        { name: "Genomics", proficiency: "expert" },
        { name: "Python", proficiency: "intermediate" },
        { name: "Statistical Analysis", proficiency: "expert" },
      ],
      bio: "Bioinformatics researcher with expertise in genome-wide association studies and variant calling pipelines. Currently leading the pharmacogenomics project.",
      timezone: "UTC+9 (Japan)",
      availability: "Full-time",
      joinedAt: new Date(now - 240 * 86400000).toISOString(),
      avatar: "#10b981",
      stats: { meetingsAttended: 76, messagesSent: 897, reviewsGiven: 31, experimentsRun: 15 },
      recentActivity: [
        { id: "a9", action: "Status change", description: "Changed status to busy", timestamp: new Date(now - 900000).toISOString(), type: "status_change" },
        { id: "a10", action: "Ran experiment", description: "Started GWAS analysis on cohort dataset", timestamp: new Date(now - 3600000).toISOString(), type: "experiment" },
      ],
    },
    {
      id: "mem-004",
      name: "Elena Rodriguez",
      email: "elena.r@virtuallab.io",
      role: "Analyst",
      status: "away",
      skills: [
        { name: "Data Visualization", proficiency: "expert" },
        { name: "SQL", proficiency: "expert" },
        { name: "Statistics", proficiency: "intermediate" },
        { name: "Tableau", proficiency: "expert" },
      ],
      bio: "Data analyst specializing in scientific data visualization and dashboard creation. Translates complex datasets into actionable insights for research teams.",
      timezone: "UTC+1 (Central European)",
      availability: "Part-time",
      joinedAt: new Date(now - 180 * 86400000).toISOString(),
      avatar: "#06b6d4",
      stats: { meetingsAttended: 54, messagesSent: 623, reviewsGiven: 18, experimentsRun: 4 },
      recentActivity: [
        { id: "a11", action: "Exported report", description: "Generated Q3 analytics report", timestamp: new Date(now - 7200000).toISOString(), type: "review" },
        { id: "a12", action: "Viewed analytics", description: "Reviewed pipeline performance dashboard", timestamp: new Date(now - 14400000).toISOString(), type: "review" },
      ],
    },
    {
      id: "mem-005",
      name: "James Park",
      email: "james.p@virtuallab.io",
      role: "Reviewer",
      status: "offline",
      skills: [
        { name: "Peer Review", proficiency: "expert" },
        { name: "Scientific Writing", proficiency: "expert" },
        { name: "Molecular Biology", proficiency: "intermediate" },
        { name: "LaTeX", proficiency: "intermediate" },
      ],
      bio: "Senior reviewer with background in molecular biology and 20+ years of experience in peer reviewing for top-tier scientific journals. Ensures quality and rigor across all team outputs.",
      timezone: "UTC-5 (Eastern)",
      availability: "Contract",
      joinedAt: new Date(now - 120 * 86400000).toISOString(),
      avatar: "#f59e0b",
      stats: { meetingsAttended: 32, messagesSent: 412, reviewsGiven: 89, experimentsRun: 0 },
      recentActivity: [
        { id: "a13", action: "Reviewed meeting", description: "Provided feedback on experimental design review", timestamp: new Date(now - 86400000).toISOString(), type: "review" },
        { id: "a14", action: "Reviewed meeting", description: "Reviewed drug candidate screening results", timestamp: new Date(now - 172800000).toISOString(), type: "review" },
      ],
    },
    {
      id: "mem-006",
      name: "Aisha Patel",
      email: "aisha.p@virtuallab.io",
      role: "Viewer",
      status: "online",
      skills: [
        { name: "Literature Search", proficiency: "beginner" },
        { name: "Reference Management", proficiency: "intermediate" },
        { name: "Academic Writing", proficiency: "beginner" },
      ],
      bio: "Graduate student and research intern. Observing team workflows and contributing to literature reviews as part of academic training.",
      timezone: "UTC+5:30 (India)",
      availability: "Intern",
      joinedAt: new Date(now - 30 * 86400000).toISOString(),
      avatar: "#6b7280",
      stats: { meetingsAttended: 8, messagesSent: 34, reviewsGiven: 0, experimentsRun: 0 },
      recentActivity: [
        { id: "a15", action: "Joined team", description: "Aisha Patel joined as Viewer", timestamp: new Date(now - 30 * 86400000).toISOString(), type: "join" },
      ],
    },
  ];
}

function getDefaultSettings(): TeamSettings {
  return {
    teamName: "Virtual Lab Research Team",
    description: "Multidisciplinary team focused on computational biology, NLP, and data analytics for scientific research collaboration.",
    visibility: "internal",
    defaultMeetingDuration: 60,
    defaultMeetingType: "team",
    notifications: {
      memberJoined: true,
      roleChanged: true,
      meetingCreated: true,
      experimentCompleted: true,
    },
  };
}

function getGlobalActivityLog(): ActivityItem[] {
  const now = Date.now();
  return [
    { id: "ga1", action: "Member joined", description: "Aisha Patel joined as Viewer", timestamp: new Date(now - 86400000).toISOString(), type: "join" },
    { id: "ga2", action: "Role changed", description: "Marcus Williams promoted to Lead Researcher", timestamp: new Date(now - 172800000).toISOString(), type: "role_change" },
    { id: "ga3", action: "Meeting created", description: "Sprint planning meeting created by Sarah Chen", timestamp: new Date(now - 259200000).toISOString(), type: "meeting" },
    { id: "ga4", action: "Permission updated", description: "Analyst role granted export_data permission", timestamp: new Date(now - 345600000).toISOString(), type: "permission" },
    { id: "ga5", action: "Experiment completed", description: "Drug screening experiment #E-038 completed by Yuki Tanaka", timestamp: new Date(now - 432000000).toISOString(), type: "experiment" },
    { id: "ga6", action: "Member joined", description: "Elena Rodriguez joined as Analyst", timestamp: new Date(now - 15552000000).toISOString(), type: "join" },
    { id: "ga7", action: "Review submitted", description: "James Park submitted review for meeting M-045", timestamp: new Date(now - 604800000).toISOString(), type: "review" },
    { id: "ga8", action: "Settings updated", description: "Team visibility changed to Internal", timestamp: new Date(now - 691200000).toISOString(), type: "permission" },
  ];
}

// ============================================================
// In-memory Store
// ============================================================

let members: TeamMember[] | null = null;
let roles: Role[] | null = null;
let settings: TeamSettings | null = null;
let activityLog: ActivityItem[] | null = null;

function ensureSeeded() {
  if (!members) members = getSampleMembers();
  if (!roles) roles = getDefaultRoles();
  if (!settings) settings = getDefaultSettings();
  if (!activityLog) activityLog = getGlobalActivityLog();
}

// ============================================================
// GET handler
// ============================================================

export async function GET(request: Request) {
  try {
    ensureSeeded();
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const resource = pathParts[pathParts.length - 1];

    // GET /api/team/members
    if (url.pathname.includes("/members")) {
      const role = url.searchParams.get("role");
      const status = url.searchParams.get("status");
      const search = url.searchParams.get("search");

      let filtered = [...(members ?? [])];

      if (role) {
        filtered = filtered.filter(m => m.role === role);
      }
      if (status) {
        filtered = filtered.filter(m => m.status === status);
      }
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(m =>
          m.name.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query) ||
          m.skills.some(s => s.name.toLowerCase().includes(query))
        );
      }

      return NextResponse.json({ members: filtered, total: filtered.length });
    }

    // GET /api/team/roles
    if (url.pathname.includes("/roles")) {
      return NextResponse.json({ roles: roles ?? [], permissions: PERMISSIONS });
    }

    // GET /api/team/permissions
    if (url.pathname.includes("/permissions")) {
      const matrix: Record<string, Record<string, boolean>> = {};
      (roles ?? []).forEach(r => {
        matrix[r.id] = { ...r.permissions };
      });
      return NextResponse.json({
        permissions: PERMISSIONS,
        roles: roles ?? [],
        matrix,
      });
    }

    // GET /api/team/activity
    if (url.pathname.includes("/activity")) {
      const limitParam = url.searchParams.get("limit");
      const limit = limitParam ? parseInt(limitParam, 10) : 20;
      const sorted = [...(activityLog ?? [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      return NextResponse.json({ activities: sorted.slice(0, limit), total: sorted.length });
    }

    // GET /api/team/settings
    if (url.pathname.includes("/settings")) {
      return NextResponse.json({ settings: settings });
    }

    // GET /api/team (default: return everything)
    return NextResponse.json({
      members: members ?? [],
      roles: roles ?? [],
      settings: settings,
      activity: activityLog ?? [],
      permissions: PERMISSIONS,
    });
  } catch (error) {
    console.error("[Team API] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch team data" }, { status: 500 });
  }
}

// ============================================================
// POST handler
// ============================================================

export async function POST(request: Request) {
  try {
    ensureSeeded();
    const url = new URL(request.url);
    const body = await request.json();

    // POST /api/team/member
    if (url.pathname.includes("/member")) {
      const { name, email, role, skills, bio } = body;

      if (!name || !email) {
        return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
      }

      const validRoles = (roles ?? []).map(r => r.name);
      const assignedRole = role && validRoles.includes(role) ? role : "Viewer";

      const newMember: TeamMember = {
        id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        email,
        role: assignedRole,
        status: "online",
        skills: Array.isArray(skills) ? skills : [],
        bio: bio || "",
        timezone: "UTC",
        availability: "Full-time",
        joinedAt: new Date().toISOString(),
        avatar: (roles ?? []).find(r => r.name === assignedRole)?.color ?? "#6b7280",
        stats: { meetingsAttended: 0, messagesSent: 0, reviewsGiven: 0, experimentsRun: 0 },
        recentActivity: [],
      };

      members = [...(members ?? []), newMember];

      activityLog = [
        {
          id: `ga-${Date.now()}`,
          action: "Member joined",
          description: `${name} joined as ${assignedRole}`,
          timestamp: new Date().toISOString(),
          type: "join",
        },
        ...(activityLog ?? []),
      ];

      return NextResponse.json(newMember, { status: 201 });
    }

    // POST /api/team/activity
    if (url.pathname.includes("/activity")) {
      const { action, description, type } = body;
      const newActivity: ActivityItem = {
        id: `ga-${Date.now()}`,
        action: action || "Activity",
        description: description || "",
        timestamp: new Date().toISOString(),
        type: type || "meeting",
      };
      activityLog = [newActivity, ...(activityLog ?? [])];
      return NextResponse.json(newActivity, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown POST endpoint" }, { status: 404 });
  } catch (error) {
    console.error("[Team API] POST error:", error);
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}

// ============================================================
// PUT handler
// ============================================================

export async function PUT(request: Request) {
  try {
    ensureSeeded();
    const url = new URL(request.url);
    const body = await request.json();

    // PUT /api/team/member/[id]
    if (url.pathname.includes("/member")) {
      const id = url.pathname.split("/").pop();
      if (!id) {
        return NextResponse.json({ error: "Member ID required" }, { status: 400 });
      }

      const memberIndex = (members ?? []).findIndex(m => m.id === id);
      if (memberIndex === -1) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      const currentMember = (members ?? [])[memberIndex];
      const updated: TeamMember = {
        ...currentMember,
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.skills !== undefined && { skills: body.skills }),
        ...(body.bio !== undefined && { bio: body.bio }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
        ...(body.availability !== undefined && { availability: body.availability }),
      };

      const updatedMembers = [...(members ?? [])];
      updatedMembers[memberIndex] = updated;
      members = updatedMembers;

      // Log role change
      if (body.role !== undefined && body.role !== currentMember.role) {
        activityLog = [
          {
            id: `ga-${Date.now()}`,
            action: "Role changed",
            description: `${currentMember.name} changed from ${currentMember.role} to ${body.role}`,
            timestamp: new Date().toISOString(),
            type: "role_change",
          },
          ...(activityLog ?? []),
        ];
      }

      return NextResponse.json(updated);
    }

    // PUT /api/team/role/[id]
    if (url.pathname.includes("/role")) {
      const roleId = url.pathname.split("/").pop();
      if (!roleId) {
        return NextResponse.json({ error: "Role ID required" }, { status: 400 });
      }

      const roleIndex = (roles ?? []).findIndex(r => r.id === roleId);
      if (roleIndex === -1) {
        return NextResponse.json({ error: "Role not found" }, { status: 404 });
      }

      const currentRole = (roles ?? [])[roleIndex];
      const updatedRole: Role = {
        ...currentRole,
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.permissions !== undefined && { permissions: body.permissions }),
      };

      const updatedRoles = [...(roles ?? [])];
      updatedRoles[roleIndex] = updatedRole;
      roles = updatedRoles;

      // Log permission change
      if (body.permissions) {
        const permNames = PERMISSIONS.filter(p => body.permissions[p.id] !== currentRole.permissions[p.id])
          .map(p => p.name);
        if (permNames.length > 0) {
          activityLog = [
            {
              id: `ga-${Date.now()}`,
              action: "Permission updated",
              description: `Permissions for ${currentRole.name} updated: ${permNames.join(", ")}`,
              timestamp: new Date().toISOString(),
              type: "permission",
            },
            ...(activityLog ?? []),
          ];
        }
      }

      return NextResponse.json(updatedRole);
    }

    // PUT /api/team/settings
    if (url.pathname.includes("/settings")) {
      settings = { ...settings!, ...body };

      if (body.notifications) {
        settings.notifications = { ...settings.notifications, ...body.notifications };
      }

      return NextResponse.json(settings);
    }

    return NextResponse.json({ error: "Unknown PUT endpoint" }, { status: 404 });
  } catch (error) {
    console.error("[Team API] PUT error:", error);
    return NextResponse.json({ error: "Failed to update resource" }, { status: 500 });
  }
}

// ============================================================
// DELETE handler
// ============================================================

export async function DELETE(request: Request) {
  try {
    ensureSeeded();
    const url = new URL(request.url);

    if (url.pathname.includes("/member")) {
      const id = url.pathname.split("/").pop();
      if (!id) {
        return NextResponse.json({ error: "Member ID required" }, { status: 400 });
      }

      const member = (members ?? []).find(m => m.id === id);
      if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }

      members = (members ?? []).filter(m => m.id !== id);

      activityLog = [
        {
          id: `ga-${Date.now()}`,
          action: "Member removed",
          description: `${member.name} was removed from the team`,
          timestamp: new Date().toISOString(),
          type: "join",
        },
        ...(activityLog ?? []),
      ];

      return NextResponse.json({ success: true, removed: member });
    }

    return NextResponse.json({ error: "Unknown DELETE endpoint" }, { status: 404 });
  } catch (error) {
    console.error("[Team API] DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete resource" }, { status: 500 });
  }
}
