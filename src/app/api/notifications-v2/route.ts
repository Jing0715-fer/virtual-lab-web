import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

type NotificationType = 'meeting' | 'agent' | 'research' | 'system' | 'mention' | 'alert'

interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  isRead: boolean
  isBookmarked: boolean
  link?: string
  fullContent?: string
}

interface NotificationPreferences {
  typesEnabled: Record<NotificationType, boolean>
  quietHoursStart: number
  quietHoursEnd: number
  deliveryMethods: { inApp: boolean; email: boolean; sms: boolean }
  frequency: 'instant' | 'hourly' | 'daily'
  soundEnabled: boolean
  soundName: string
}

// ─── Mock Data ──────────────────────────────────────────────────

const notifications: NotificationItem[] = [
  // Just Now
  { id: 'n1', type: 'agent', title: 'Agent reached milestone', description: 'AlphaFold Agent completed 500 structure predictions this month.', timestamp: new Date(Date.now() - 60000).toISOString(), isRead: false, isBookmarked: false, link: '/agents', fullContent: 'The AlphaFold Agent has reached a significant milestone of 500 structure predictions in January 2025, surpassing the previous monthly record by 23%. Accuracy metrics remain above 92% pLDDT threshold.' },
  { id: 'n2', type: 'alert', title: 'Error in pipeline execution', description: 'Nanobody Design Pipeline failed at step "Quality Check" — Rosetta scoring timeout.', timestamp: new Date(Date.now() - 120000).toISOString(), isRead: false, isBookmarked: false, link: '/research-workflow', fullContent: 'The pipeline encountered a timeout error during the Rosetta InterfaceAnalyzer step. The scoring job exceeded the 45-minute limit. Consider increasing the timeout or optimizing the input structures.' },
  { id: 'n3', type: 'meeting', title: 'New meeting scheduled', description: 'Team standup scheduled for tomorrow at 10:00 AM with 5 participants.', timestamp: new Date(Date.now() - 180000).toISOString(), isRead: false, isBookmarked: false, link: '/collaboration-hub', fullContent: 'A new team standup meeting has been scheduled for January 21, 2025 at 10:00 AM. Participants: Dr. Sarah Chen, Dr. Wei Zhang, Dr. Lisa Wang, Dr. Michael Ross, Dr. Sophie Martin.' },

  // 5 minutes ago
  { id: 'n4', type: 'research', title: 'Paper cited', description: 'Your paper "Nanobody Design Optimization" was cited by a new publication on bioRxiv.', timestamp: new Date(Date.now() - 300000).toISOString(), isRead: false, isBookmarked: true, link: '/research-portfolio', fullContent: 'Your paper "Computational Design of Novel Nanobodies Targeting SARS-CoV-2 Spike Protein Variants" (Chen et al., 2024) has been cited by a new preprint on bioRxiv titled "Multi-epitope nanobody cocktails for broad coronavirus neutralization."' },
  { id: 'n5', type: 'system', title: 'Server maintenance', description: 'Scheduled maintenance window tonight from 2:00 AM to 4:00 AM UTC.', timestamp: new Date(Date.now() - 360000).toISOString(), isRead: false, isBookmarked: false, fullContent: 'Routine server maintenance is scheduled for tonight, January 20, from 2:00 AM to 4:00 AM UTC. All active workflows will be paused and resumed automatically. No data loss is expected.' },
  { id: 'n6', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Wei Zhang mentioned you in the Protein Structure channel: "Great work on the AlphaFold integration!"', timestamp: new Date(Date.now() - 420000).toISOString(), isRead: false, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Dr. Wei Zhang mentioned you in the #protein-structure channel: "Great work on the AlphaFold integration! The prediction accuracy has improved significantly since the last update."' },

  // 1 hour ago
  { id: 'n7', type: 'agent', title: 'New agent added', description: 'Review Agent v2.1 has been deployed with improved decision accuracy.', timestamp: new Date(Date.now() - 3600000).toISOString(), isRead: false, isBookmarked: false, link: '/agents', fullContent: 'Review Agent v2.1 has been successfully deployed to the production environment. Key improvements: 15% better decision accuracy on quality checks, support for multi-modal input review, and reduced false-positive rate by 40%.' },
  { id: 'n8', type: 'research', title: 'Experiment result available', description: 'CRISPR guide RNA optimization experiment #287 completed with 94% efficiency.', timestamp: new Date(Date.now() - 3900000).toISOString(), isRead: false, isBookmarked: true, link: '/virtual-lab', fullContent: 'Experiment #287 has completed. Results: 94% editing efficiency at the target locus, with a 2.1% off-target rate. The optimized guide RNA sequence outperformed the control by 31 percentage points. Full results are available in the experiment tracker.' },
  { id: 'n9', type: 'meeting', title: 'Team meeting completed', description: 'Weekly research sync ended. 3 action items assigned, 2 decisions made.', timestamp: new Date(Date.now() - 4200000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Weekly research sync meeting completed at 11:30 AM. Action items: (1) Dr. Chen to finalize nanobody candidates by Friday, (2) Dr. Zhang to submit AlphaFold benchmark results, (3) Dr. Wang to prepare ADMET screening proposal.' },

  // Today
  { id: 'n10', type: 'system', title: 'New version available', description: 'Virtual Lab v3.2.0 is available with performance improvements and new features.', timestamp: new Date(Date.now() - 14400000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Virtual Lab v3.2.0 is now available. Release highlights: 40% faster pipeline execution, new workflow visualization canvas, enhanced collaboration tools, and 12 bug fixes. Update at your convenience.' },
  { id: 'n11', type: 'research', title: 'Experiment result available', description: 'Gene expression atlas batch processing completed for 8 tissue types.', timestamp: new Date(Date.now() - 18000000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'Batch processing of gene expression data for 8 tissue types has completed successfully. All samples passed QC thresholds. Differential expression analysis results are available in the knowledge graph.' },
  { id: 'n12', type: 'agent', title: 'Agent reached milestone', description: 'Data Curator processed 10,000 dataset entries this quarter.', timestamp: new Date(Date.now() - 21600000).toISOString(), isRead: true, isBookmarked: false, link: '/agents', fullContent: 'The Data Curator agent has processed 10,000 dataset entries in Q4 2024, maintaining a 99.2% accuracy rate in metadata extraction and standardization.' },
  { id: 'n13', type: 'alert', title: 'Error in pipeline execution', description: 'Literature Review workflow was cancelled due to API rate limits on Semantic Scholar.', timestamp: new Date(Date.now() - 25200000).toISOString(), isRead: true, isBookmarked: false, link: '/research-workflow', fullContent: 'The Literature Review pipeline was automatically cancelled after exceeding the Semantic Scholar API rate limit (100 requests/minute). The workflow completed 60% of the search phase. Consider adding rate-limiting middleware or splitting into smaller batches.' },
  { id: 'n14', type: 'meeting', title: 'New meeting scheduled', description: 'Project review with external collaborators on January 25 at 2:00 PM.', timestamp: new Date(Date.now() - 28800000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'External project review meeting scheduled for January 25, 2025 at 2:00 PM UTC. External collaborators from Stanford and MIT will join. Agenda: Phase 2 progress review and joint publication planning.' },
  { id: 'n15', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Sarah Chen mentioned you in the Nanobody channel: "Please review the binding affinity data."', timestamp: new Date(Date.now() - 32400000).toISOString(), isRead: true, isBookmarked: true, link: '/collaboration-hub', fullContent: 'Dr. Sarah Chen mentioned you in the #nanobody-design channel: "Please review the binding affinity data for candidates NB-042 through NB-050 when you get a chance. The Rosetta scores look promising."' },

  // Earlier
  { id: 'n16', type: 'system', title: 'Backup completed', description: 'Daily backup of all project data completed successfully. 2.4 GB backed up.', timestamp: new Date(Date.now() - 86400000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Daily backup completed at 3:00 AM UTC. 2.4 GB of project data backed up to encrypted cloud storage. Next backup scheduled for tomorrow at 3:00 AM UTC.' },
  { id: 'n17', type: 'research', title: 'Paper cited', description: 'Your CRISPR optimization paper received its 50th citation on Google Scholar.', timestamp: new Date(Date.now() - 90000000).toISOString(), isRead: true, isBookmarked: true, link: '/research-portfolio', fullContent: 'Your publication "Machine Learning-Guided Optimization of Guide RNA Design" has received its 50th citation on Google Scholar. Current citation trajectory suggests reaching 100 citations by Q3 2025.' },
  { id: 'n18', type: 'agent', title: 'Agent performance update', description: 'Rosetta Scorer average job time reduced by 18% after latest optimization.', timestamp: new Date(Date.now() - 172800000).toISOString(), isRead: true, isBookmarked: false, link: '/agents', fullContent: 'Following the v2.4 update, the Rosetta Scorer agent has achieved an 18% reduction in average job time, from 32 minutes to 26 minutes per structure. Memory usage also decreased by 12%.' },
  { id: 'n19', type: 'meeting', title: 'Team meeting completed', description: 'Monthly department review ended. Budget approved for Q2 equipment purchases.', timestamp: new Date(Date.now() - 180000000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Monthly department review completed. Key outcomes: Q2 equipment budget of $180,000 approved, two new postdoc positions authorized, and collaboration agreement with MIT finalized.' },
  { id: 'n20', type: 'alert', title: 'High memory usage detected', description: 'Cluster Engine exceeded 90% memory threshold during batch processing job.', timestamp: new Date(Date.now() - 259200000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'The Cluster Engine agent exceeded the 90% memory threshold during a large-scale clustering job. The job was automatically paused and resumed after memory optimization. Consider upgrading to the high-memory compute tier.' },
  { id: 'n21', type: 'research', title: 'Experiment result available', description: 'Protein crystallization trial #15 yielded promising diffraction at 2.1Å resolution.', timestamp: new Date(Date.now() - 345600000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'Protein crystallization trial #15 for the target protein NB-042 yielded promising results. Initial diffraction data shows resolution of 2.1Å, which is sufficient for structure determination. Data collection is scheduled for next week.' },
  { id: 'n22', type: 'system', title: 'Security update applied', description: 'SSL certificates renewed and security patches applied to all services.', timestamp: new Date(Date.now() - 432000000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Automated security maintenance completed: SSL certificates renewed for all subdomains, 3 critical patches applied to authentication service, and dependency vulnerabilities updated.' },
  { id: 'n23', type: 'mention', title: 'You were mentioned in discussion', description: 'Dr. Lisa Wang mentioned you: "Can you check the ADMET predictions for lead compound LC-12?"', timestamp: new Date(Date.now() - 518400000).toISOString(), isRead: true, isBookmarked: false, link: '/collaboration-hub', fullContent: 'Dr. Lisa Wang mentioned you in the #drug-discovery channel: "Can you check the ADMET predictions for lead compound LC-12? The solubility scores seem off and I want a second opinion before we proceed to animal studies."' },
  { id: 'n24', type: 'meeting', title: 'New meeting scheduled', description: 'Grant writing workshop on February 3 at 1:00 PM in Conference Room B.', timestamp: new Date(Date.now() - 604800000).toISOString(), isRead: true, isBookmarked: true, link: '/collaboration-hub', fullContent: 'Grant writing workshop scheduled for February 3, 2025 at 1:00 PM in Conference Room B. Focus: NIH R01 proposals. Facilitator: Dr. Robert Miller.' },
  { id: 'n25', type: 'system', title: 'Storage quota warning', description: 'Project storage usage at 85% (425 GB / 500 GB). Consider archiving old datasets.', timestamp: new Date(Date.now() - 691200000).toISOString(), isRead: true, isBookmarked: false, fullContent: 'Your project storage usage has reached 85% (425 GB of 500 GB). To avoid service interruptions, consider archiving completed experiment datasets older than 6 months or requesting additional storage allocation.' },
  { id: 'n26', type: 'research', title: 'New dataset available', description: 'Updated PDB structural database with 15,000 new entries is ready for use.', timestamp: new Date(Date.now() - 777600000).toISOString(), isRead: true, isBookmarked: false, link: '/virtual-lab', fullContent: 'The PDB structural database has been updated with 15,000 new entries from the January 2025 release. Updated training sets are available for AlphaFold and Rosetta agents.' },
]

const preferences: NotificationPreferences = {
  typesEnabled: {
    meeting: true,
    agent: true,
    research: true,
    system: true,
    mention: true,
    alert: true,
  },
  quietHoursStart: 22,
  quietHoursEnd: 7,
  deliveryMethods: { inApp: true, email: false, sms: false },
  frequency: 'instant',
  soundEnabled: true,
  soundName: 'Gentle Chime',
}

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  const unreadCount = notifications.filter(n => !n.isRead).length
  const mentionCount = notifications.filter(n => n.type === 'mention' && !n.isRead).length
  const alertCount = notifications.filter(n => n.type === 'alert' && !n.isRead).length

  const data = {
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      notifications,
      preferences,
      stats: { unreadCount, mentionCount, alertCount, totalCount: notifications.length },
    },
  }

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120',
    },
  })
}
