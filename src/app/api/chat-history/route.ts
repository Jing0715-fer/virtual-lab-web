import { NextResponse } from 'next/server'

const COLORS = ['#10b981','#06b6d4','#8b5cf6','#f59e0b','#ef4444','#ec4899','#3b82f6','#14b8a6','#f97316','#6366f1']

interface Message {
  id: string
  sender: string
  avatar_color: string
  content: string
  timestamp: string
  type: 'question' | 'answer' | 'follow-up' | 'decision' | 'data-point'
  sentiment: 'positive' | 'neutral' | 'negative'
  reactions: { emoji: string; count: number }[]
}

interface Conversation {
  id: string
  title: string
  date: string
  date_group: string
  participants: { name: string; avatar_color: string }[]
  message_count: number
  last_message: string
  unread: number
  messages: Message[]
}

function pick(arr: string[], count: number): string[] {
  const copy = [...arr]
  const result: string[] = []
  for (let idx = 0; idx < count && copy.length > 0; idx++) {
    const ri = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(ri, 1)[0])
  }
  return result
}

function mkParticipant(name: string, ci: number) {
  return { name, avatar_color: COLORS[ci % COLORS.length] }
}

const conversations: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Nanobody Design Pipeline Review',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    date_group: 'Today',
    participants: [mkParticipant('Dr. Sarah Chen', 0), mkParticipant('Agent Alpha', 1), mkParticipant('Dr. Marcus Webb', 2)],
    message_count: 28,
    last_message: 'Confirmed — moving to Phase 3 expression testing tomorrow.',
    unread: 3,
    messages: [
      { id: 'm1', sender: 'Dr. Sarah Chen', avatar_color: COLORS[0], content: 'Team, let\'s review the current nanobody design pipeline. We\'ve completed **Phase 1** screening with promising candidates.', timestamp: '09:15 AM', type: 'question', sentiment: 'positive', reactions: [{ emoji: '👍', count: 3 }, { emoji: '🔬', count: 2 }] },
      { id: 'm2', sender: 'Agent Alpha', avatar_color: COLORS[1], content: 'I\'ve analyzed the binding affinity data for the top 12 candidates. **NB-047** shows the highest predicted affinity at **2.3 nM** against the target epitope.\n\n```\nCandidate | Affinity | Specificity\nNB-047    | 2.3 nM  | 98.2%\nNB-023    | 4.1 nM  | 95.7%\nNB-089    | 5.6 nM  | 92.1%\n```', timestamp: '09:18 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📊', count: 4 }] },
      { id: 'm3', sender: 'Dr. Marcus Webb', avatar_color: COLORS[2], content: 'Excellent results. The specificity scores for NB-047 are remarkable. Should we prioritize that for the *in vitro* expression?', timestamp: '09:22 AM', type: 'follow-up', sentiment: 'positive', reactions: [{ emoji: '💡', count: 2 }] },
      { id: 'm4', sender: 'Dr. Sarah Chen', avatar_color: COLORS[0], content: 'Yes, but let\'s also consider **NB-023** — its stability profile is superior at elevated temperatures.\n\n- Thermal stability: 78°C vs 71°C\n- Half-life: 48h vs 36h\n- Expression yield: 85 mg/L', timestamp: '09:25 AM', type: 'answer', sentiment: 'neutral', reactions: [{ emoji: '🤔', count: 1 }] },
      { id: 'm5', sender: 'Agent Alpha', avatar_color: COLORS[1], content: 'Running a comparative structural analysis now. The CDR3 loop conformation in NB-047 appears more favorable for epitope binding, while NB-023 has a more rigid framework region.', timestamp: '09:30 AM', type: 'data-point', sentiment: 'positive', reactions: [] },
      { id: 'm6', sender: 'Dr. Marcus Webb', avatar_color: COLORS[2], content: 'I propose we advance **both** candidates to Phase 2. We can run parallel expression tests.', timestamp: '09:35 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '✅', count: 5 }, { emoji: '🎉', count: 3 }] },
      { id: 'm7', sender: 'Dr. Sarah Chen', avatar_color: COLORS[0], content: 'Agreed. Confirmed — moving to Phase 3 expression testing tomorrow.', timestamp: '09:40 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '🚀', count: 4 }] },
    ]
  },
  {
    id: 'conv-002',
    title: 'Protein Folding Simulation Results',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    date_group: 'Today',
    participants: [mkParticipant('Agent Beta', 3), mkParticipant('Dr. Emily Park', 4), mkParticipant('Dr. James Liu', 5)],
    message_count: 22,
    last_message: 'The RMSD convergence suggests our force field parameters are well calibrated.',
    unread: 0,
    messages: [
      { id: 'm8', sender: 'Agent Beta', avatar_color: COLORS[3], content: 'The 500ns protein folding simulation for the de novo designed enzyme has completed. Key metrics:\n\n- **Final RMSD**: 1.8 Å\n- **GDT-TS score**: 0.87\n- **TM-score**: 0.92\n- **MolProbity clashscore**: 3.2', timestamp: '10:30 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🎯', count: 6 }] },
      { id: 'm9', sender: 'Dr. Emily Park', avatar_color: COLORS[4], content: 'Those TM-scores are exceptional for a computationally designed protein. How does the active site geometry compare to our design specifications?', timestamp: '10:35 AM', type: 'question', sentiment: 'positive', reactions: [] },
      { id: 'm10', sender: 'Agent Beta', avatar_color: COLORS[3], content: 'The catalytic triad residues are positioned within **0.3 Å** of the target coordinates. The oxyanion hole is correctly formed with the backbone NH groups oriented for optimal stabilization.', timestamp: '10:40 AM', type: 'answer', sentiment: 'positive', reactions: [{ emoji: '👏', count: 3 }] },
      { id: 'm11', sender: 'Dr. James Liu', avatar_color: COLORS[5], content: 'This is a significant result. Let\'s schedule a wet-lab validation for next week. We\'ll need to express and purify the protein first.', timestamp: '10:45 AM', type: 'follow-up', sentiment: 'positive', reactions: [{ emoji: '🧪', count: 2 }] },
      { id: 'm12', sender: 'Dr. Emily Park', avatar_color: COLORS[4], content: 'The RMSD convergence suggests our force field parameters are well calibrated.', timestamp: '10:50 AM', type: 'decision', sentiment: 'positive', reactions: [] },
    ]
  },
  {
    id: 'conv-003',
    title: 'CRISPR Off-Target Analysis Discussion',
    date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    date_group: 'Today',
    participants: [mkParticipant('Dr. Aisha Patel', 6), mkParticipant('Agent Gamma', 7)],
    message_count: 18,
    last_message: 'Proceeding with guide RNA redesign based on these findings.',
    unread: 1,
    messages: [
      { id: 'm13', sender: 'Dr. Aisha Patel', avatar_color: COLORS[6], content: 'The off-target analysis for our CRISPR guide RNAs shows some concerning results. Guide **gRNA-12** has 3 predicted off-target sites with fewer than 2 mismatches.', timestamp: '02:00 PM', type: 'data-point', sentiment: 'negative', reactions: [{ emoji: '⚠️', count: 4 }] },
      { id: 'm14', sender: 'Agent Gamma', avatar_color: COLORS[7], content: 'Analyzing the off-target sequences. Two of them are in intergenic regions, but one is in the **5\' UTR of BRCA1**. This is a critical safety concern.', timestamp: '02:05 PM', type: 'answer', sentiment: 'negative', reactions: [{ emoji: '🛑', count: 3 }] },
      { id: 'm15', sender: 'Dr. Aisha Patel', avatar_color: COLORS[6], content: 'We need to redesign gRNA-12 immediately. Can you run the guide optimization algorithm with stricter constraints?\n\n- Maximum off-targets with ≤2 mismatches: **0**\n- Minimum on-target score: **0.85**\n- GC content: 40-60%', timestamp: '02:10 PM', type: 'follow-up', sentiment: 'neutral', reactions: [] },
      { id: 'm16', sender: 'Agent Gamma', avatar_color: COLORS[7], content: 'Found 4 alternative guide sequences that meet all criteria. The best candidate has an on-target score of **0.92** with **zero** predicted off-target sites.', timestamp: '02:15 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🎉', count: 5 }] },
      { id: 'm17', sender: 'Dr. Aisha Patel', avatar_color: COLORS[6], content: 'Proceeding with guide RNA redesign based on these findings.', timestamp: '02:20 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '✅', count: 2 }] },
    ]
  },
  {
    id: 'conv-004',
    title: 'Drug-Likeness Filter Optimization',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 60 * 2).toISOString(),
    date_group: 'Yesterday',
    participants: [mkParticipant('Agent Delta', 8), mkParticipant('Dr. Kenji Tanaka', 9), mkParticipant('Dr. Lisa Rodriguez', 0)],
    message_count: 15,
    last_message: 'Implementing the revised Lipinski thresholds in the screening pipeline.',
    unread: 0,
    messages: [
      { id: 'm18', sender: 'Agent Delta', avatar_color: COLORS[8], content: 'Our current drug-likeness filter is rejecting too many viable candidates. Analysis of false rejection rate:\n\n- **Standard Lipinski**: 34% false rejection\n- **Adjusted criteria**: 12% false rejection\n- **ML-based filter**: 8% false rejection', timestamp: '11:00 AM', type: 'data-point', sentiment: 'neutral', reactions: [{ emoji: '📈', count: 3 }] },
      { id: 'm19', sender: 'Dr. Kenji Tanaka', avatar_color: COLORS[9], content: 'The ML-based approach is impressive. What features are most important for the prediction?', timestamp: '11:10 AM', type: 'question', sentiment: 'positive', reactions: [] },
      { id: 'm20', sender: 'Agent Delta', avatar_color: COLORS[8], content: 'Top features ranked by importance:\n1. Topological polar surface area\n2. Rotatable bond count\n3. Hydrogen bond donors\n4. LogP (calculated)\n5. Molecular weight / volume ratio', timestamp: '11:15 AM', type: 'answer', sentiment: 'neutral', reactions: [{ emoji: '🧠', count: 2 }] },
      { id: 'm21', sender: 'Dr. Lisa Rodriguez', avatar_color: COLORS[0], content: 'Let\'s implement the revised thresholds. This could significantly improve our hit identification rate.', timestamp: '11:20 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '👍', count: 4 }] },
      { id: 'm22', sender: 'Dr. Kenji Tanaka', avatar_color: COLORS[9], content: 'Implementing the revised Lipinski thresholds in the screening pipeline.', timestamp: '11:25 AM', type: 'decision', sentiment: 'positive', reactions: [] },
    ]
  },
  {
    id: 'conv-005',
    title: 'Cryo-EM Data Processing Pipeline',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 - 1000 * 60 * 60 * 6).toISOString(),
    date_group: 'Yesterday',
    participants: [mkParticipant('Dr. Maya Johnson', 1), mkParticipant('Agent Epsilon', 3)],
    message_count: 20,
    last_message: '3.8 Å global resolution is sufficient for backbone modeling.',
    unread: 0,
    messages: [
      { id: 'm23', sender: 'Dr. Maya Johnson', avatar_color: COLORS[1], content: 'The Cryo-EM processing is complete. We collected 4,200 micrographs with ~85,000 particles after 2D classification.', timestamp: '03:30 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📊', count: 2 }] },
      { id: 'm24', sender: 'Agent Epsilon', avatar_color: COLORS[3], content: '3D refinement results:\n- **Global resolution**: 3.8 Å\n- **Local resolution range**: 3.2-4.5 Å\n- **Map-model FSC**: 0.143 at 3.8 Å\n\nThe active site region shows better local resolution at 3.2 Å.', timestamp: '03:40 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🔬', count: 5 }] },
      { id: 'm25', sender: 'Dr. Maya Johnson', avatar_color: COLORS[1], content: '3.8 Å global resolution is sufficient for backbone modeling.', timestamp: '03:45 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '✅', count: 3 }] },
    ]
  },
  {
    id: 'conv-006',
    title: 'Metagenomics Assembly Strategy',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 60 * 5).toISOString(),
    date_group: 'This Week',
    participants: [mkParticipant('Agent Zeta', 4), mkParticipant('Dr. Robert Kim', 5), mkParticipant('Dr. Priya Sharma', 6)],
    message_count: 24,
    last_message: 'Metabat2 binning recovered 148 high-quality MAGs.',
    unread: 0,
    messages: [
      { id: 'm26', sender: 'Agent Zeta', avatar_color: COLORS[4], content: 'Assembly statistics for the deep-sea sediment metagenome:\n- **Total reads**: 42.3M paired-end\n- **Assembly size**: 8.7 Gb\n- **N50**: 18.2 Kb\n- **Contigs > 1 Kb**: 1.2M', timestamp: '09:00 AM', type: 'data-point', sentiment: 'neutral', reactions: [{ emoji: '🧬', count: 3 }] },
      { id: 'm27', sender: 'Dr. Robert Kim', avatar_color: COLORS[5], content: 'The N50 is lower than expected. Should we try a co-assembly approach with the paired water column samples?', timestamp: '09:10 AM', type: 'question', sentiment: 'neutral', reactions: [] },
      { id: 'm28', sender: 'Agent Zeta', avatar_color: COLORS[4], content: 'Running co-assembly now. Initial results show N50 improving to **24.5 Kb** with the combined dataset.', timestamp: '09:30 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📈', count: 4 }] },
      { id: 'm29', sender: 'Dr. Priya Sharma', avatar_color: COLORS[6], content: 'Metabat2 binning recovered 148 high-quality MAGs.', timestamp: '10:00 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🎉', count: 6 }] },
    ]
  },
  {
    id: 'conv-007',
    title: 'Mass Spectrometry QC Parameters',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 60 * 10).toISOString(),
    date_group: 'This Week',
    participants: [mkParticipant('Dr. Alex Foster', 2), mkParticipant('Agent Eta', 8)],
    message_count: 12,
    last_message: 'QC parameters are within acceptable ranges for publication.',
    unread: 0,
    messages: [
      { id: 'm30', sender: 'Dr. Alex Foster', avatar_color: COLORS[2], content: 'Reviewing the LC-MS/MS QC metrics from yesterday\'s run. Mass accuracy looks good but retention time drift is concerning.', timestamp: '08:00 AM', type: 'question', sentiment: 'negative', reactions: [{ emoji: '⚠️', count: 2 }] },
      { id: 'm31', sender: 'Agent Eta', avatar_color: COLORS[8], content: 'QC report:\n- Mass accuracy: **< 2 ppm** (pass)\n- Retention time CV: **3.8%** (warning > 3%)\n- Peak intensity RSD: **8.2%** (pass)\n- Total ions detected: **4,218**', timestamp: '08:10 AM', type: 'data-point', sentiment: 'neutral', reactions: [] },
      { id: 'm32', sender: 'Dr. Alex Foster', avatar_color: COLORS[2], content: 'QC parameters are within acceptable ranges for publication.', timestamp: '08:15 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '📝', count: 1 }] },
    ]
  },
  {
    id: 'conv-008',
    title: 'Machine Learning Model Training Log',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    date_group: 'This Week',
    participants: [mkParticipant('Agent Theta', 9), mkParticipant('Dr. Nina Okafor', 0)],
    message_count: 16,
    last_message: 'Deploying v3 model to production API endpoint.',
    unread: 0,
    messages: [
      { id: 'm33', sender: 'Agent Theta', avatar_color: COLORS[9], content: 'Model training complete for the protein-protein interaction predictor **v3**.\n\n**Performance metrics:**\n- AUROC: 0.947\n- AUPRC: 0.912\n- F1-score: 0.891\n- Training time: 4.2 hours on 4x A100', timestamp: '02:00 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🤖', count: 5 }, { emoji: '🏆', count: 3 }] },
      { id: 'm34', sender: 'Dr. Nina Okafor', avatar_color: COLORS[0], content: 'The AUROC improvement from v2 (0.912) to v3 (0.947) is significant. What architectural changes drove this?', timestamp: '02:10 PM', type: 'question', sentiment: 'positive', reactions: [] },
      { id: 'm35', sender: 'Agent Theta', avatar_color: COLORS[9], content: 'Key changes:\n1. Attention-based residue pair encoding\n2. Geometric attention for spatial features\n3. Multi-task loss function (binding + interface prediction)\n4. Pre-training on 2.1M known PPIs', timestamp: '02:15 PM', type: 'answer', sentiment: 'positive', reactions: [{ emoji: '💡', count: 4 }] },
      { id: 'm36', sender: 'Dr. Nina Okafor', avatar_color: COLORS[0], content: 'Deploying v3 model to production API endpoint.', timestamp: '02:20 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '🚀', count: 6 }] },
    ]
  },
  {
    id: 'conv-009',
    title: 'ChIP-Seq Peak Calling Discrepancies',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Dr. Chris Nakamura', 7), mkParticipant('Agent Iota', 4), mkParticipant('Dr. Diana Stein', 5)],
    message_count: 19,
    last_message: 'Using MACS2 with the optimized q-value threshold.',
    unread: 0,
    messages: [
      { id: 'm37', sender: 'Dr. Chris Nakamura', avatar_color: COLORS[7], content: 'We have a discrepancy between peak callers. MACS2 found 12,340 peaks while HMMRATAC found 18,920 peaks for the same ATAC-seq dataset.', timestamp: '10:00 AM', type: 'data-point', sentiment: 'negative', reactions: [{ emoji: '❓', count: 3 }] },
      { id: 'm38', sender: 'Agent Iota', avatar_color: COLORS[4], content: 'Overlap analysis shows only **7,845 peaks (43%)** are shared between the two methods. The unique peaks from HMMRATAC are enriched in distal regulatory elements.', timestamp: '10:15 AM', type: 'data-point', sentiment: 'neutral', reactions: [] },
      { id: 'm39', sender: 'Dr. Diana Stein', avatar_color: COLORS[5], content: 'Let\'s use IDR analysis to identify reproducible peaks across replicates. That should give us a more conservative set.', timestamp: '10:30 AM', type: 'follow-up', sentiment: 'positive', reactions: [{ emoji: '👍', count: 2 }] },
      { id: 'm40', sender: 'Agent Iota', avatar_color: COLORS[4], content: 'IDR analysis yielded **9,210 high-confidence peaks** with IDR threshold < 0.05.', timestamp: '10:45 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🎯', count: 4 }] },
      { id: 'm41', sender: 'Dr. Chris Nakamura', avatar_color: COLORS[7], content: 'Using MACS2 with the optimized q-value threshold.', timestamp: '11:00 AM', type: 'decision', sentiment: 'neutral', reactions: [] },
    ]
  },
  {
    id: 'conv-010',
    title: 'Single-Cell RNA-Seq Clustering Review',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Agent Kappa', 3), mkParticipant('Dr. Frank Wu', 6)],
    message_count: 14,
    last_message: 'Final cluster count set to 12 with subclustering of immune populations.',
    unread: 0,
    messages: [
      { id: 'm42', sender: 'Agent Kappa', avatar_color: COLORS[3], content: 'Seurat analysis of the tumor microenvironment scRNA-seq data:\n- **Total cells**: 45,678\n- **Detected genes per cell**: 2,847 median\n- **Mitochondrial %**: 4.2% median\n- **Initial clusters**: 18\n- **Optimal clusters**: 12', timestamp: '01:00 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📊', count: 3 }] },
      { id: 'm43', sender: 'Dr. Frank Wu', avatar_color: COLORS[6], content: 'The immune cell population looks heterogeneous. Can we subcluster the T-cell compartment?', timestamp: '01:15 PM', type: 'question', sentiment: 'neutral', reactions: [] },
      { id: 'm44', sender: 'Agent Kappa', avatar_color: COLORS[3], content: 'Subclustering identified 5 T-cell subsets:\n- CD8+ effector (32%)\n- CD8+ exhausted (18%)\n- CD4+ helper (25%)\n- Treg (15%)\n- NKT (10%)', timestamp: '01:30 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🧬', count: 4 }] },
      { id: 'm45', sender: 'Dr. Frank Wu', avatar_color: COLORS[6], content: 'Final cluster count set to 12 with subclustering of immune populations.', timestamp: '01:45 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '✅', count: 2 }] },
    ]
  },
  {
    id: 'conv-011',
    title: 'Phylogenetic Tree Construction',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Dr. Grace Li', 1), mkParticipant('Agent Lambda', 9)],
    message_count: 11,
    last_message: 'Maximum likelihood tree with bootstrap support looks robust.',
    unread: 0,
    messages: [
      { id: 'm46', sender: 'Agent Lambda', avatar_color: COLORS[9], content: 'Constructed phylogenetic tree using 16S rRNA sequences from 340 environmental isolates.\n\n**Tree statistics:**\n- Alignment length: 1,432 bp\n- Model: GTR+G+I\n- Bootstrap replicates: 1,000\n- Tree likelihood: -12,847.3', timestamp: '04:00 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '🌳', count: 3 }] },
      { id: 'm47', sender: 'Dr. Grace Li', avatar_color: COLORS[1], content: 'The branching pattern confirms our hypothesis about the novel clade. Bootstrap support values look strong (>95% for key nodes).', timestamp: '04:15 PM', type: 'answer', sentiment: 'positive', reactions: [{ emoji: '🎉', count: 2 }] },
      { id: 'm48', sender: 'Dr. Grace Li', avatar_color: COLORS[1], content: 'Maximum likelihood tree with bootstrap support looks robust.', timestamp: '04:20 PM', type: 'decision', sentiment: 'positive', reactions: [] },
    ]
  },
  {
    id: 'conv-012',
    title: 'AlphaFold Prediction Validation',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Dr. Hassan Al-Rashid', 2), mkParticipant('Agent Mu', 7), mkParticipant('Dr. Sophie Bernard', 8)],
    message_count: 17,
    last_message: 'Submitting manuscript figure with pLDDT overlay.',
    unread: 0,
    messages: [
      { id: 'm49', sender: 'Dr. Hassan Al-Rashid', avatar_color: COLORS[2], content: 'AlphaFold2 predictions for our three target proteins are ready. How do the confidence scores look?', timestamp: '03:00 PM', type: 'question', sentiment: 'neutral', reactions: [] },
      { id: 'm50', sender: 'Agent Mu', avatar_color: COLORS[7], content: 'Predicted confidence scores:\n- **Target A**: pLDDT 94.2 (very high)\n- **Target B**: pLDDT 87.6 (high)\n- **Target C**: pLDDT 62.3 (low — flexible linker region)', timestamp: '03:10 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📊', count: 2 }] },
      { id: 'm51', sender: 'Dr. Sophie Bernard', avatar_color: COLORS[8], content: 'Target C\'s low confidence in the linker is expected given its intrinsic disorder. We should note this in the manuscript.', timestamp: '03:20 PM', type: 'follow-up', sentiment: 'neutral', reactions: [{ emoji: '📝', count: 1 }] },
      { id: 'm52', sender: 'Dr. Hassan Al-Rashid', avatar_color: COLORS[2], content: 'Submitting manuscript figure with pLDDT overlay.', timestamp: '03:30 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '📄', count: 3 }] },
    ]
  },
  {
    id: 'conv-013',
    title: 'PCR Optimization Protocol',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Agent Nu', 5), mkParticipant('Dr. Tom Anderson', 6)],
    message_count: 9,
    last_message: 'Optimized conditions produce clean 1.2kb amplicon.',
    unread: 0,
    messages: [
      { id: 'm53', sender: 'Agent Nu', avatar_color: COLORS[5], content: 'PCR optimization results for the GC-rich promoter region:\n\n```\nCondition    | Yield | Specificity\nStandard     | Low  | Multiple bands\nDMSO 5%      | Med  | Smearing\n7-deaza-dGTP | High | Clean\nBetaine 1M   | High | Clean\n```', timestamp: '11:00 AM', type: 'data-point', sentiment: 'neutral', reactions: [{ emoji: '🧪', count: 2 }] },
      { id: 'm54', sender: 'Dr. Tom Anderson', avatar_color: COLORS[6], content: 'Both 7-deaza-dGTP and betaine work well. Which do you recommend for scale-up?', timestamp: '11:15 AM', type: 'question', sentiment: 'neutral', reactions: [] },
      { id: 'm55', sender: 'Agent Nu', avatar_color: COLORS[5], content: 'Optimized conditions produce clean 1.2kb amplicon.', timestamp: '11:30 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '✅', count: 1 }] },
    ]
  },
  {
    id: 'conv-014',
    title: 'Pathway Enrichment Analysis Discussion',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Dr. Wendy Zhao', 0), mkParticipant('Agent Xi', 4)],
    message_count: 13,
    last_message: 'Top 5 pathways selected for manuscript Figure 3.',
    unread: 0,
    messages: [
      { id: 'm56', sender: 'Agent Xi', avatar_color: COLORS[4], content: 'GSEA results for the differential expression analysis:\n\n- **Hallmark pathways**: 23 significant (FDR < 0.05)\n- **KEGG pathways**: 15 significant\n- **Reactome**: 31 significant\n\nTop enriched: DNA repair, cell cycle, oxidative phosphorylation', timestamp: '02:00 PM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '📈', count: 3 }] },
      { id: 'm57', sender: 'Dr. Wendy Zhao', avatar_color: COLORS[0], content: 'The DNA repair enrichment is consistent with our phenotype. Let\'s create pathway visualizations for the top 5.', timestamp: '02:15 PM', type: 'follow-up', sentiment: 'positive', reactions: [] },
      { id: 'm58', sender: 'Dr. Wendy Zhao', avatar_color: COLORS[0], content: 'Top 5 pathways selected for manuscript Figure 3.', timestamp: '02:30 PM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '📊', count: 2 }] },
    ]
  },
  {
    id: 'conv-015',
    title: 'Structural Biology Data Integration',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    date_group: 'Earlier',
    participants: [mkParticipant('Dr. Ivan Petrov', 3), mkParticipant('Agent Omicron', 9), mkParticipant('Dr. Rachel Green', 7)],
    message_count: 21,
    last_message: 'Integrated model deposited to ModelArchive with accession MA-2024-0042.',
    unread: 0,
    messages: [
      { id: 'm59', sender: 'Dr. Ivan Petrov', avatar_color: COLORS[3], content: 'We have X-ray crystallography data at 2.1 Å and Cryo-EM data at 3.5 Å for the same protein complex. Can we integrate these?', timestamp: '09:00 AM', type: 'question', sentiment: 'positive', reactions: [{ emoji: '🔬', count: 2 }] },
      { id: 'm60', sender: 'Agent Omicron', avatar_color: COLORS[9], content: 'Yes! I can use a hybrid modeling approach:\n1. Use high-resolution crystal structure for the core domain\n2. Fit Cryo-EM density for flexible regions\n3. Real-space refine the combined model\n\nCross-correlation map-model CC: **0.78**', timestamp: '09:20 AM', type: 'answer', sentiment: 'positive', reactions: [{ emoji: '🤩', count: 5 }] },
      { id: 'm61', sender: 'Dr. Rachel Green', avatar_color: COLORS[7], content: 'This integrated approach gives us the best of both worlds. Let\'s validate with MolProbity.', timestamp: '09:40 AM', type: 'follow-up', sentiment: 'positive', reactions: [] },
      { id: 'm62', sender: 'Agent Omicron', avatar_color: COLORS[9], content: 'MolProbity scores:\n- Clashscore: **4.1**\n- Ramachandran favored: **97.8%**\n- Rotamer outliers: **0.3%**\n\nAll within top percentile for resolution range.', timestamp: '10:00 AM', type: 'data-point', sentiment: 'positive', reactions: [{ emoji: '✨', count: 4 }] },
      { id: 'm63', sender: 'Dr. Ivan Petrov', avatar_color: COLORS[3], content: 'Integrated model deposited to ModelArchive with accession MA-2024-0042.', timestamp: '10:30 AM', type: 'decision', sentiment: 'positive', reactions: [{ emoji: '🎉', count: 6 }, { emoji: '🥳', count: 3 }] },
    ]
  },
]

export async function GET() {
  return NextResponse.json({ conversations })
}
