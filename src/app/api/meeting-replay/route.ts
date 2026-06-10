import { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  initials: string
  role: string
  expertise: string
  color: string
}

interface Message {
  id: string
  agentId: string
  agentName: string
  agentInitials: string
  agentColor: string
  content: string
  round: number
  timestamp: string
  isDecision?: boolean
}

interface Meeting {
  id: string
  type: 'team' | 'individual'
  title: string
  agenda: string
  date: string
  duration: string
  participants: Participant[]
  messages: Message[]
  pairedWith?: string
}

// ─── Participants ────────────────────────────────────────────

const AGENTS: Participant[] = [
  { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', role: 'Principal Investigator', expertise: 'Structural Biology, Protein Engineering', color: '#10b981' },
  { id: 'a2', name: 'Dr. Wei Zhang', initials: 'WZ', role: 'Computational Biologist', expertise: 'AlphaFold, Molecular Dynamics', color: '#06b6d4' },
  { id: 'a3', name: 'Dr. Lisa Wang', initials: 'LW', role: 'Medicinal Chemist', expertise: 'Virtual Screening, ADMET', color: '#8b5cf6' },
  { id: 'a4', name: 'Dr. Emma Davis', initials: 'ED', role: 'Genomics Lead', expertise: 'RNA-seq, Single-cell Analysis', color: '#f59e0b' },
  { id: 'a5', name: 'Dr. Michael Ross', initials: 'MR', role: 'Gene Editing Specialist', expertise: 'CRISPR-Cas9, Guide RNA Design', color: '#ef4444' },
  { id: 'a6', name: 'Dr. James Park', initials: 'JP', role: 'Research Associate', expertise: 'Protein Purification, Biophysics', color: '#ec4899' },
  { id: 'a7', name: 'Dr. Priya Patel', initials: 'PP', role: 'ML Engineer', expertise: 'Deep Learning, Model Optimization', color: '#14b8a6' },
  { id: 'a8', name: 'Dr. Alex Turner', initials: 'AT', role: 'Bioinformatician', expertise: 'Pipeline Development, Data Integration', color: '#a855f7' },
]

// ─── Meetings ────────────────────────────────────────────────

const meetings: Meeting[] = [
  // ── Meeting 1: Team meeting (Run A) ──
  {
    id: 'm1',
    type: 'team',
    title: 'Nanobody Design Sprint — Run A',
    agenda: 'Review AlphaFold predictions for SARS-CoV-2 variant binding, optimize lead candidates',
    date: '2025-01-20',
    duration: '45 min',
    participants: [AGENTS[0], AGENTS[1], AGENTS[5], AGENTS[6]],
    pairedWith: 'm2',
    messages: [
      { id: 'm1-1', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 1, timestamp: '00:00', content: '## Opening Remarks\n\nWelcome everyone. Today we need to evaluate the latest AlphaFold-Multimer predictions for our nanobody candidates targeting the XBB.1.5 variant. We have **12 candidates** from the previous screening round.' },
      { id: 'm1-2', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 1, timestamp: '00:45', content: 'I\'ve completed the structure predictions using AlphaFold-Multimer v2.3. The **top 3 candidates** show confident predictions (pLDDT > 90) for the RBD interface region:\n\n1. **NB-C12**: pLDDT 94.2, predicted ΔG = -42.3 kcal/mol\n2. **NB-A07**: pLDDT 91.8, predicted ΔG = -38.7 kcal/mol\n3. **NB-D05**: pLDDT 90.5, predicted ΔG = -36.1 kcal/mol\n\nI\'m particularly excited about NB-C12 — the predicted interface matches our epitope mapping data perfectly.' },
      { id: 'm1-3', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 2, timestamp: '02:30', content: 'From the biophysics side, I\'ve expressed and purified NB-C12 and NB-A07. **Surface plasmon resonance** results confirm Wei\'s predictions:\n\n- NB-C12: KD = 0.8 nM (excellent)\n- NB-A07: KD = 2.1 nM (very good)\n- NB-D05: KD = 5.4 nM (moderate)\n\nNB-C12 shows **fast on-rate** (kon = 3.2 × 10⁶ M⁻¹s⁻¹) which is promising for therapeutic applications.' },
      { id: 'm1-4', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 2, timestamp: '04:00', content: 'One concern: NB-C12 shows moderate aggregation tendency at concentrations above 50 μM. We may need to engineer surface residues for stability.' },
      { id: 'm1-5', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '05:30', content: 'I\'ve been training a **regression model** to predict aggregation propensity from sequence. Running the model on NB-C12:\n\n```\nAggregation Score: 0.42 (moderate risk)\nKey residues: Y34, F52, W78\n```\n\nI recommend mutating W78 to a polar residue. The model predicts this would reduce aggregation score to 0.18 while maintaining binding affinity within 10% of wild-type.' },
      { id: 'm1-6', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 4, timestamp: '08:00', content: '## Decision Point\n\nExcellent progress. Let\'s summarize the action items:\n\n1. **James**: Proceed with NB-C12 stability engineering (W78 mutation)\n2. **Wei**: Run molecular dynamics simulation on the W78 mutant\n3. **Priya**: Generate 5 additional mutation candidates using the ML pipeline\n4. **Team**: Prepare manuscript figures for the binding affinity data\n\nNext meeting: Thursday to review the W78 mutant results.' },
      { id: 'm1-7', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 5, timestamp: '10:00', content: 'I\'ll set up the MD simulation tonight. Using the AMBER force field with explicit TIP3P water — should have 100ns trajectory by Wednesday. I\'ll also include the original NB-C12 as a control.' },
      { id: 'm1-8', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 5, timestamp: '11:30', content: 'Perfect. I\'ll run the mutation generator pipeline and have candidates ready by tomorrow morning. I\'m targeting mutations at positions 34, 52, and 78 with a focus on maintaining the CDR3 loop conformation.' },
    ],
  },
  // ── Meeting 2: Same agenda, different run (Run B) ──
  {
    id: 'm2',
    type: 'team',
    title: 'Nanobody Design Sprint — Run B',
    agenda: 'Review AlphaFold predictions for SARS-CoV-2 variant binding, optimize lead candidates',
    date: '2025-01-22',
    duration: '52 min',
    participants: [AGENTS[0], AGENTS[1], AGENTS[5], AGENTS[6]],
    pairedWith: 'm1',
    messages: [
      { id: 'm2-1', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 1, timestamp: '00:00', content: '## Follow-up Meeting\n\nWelcome back. We\'re continuing the nanobody optimization work. Based on last session, we now have the W78 mutant data from James. Let\'s start with those results before discussing new candidates.' },
      { id: 'm2-2', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 1, timestamp: '01:00', content: 'Great news on the **W78S mutant**:\n\n- KD = 1.1 nM (slight decrease but still excellent)\n- **Aggregation threshold improved** from 50 μM to >200 μM\n- Thermal stability: Tm = 72°C (vs 68°C for wild-type)\n\nThe W78S mutation is a clear win for developability. I\'ve also tested W78T and W78N — W78S gives the best stability-affinity tradeoff.' },
      { id: 'm2-3', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 2, timestamp: '03:00', content: 'The MD simulations confirm James\'s experimental results. The W78S mutant shows:\n\n- **Reduced hydrophobic surface exposure** at the CDR3-distal face\n- RMSD stabilized at 1.8 Å (vs 2.4 Å for WT)\n- The CDR3 loop maintains its binding-competent conformation\n\nI also ran **Rosetta ΔΔG** calculations — predicted ΔΔG = +0.8 kcal/mol, consistent with the small affinity loss James observed.' },
      { id: 'm2-4', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '05:30', content: 'Here are the **5 new mutation candidates** from the ML pipeline:\n\n1. **Y34S / F52A**: Predicted to improve solubility by 40%\n2. **N56D**: Surface charge optimization\n3. **S88R**: pH stability enhancement\n4. **Combined W78S + N56D**: Double mutant\n5. **T102E**: C-terminal charge addition\n\nI\'m most confident about candidate #4 — the ML model gives it a 0.92 probability of improved developability.' },
      { id: 'm2-5', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 3, timestamp: '07:00', content: 'Additionally, I\'ve expanded the training set with 200 new nanobody sequences from the SAbDab database. The model\'s **R² improved from 0.78 to 0.85** on the validation set.' },
      { id: 'm2-6', agentId: 'a1', agentName: 'Dr. Sarah Chen', agentInitials: 'SC', agentColor: '#10b981', round: 4, timestamp: '09:00', content: '## Decision: Advance to Preclinical\n\nOutstanding work team. Based on the convergence of computational and experimental evidence:\n\n- **NB-C12-W78S** is our lead candidate for preclinical development\n- James will express the double mutant (W78S + N56D)\n- Wei: please prepare the cryo-EM grid preparation plan\n- Priya: begin training a broader model for pan-sarbecovirus nanobody design\n\n**Milestone**: Submit IND-enabling study proposal by February 15.', isDecision: true },
      { id: 'm2-7', agentId: 'a2', agentName: 'Dr. Wei Zhang', agentInitials: 'WZ', agentColor: '#06b6d4', round: 5, timestamp: '11:00', content: 'I\'ll coordinate with the cryo-EM core facility. We should aim for 3.5 Å resolution for the complex structure. I\'ll also start building the pan-sarbecovirus multiple sequence alignment for Priya\'s expanded model training.' },
      { id: 'm2-8', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 5, timestamp: '12:30', content: 'The double mutant expression is already in progress — should have purified protein by Friday. I\'ll run the full biophysical characterization panel (SPR, DSC, SEC-MALS) over the weekend.' },
      { id: 'm2-9', agentId: 'a7', agentName: 'Dr. Priya Patel', agentInitials: 'PP', agentColor: '#14b8a6', round: 5, timestamp: '14:00', content: 'I\'ll start the pan-sarbecovirus model this week. Initial plan: fine-tune ESM-2 on our nanobody dataset, then use it for zero-shot prediction across ~500 viral spike sequences. Target: complete by February 1st.' },
    ],
  },
  // ── Meeting 3: Individual ──
  {
    id: 'm3',
    type: 'individual',
    title: 'CRISPR Guide RNA Optimization — 1:1',
    agenda: 'Review off-target prediction model performance, plan next validation experiments',
    date: '2025-01-18',
    duration: '30 min',
    participants: [AGENTS[4]],
    messages: [
      { id: 'm3-1', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 1, timestamp: '00:00', content: '## Self-Review: Off-Target Prediction Model\n\nCurrent model (CRISPR-OT v2.1) performance on the latest test set:\n\n| Metric | Score |\n|--------|-------|\n| AUC-ROC | 0.94 |\n| Precision | 0.87 |\n| Recall | 0.82 |\n| F1 | 0.84 |\n\nThe precision improved from 0.81 after adding the epigenomic features. However, recall is still below target for clinical applications (goal: 0.90).' },
      { id: 'm3-2', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 2, timestamp: '04:00', content: 'Key observations:\n\n1. **Chromatin accessibility** features improved prediction of off-targets in heterochromatin regions by 15%\n2. The model still struggles with **single-mismatch off-targets** near the PAM-distal end\n3. Adding **DNA methylation** data as a feature improved predictions in CpG-rich promoters\n\nNext steps: Integrate a transformer-based attention layer to better capture positional dependencies in the guide RNA sequence.' },
      { id: 'm3-3', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 3, timestamp: '08:00', content: '## Experimental Validation Plan\n\nFor the next round of GUIDE-seq validation:\n\n- **Cell line**: HEK293T (standard) + iPSC-derived neurons (clinically relevant)\n- **Guide RNAs**: 20 top-scoring + 10 edge cases\n- **Readout**: GUIDE-seq + CIRCLE-seq for orthogonal validation\n- **Timeline**: 3 weeks for HEK293T, 5 weeks for iPSC-neurons\n\nBudget impact: ~$12,000 for sequencing. Need approval from the committee.' },
      { id: 'm3-4', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 3, timestamp: '12:00', content: '**Action item**: Draft the committee proposal by Friday. Include the improved AUC-ROC data and projected clinical relevance. Emphasize the iPSC-neuron validation as a key differentiator from existing tools.' },
    ],
  },
  // ── Meeting 4: Team ──
  {
    id: 'm4',
    type: 'team',
    title: 'Drug Discovery Pipeline Review',
    agenda: 'Virtual screening results for tropical disease targets, ADMET predictions',
    date: '2025-01-16',
    duration: '55 min',
    participants: [AGENTS[2], AGENTS[4], AGENTS[7]],
    messages: [
      { id: 'm4-1', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 1, timestamp: '00:00', content: '## Virtual Screening Update\n\nCompleted screening of **2.3 million compounds** against the *Leishmania donovani* topoisomerase II target:\n\n- **Top 50 hits**: IC50 < 1 μM (predicted)\n- **Lead-like properties**: 12 compounds pass Lipinski\'s Rule of 5\n- **Novel chemotypes**: 5 compounds represent previously unexplored scaffolds\n\nThe docking was performed using Glide XP with the recent cryo-EM structure (PDB: 8XYZ, 2.8 Å resolution).' },
      { id: 'm4-2', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 2, timestamp: '03:00', content: 'ADMET predictions for the top 12:\n\n```\nCompound    LogP   Solubility  hERG  Hepatotox  CYP3A4\nLDS-001    2.8    Good        Low   Low        No inhib.\nLDS-007    3.1    Moderate    Low   Low        No inhib.\nLDS-012    1.9    Excellent   Low   Moderate   Mild inhib.\nLDS-018    2.4    Good        Low   Low        No inhib.\n```\n\nLDS-001 and LDS-018 are the most promising candidates for progression.' },
      { id: 'm4-3', agentId: 'a8', agentName: 'Dr. Alex Turner', agentInitials: 'AT', agentColor: '#a855f7', round: 3, timestamp: '06:00', content: 'I\'ve set up the data pipeline for the hit validation workflow:\n\n1. **Molecular dynamics**: 50ns simulations for top 12 compounds\n2. **MM/GBSA binding free energy** calculations\n3. **Pharmacophore alignment** to check scaffold novelty\n\nPipeline is running on the HPC cluster. Expected completion: 48 hours. I\'ll integrate the results into our dashboard for the next review.' },
      { id: 'm4-4', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 4, timestamp: '09:00', content: 'From the genomics perspective, I\'ve completed the **RNA-seq analysis** of *L. donovani* treated with our reference compound (pentamidine). Key findings:\n\n- 342 differentially expressed genes (FDR < 0.05)\n- Topoisomerase II expression confirmed as essential\n- Identified 5 potential **synthetic lethal** targets that could be combined with topoisomerase inhibition\n\nThis opens up a combination therapy angle we should explore.' },
      { id: 'm4-5', agentId: 'a3', agentName: 'Dr. Lisa Wang', agentInitials: 'LW', agentColor: '#8b5cf6', round: 5, timestamp: '12:00', content: '## Action Plan\n\n1. Alex: Complete MD simulations, prioritize LDS-001 and LDS-018\n2. Emma: Validate synthetic lethal targets with CRISPR screen\n3. Lisa: Order LDS-001 and LDS-018 from commercial vendors for in vitro testing\n4. **Team**: Schedule follow-up meeting after MD results (estimated: Friday)\n\nBudget request: $8,500 for compound procurement and initial in vitro assays.', isDecision: true },
    ],
  },
  // ── Meeting 5: Individual ──
  {
    id: 'm5',
    type: 'individual',
    title: 'Gene Expression Atlas — Data Integration',
    agenda: 'Integrate new single-cell datasets, update atlas visualization',
    date: '2025-01-14',
    duration: '25 min',
    participants: [AGENTS[3]],
    messages: [
      { id: 'm5-1', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 1, timestamp: '00:00', content: '## Atlas Update Status\n\nThe gene expression atlas now includes:\n\n- **1.2 million cells** across 23 tissue types\n- **8 developmental stages** (E6.5 through adult)\n- New datasets added: brain organoid scRNA-seq (Zhang et al., 2024), heart development (our lab)\n\nCurrent challenges:\n1. Batch effects between the new organoid data and existing primary tissue data\n2. Need to retrain the cell type annotation model with the expanded dataset', },
      { id: 'm5-2', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 2, timestamp: '05:00', content: 'For batch correction, I\'m testing **Harmony** vs **scVI**:\n\n- Harmony: Fast (2 min), but over-corrects rare cell types\n- scVI: Slower (15 min), better preserves biological variation\n\nI\'m leaning toward scVI for the final atlas. The extra computation time is worth the improved cell type resolution.\n\n```\n# scVI configuration\nn_layers: 2\nn_latent: 30\ngene_likelihood: \"zinb\"\nbatch_key: \"dataset_id\"\n```' },
      { id: 'm5-3', agentId: 'a4', agentName: 'Dr. Emma Davis', agentInitials: 'ED', agentColor: '#f59e0b', round: 3, timestamp: '10:00', content: '## Visualization & Publication\n\nThe interactive atlas visualization is updated on our Shiny app. Key new features:\n\n- **Trajectory inference** for developmental lineages\n- **Differential expression** comparison between any two cell populations\n- **Gene program** scoring using decoupleR\n\nTarget for manuscript submission: **Nature Communications**, aiming for the February deadline.\n\nRemaining tasks: final figures, methods description, supplementary data package.' },
    ],
  },
  // ── Meeting 6: Team ──
  {
    id: 'm6',
    type: 'team',
    title: 'Synthetic Biology Framework — Circuit Design',
    agenda: 'Review genetic circuit designs for bioproduction pathway, plan validation experiments',
    date: '2025-01-12',
    duration: '40 min',
    participants: [AGENTS[4], AGENTS[5], AGENTS[7]],
    messages: [
      { id: 'm6-1', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 1, timestamp: '00:00', content: '## Circuit Design Review\n\nOur team has designed 3 genetic circuits for the **bioproduction of artemisinin precursor** in *S. cerevisiae*:\n\n1. **Circuit A**: Constitutive expression (control)\n2. **Circuit B**: Optogenetic control with blue-light switch\n3. **Circuit C**: Metabolite-sensing feedback loop\n\nEach circuit integrates 5 heterologous genes from the artemisinin biosynthetic pathway.' },
      { id: 'm6-2', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 2, timestamp: '04:00', content: 'Computational modeling predicts **Circuit C** will achieve the highest titer:\n\n- Circuit A: 2.1 g/L (baseline)\n- Circuit B: 3.8 g/L (with optimized light cycles)\n- Circuit C: 5.2 g/L (with feedback tuning)\n\nThe feedback loop uses a FPP-responsive transcription factor to dynamically regulate flux through the MEP pathway.' },
      { id: 'm6-3', agentId: 'a8', agentName: 'Dr. Alex Turner', agentInitials: 'AT', agentColor: '#a855f7', round: 3, timestamp: '07:00', content: 'I\'ve been developing the **DNA assembly pipeline** using Golden Gate modular cloning. Progress:\n\n- All 5 pathway genes cloned into Level 0 parts\n- Promoter library: 8 variants per gene (strong/medium/weak, constitutive/inducible)\n- Circuit C assembly: 60% complete (need to add the FPP sensor module)\n\nThe automation script for colony PCR screening is ready — should reduce screening time by 70%.' },
      { id: 'm6-4', agentId: 'a6', agentName: 'Dr. James Park', agentInitials: 'JP', agentColor: '#ec4899', round: 4, timestamp: '10:00', content: 'For the analytical workflow, I\'ve validated the **LC-MS method** for artemisinic acid quantification:\n\n- LOD: 0.05 mg/L\n- Linear range: 0.1 — 100 mg/L\n- Recovery: 92-98%\n\nI can handle up to 96 samples per batch. We should plan a **design of experiments** (DoE) matrix to optimize fermentation conditions alongside the circuit testing.' },
      { id: 'm6-5', agentId: 'a5', agentName: 'Dr. Michael Ross', agentInitials: 'MR', agentColor: '#ef4444', round: 5, timestamp: '13:00', content: '## Timeline & Next Steps\n\n- **Week 1-2**: Complete Circuit C assembly (Alex)\n- **Week 3**: Transform into yeast, begin shake-flask screening\n- **Week 4-5**: Small-scale fermentation with DoE (James)\n- **Week 6**: Data analysis, circuit optimization iteration\n\nLet\'s aim to have preliminary titers by mid-February. This aligns with our grant milestone.', isDecision: true },
    ],
  },
]

// ─── GET Handler ──────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({ meetings })
}
