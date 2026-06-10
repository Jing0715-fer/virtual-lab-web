import { NextResponse } from "next/server";

// GET /api/analytics-hub — All mock data for every tab
export async function GET() {
  return NextResponse.json({
    // ── KPI Cards ──
    kpis: {
      totalMeetings: { value: 47, trend: "up", change: 12.5, sparkline: [28, 32, 35, 30, 38, 42, 47] },
      activeAgents: { value: 12, trend: "up", change: 8.3, sparkline: [8, 9, 9, 10, 10, 11, 12] },
      messagesWeek: { value: 1243, trend: "up", change: 18.2, sparkline: [890, 950, 1020, 1100, 1050, 1150, 1243] },
      avgDuration: { value: 34, trend: "flat", change: 0.0, sparkline: [32, 34, 33, 35, 34, 34, 34] },
      researchPapers: { value: 23, trend: "up", change: 21.1, sparkline: [15, 16, 17, 18, 19, 21, 23] },
      experimentsRunning: { value: 7, trend: "down", change: -12.5, sparkline: [12, 10, 11, 9, 8, 8, 7] },
    },

    // ── Overview: 6-month research activity ──
    researchActivity: {
      months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      datasets: {
        Meetings: [12, 15, 18, 14, 20, 22],
        Messages: [890, 1020, 1150, 980, 1200, 1350],
        Experiments: [8, 12, 15, 10, 14, 18],
        Publications: [2, 3, 1, 4, 3, 5],
        Citations: [15, 22, 28, 25, 35, 42],
      },
    },

    // ── Overview: Meeting type distribution ──
    meetingTypes: { Team: 28, Individual: 14, Review: 5 },

    // ── Overview: Agent utilization (top 5 by messages) ──
    agentUtilization: [
      { name: "AlphaFold Agent", messages: 342 },
      { name: "CRISPR Expert", messages: 287 },
      { name: "Drug Screening", messages: 231 },
      { name: "Protein Designer", messages: 198 },
      { name: "Data Analyst", messages: 156 },
    ],

    // ── Overview: Weekly activity heatmap (7 days × 24 hours) ──
    weeklyHeatmap: Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => {
        const base = Math.sin((hour - 12) * 0.5) * 3 + 4;
        const weekend = day >= 5 ? 0.3 : 1;
        return Math.max(0, Math.round(base * weekend + Math.random() * 2));
      })
    ),

    // ── Overview: Recent activity feed ──
    recentActivity: [
      { id: "a1", icon: "message", description: "AlphaFold Agent completed structure prediction for Nanobody-47", time: "2 min ago", color: "#10b981" },
      { id: "a2", icon: "flask", description: "Experiment CRISPR-OFF-12 moved to Analysis stage", time: "8 min ago", color: "#8b5cf6" },
      { id: "a3", icon: "users", description: "Team meeting on Protein Folding Review started", time: "15 min ago", color: "#3b82f6" },
      { id: "a4", icon: "file", description: "New paper published: Multi-Chain Prediction Validation", time: "32 min ago", color: "#f59e0b" },
      { id: "a5", icon: "trending", description: "Weekly productivity score increased by 15%", time: "1 hour ago", color: "#10b981" },
      { id: "a6", icon: "message", description: "CRISPR Expert responded to off-target analysis", time: "1.5 hours ago", color: "#06b6d4" },
      { id: "a7", icon: "flask", description: "Drug screening pipeline Round 3 completed", time: "2 hours ago", color: "#ec4899" },
      { id: "a8", icon: "users", description: "Individual meeting with Data Analyst finished", time: "2.5 hours ago", color: "#8b5cf6" },
      { id: "a9", icon: "file", description: "Dataset uploaded: Single-Cell RNA-Seq Atlas v4", time: "3 hours ago", color: "#f59e0b" },
      { id: "a10", icon: "trending", description: "Research output trend shows 21% growth this month", time: "4 hours ago", color: "#10b981" },
    ],

    // ── Meetings: Weekly trends (12 weeks) ──
    meetingTrends: {
      weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
      team: [4, 3, 5, 4, 6, 5, 3, 4, 5, 6, 4, 5],
      individual: [2, 3, 2, 3, 2, 3, 2, 2, 3, 2, 3, 2],
    },

    // ── Meetings: Duration distribution ──
    meetingDurations: {
      buckets: ["<15min", "15-30min", "30-60min", "60-120min", ">120min"],
      counts: [8, 15, 14, 7, 3],
    },

    // ── Meetings: Top topics ──
    meetingTopics: [
      { topic: "Protein Folding", count: 34 },
      { topic: "CRISPR Off-Target", count: 28 },
      { topic: "Drug Screening", count: 22 },
      { topic: "Nanobody Design", count: 19 },
      { topic: "Structure Prediction", count: 17 },
      { topic: "Binding Affinity", count: 14 },
      { topic: "Molecular Dynamics", count: 11 },
      { topic: "Experimental Validation", count: 9 },
    ],

    // ── Meetings: Success rate ──
    meetingSuccessRate: 87,

    // ── Meetings: Comparison table ──
    meetingComparison: [
      { id: "m1", name: "Protein Folding Review", participants: 6, duration: 45, messages: 78, sentiment: "Positive" },
      { id: "m2", name: "CRISPR Strategy Session", participants: 4, duration: 32, messages: 56, sentiment: "Positive" },
      { id: "m3", name: "Drug Screening Update", participants: 5, duration: 28, messages: 42, sentiment: "Neutral" },
      { id: "m4", name: "Nanobody Design Sprint", participants: 3, duration: 55, messages: 91, sentiment: "Positive" },
      { id: "m5", name: "Data Analysis Sync", participants: 2, duration: 18, messages: 24, sentiment: "Neutral" },
    ],

    // ── Agents: Performance matrix ──
    agentPerformanceMatrix: {
      agents: ["AlphaFold", "CRISPR", "DrugScreen", "ProteinDes", "DataAnalyst", "MolDyn", "GeneExpr", "Validatn", "Pathway", "Imaging"],
      metrics: ["Messages", "Quality", "Participation", "Response Time", "Suggestions"],
      data: [
        [0.95, 0.88, 0.92, 0.78, 0.85],
        [0.85, 0.91, 0.88, 0.82, 0.79],
        [0.72, 0.85, 0.75, 0.90, 0.88],
        [0.80, 0.76, 0.82, 0.85, 0.92],
        [0.65, 0.90, 0.70, 0.95, 0.78],
        [0.78, 0.82, 0.80, 0.76, 0.85],
        [0.70, 0.88, 0.72, 0.88, 0.80],
        [0.60, 0.95, 0.65, 0.92, 0.90],
        [0.68, 0.84, 0.74, 0.80, 0.82],
        [0.55, 0.79, 0.60, 0.85, 0.75],
      ],
    },

    // ── Agents: Collaboration network ──
    agentNetwork: {
      nodes: [
        { id: "n1", name: "AlphaFold", x: 200, y: 150, contribution: 95, color: "#10b981" },
        { id: "n2", name: "CRISPR", x: 350, y: 100, contribution: 85, color: "#3b82f6" },
        { id: "n3", name: "DrugScreen", x: 320, y: 250, contribution: 72, color: "#8b5cf6" },
        { id: "n4", name: "ProteinDes", x: 150, y: 280, contribution: 80, color: "#f59e0b" },
        { id: "n5", name: "DataAnalyst", x: 450, y: 200, contribution: 65, color: "#ec4899" },
        { id: "n6", name: "MolDyn", x: 250, y: 50, contribution: 78, color: "#06b6d4" },
        { id: "n7", name: "GeneExpr", x: 100, y: 180, contribution: 70, color: "#ef4444" },
        { id: "n8", name: "Validation", x: 400, y: 300, contribution: 60, color: "#14b8a6" },
      ],
      edges: [
        { source: "n1", target: "n2", weight: 8 },
        { source: "n1", target: "n4", weight: 6 },
        { source: "n1", target: "n6", weight: 7 },
        { source: "n2", target: "n3", weight: 5 },
        { source: "n2", target: "n5", weight: 4 },
        { source: "n3", target: "n5", weight: 6 },
        { source: "n3", target: "n8", weight: 5 },
        { source: "n4", target: "n6", weight: 4 },
        { source: "n4", target: "n7", weight: 3 },
        { source: "n5", target: "n8", weight: 5 },
        { source: "n6", target: "n7", weight: 4 },
        { source: "n1", target: "n8", weight: 3 },
      ],
    },

    // ── Agents: Growth timeline ──
    agentGrowthTimeline: {
      months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      cumulative: [
        { name: "AlphaFold", values: [180, 320, 520, 680, 870, 1050] },
        { name: "CRISPR", values: [120, 250, 400, 530, 680, 820] },
        { name: "DrugScreen", values: [80, 180, 300, 410, 540, 650] },
        { name: "ProteinDes", values: [60, 140, 240, 350, 450, 560] },
      ],
    },

    // ── Research: Output over time (stacked) ──
    researchOutput: {
      months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      papers: [3, 4, 2, 5, 3, 6],
      experiments: [5, 8, 10, 7, 9, 12],
      reviews: [2, 3, 2, 4, 3, 4],
      datasets: [1, 2, 3, 2, 4, 3],
    },

    // ── Research: Topic cloud ──
    researchTopics: [
      { word: "AlphaFold", count: 45, size: 48 },
      { word: "CRISPR", count: 38, size: 42 },
      { word: "Nanobody", count: 32, size: 38 },
      { word: "Drug Screening", count: 28, size: 35 },
      { word: "Binding Affinity", count: 24, size: 32 },
      { word: "Structure Prediction", count: 22, size: 30 },
      { word: "Molecular Dynamics", count: 20, size: 28 },
      { word: "Protein Folding", count: 19, size: 27 },
      { word: "Off-Target", count: 17, size: 25 },
      { word: "Gene Expression", count: 16, size: 24 },
      { word: "Deep Learning", count: 15, size: 23 },
      { word: "Cryo-EM", count: 14, size: 22 },
      { word: "Single-Cell", count: 13, size: 21 },
      { word: "Transformer", count: 12, size: 20 },
      { word: "Docking", count: 11, size: 19 },
      { word: "Phosphorylation", count: 10, size: 18 },
      { word: "RNA-Seq", count: 9, size: 17 },
      { word: "Epigenomics", count: 8, size: 16 },
      { word: "Proteomics", count: 8, size: 16 },
      { word: "Variant Calling", count: 7, size: 15 },
      { word: "Clustering", count: 6, size: 14 },
      { word: "Embedding", count: 5, size: 13 },
    ],

    // ── Research: Experiment pipeline funnel ──
    experimentFunnel: [
      { stage: "Proposed", count: 52, color: "#94a3b8" },
      { stage: "Active", count: 38, color: "#3b82f6" },
      { stage: "Analysis", count: 24, color: "#8b5cf6" },
      { stage: "Complete", count: 15, color: "#f59e0b" },
      { stage: "Published", count: 8, color: "#10b981" },
    ],

    // ── Research: Citation scatter plot ──
    citationScatter: [
      { citations: 42, date: "2024-01", impact: 8.5, title: "Multi-Chain AlphaFold" },
      { citations: 38, date: "2024-02", impact: 9.2, title: "CRISPR Off-Target v3" },
      { citations: 25, date: "2024-03", impact: 7.1, title: "Nanobody Binding" },
      { citations: 55, date: "2024-01", impact: 12.3, title: "Protein Folding Atlas" },
      { citations: 18, date: "2024-04", impact: 5.8, title: "Drug Screening Pipeline" },
      { citations: 30, date: "2024-02", impact: 8.0, title: "Molecular Dynamics Review" },
      { citations: 22, date: "2024-05", impact: 6.5, title: "Single-Cell Methods" },
      { citations: 48, date: "2024-03", impact: 10.1, title: "Transformer Proteomics" },
      { citations: 12, date: "2024-06", impact: 4.2, title: "Docking Optimization" },
      { citations: 35, date: "2024-04", impact: 7.8, title: "Cryo-EM Validation" },
      { citations: 8, date: "2024-05", impact: 3.5, title: "Variant Calling" },
      { citations: 20, date: "2024-06", impact: 6.0, title: "Gene Expression Atlas" },
    ],

    // ── Productivity: Daily score (30 days) ──
    productivityScores: Array.from({ length: 30 }, (_, i) => {
      const base = 65 + Math.sin(i * 0.3) * 15;
      return Math.round(base + Math.random() * 10);
    }),

    // ── Productivity: Focus time distribution ──
    focusDistribution: { Research: 42, Meetings: 28, Admin: 18, Break: 12 },

    // ── Productivity: Task completion rate ──
    taskCompletionRate: 78,

    // ── Productivity: Scores by day of week ──
    productivityByDay: [
      { day: "Mon", score: 82 },
      { day: "Tue", score: 88 },
      { day: "Wed", score: 85 },
      { day: "Thu", score: 90 },
      { day: "Fri", score: 78 },
      { day: "Sat", score: 45 },
      { day: "Sun", score: 32 },
    ],

    // ── Productivity: Streak ──
    productivityStreak: { current: 12, calendarHeat: Array.from({ length: 35 }, () => Math.random() > 0.3 ? 1 : 0) },

    // ── Resources: Utilization ──
    resourceUtilization: [
      { type: "Papers", size: 4.2, color: "#ef4444" },
      { type: "Datasets", size: 18.7, color: "#3b82f6" },
      { type: "Code", size: 6.8, color: "#10b981" },
      { type: "Images", size: 3.1, color: "#8b5cf6" },
      { type: "Other", size: 1.9, color: "#64748b" },
    ],

    // ── Resources: Download trends (12 weeks) ──
    downloadTrends: {
      weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],
      downloads: [120, 145, 160, 180, 210, 195, 230, 250, 245, 270, 290, 310],
    },

    // ── Resources: Most viewed ──
    mostViewedResources: [
      { title: "AlphaFold Multi-Chain Pipeline", views: 1245, sparkline: [45, 52, 48, 60, 55, 68, 72] },
      { title: "CRISPR Guide RNA Database", views: 987, sparkline: [38, 42, 45, 50, 48, 55, 60] },
      { title: "Drug Screening Hit List Q4", views: 856, sparkline: [30, 35, 32, 40, 42, 38, 45] },
      { title: "Nanobody Structure Collection", views: 743, sparkline: [25, 28, 30, 35, 32, 38, 40] },
      { title: "Single-Cell RNA-Seq Atlas v3", views: 689, sparkline: [22, 25, 28, 30, 32, 35, 38] },
      { title: "Molecular Dynamics Trajectories", views: 612, sparkline: [18, 22, 20, 25, 28, 30, 32] },
      { title: "Protein Folding Benchmark", views: 534, sparkline: [15, 18, 20, 22, 25, 24, 28] },
      { title: "Gene Expression Heatmaps", views: 478, sparkline: [12, 15, 18, 20, 18, 22, 25] },
      { title: "Cryo-EM Density Maps", views: 421, sparkline: [10, 12, 15, 16, 18, 20, 22] },
      { title: "ADMET Prediction Results", views: 389, sparkline: [8, 10, 12, 15, 14, 18, 20] },
    ],

    // ── Resources: Storage growth (6 months) ──
    storageGrowth: {
      months: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      values: [22.4, 24.8, 27.1, 29.5, 31.8, 34.7],
    },

    // ── Team: Activity heatmap ──
    teamHeatmap: Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: 24 }, (_, hour) => {
        const base = Math.sin((hour - 14) * 0.4) * 4 + 5;
        const weekend = day >= 5 ? 0.25 : 1;
        return Math.max(0, Math.round(base * weekend + Math.random() * 2));
      })
    ),

    // ── Team: Leaderboard ──
    teamLeaderboard: [
      { rank: 1, name: "Dr. Sarah Chen", initials: "SC", color: "#10b981", score: 245, badge: "Gold" },
      { rank: 2, name: "Dr. Maria Garcia", initials: "MG", color: "#8b5cf6", score: 218, badge: "Silver" },
      { rank: 3, name: "Dr. James Park", initials: "JP", color: "#3b82f6", score: 195, badge: "Bronze" },
      { rank: 4, name: "Dr. Wei Zhang", initials: "WZ", color: "#f59e0b", score: 178 },
      { rank: 5, name: "Dr. David Kim", initials: "DK", color: "#ef4444", score: 162 },
      { rank: 6, name: "Dr. Lisa Wang", initials: "LW", color: "#ec4899", score: 148 },
      { rank: 7, name: "Dr. Alex Rivera", initials: "AR", color: "#06b6d4", score: 134 },
      { rank: 8, name: "Dr. Priya Sharma", initials: "PS", color: "#14b8a6", score: 121 },
    ],

    // ── Team: Collaboration index ──
    collaborationIndex: [
      { metric: "Communication", value: 88 },
      { metric: "Coordination", value: 76 },
      { metric: "Knowledge Sharing", value: 82 },
      { metric: "Trust", value: 91 },
      { metric: "Shared Goals", value: 85 },
    ],

    // ── Team: Response time distribution ──
    responseTimeDist: {
      buckets: ["<1min", "1-5min", "5-15min", "15-30min", "30-60min", ">60min"],
      counts: [45, 82, 68, 35, 18, 8],
    },
  });
}
