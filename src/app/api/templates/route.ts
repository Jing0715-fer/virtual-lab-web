import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Types
// ============================================================

interface AgendaSection {
  id: string
  title: string
  description: string
  duration: string
  expanded?: boolean
}

interface ParticipantRole {
  id: string
  name: string
  responsibility: string
  prompt: string
  color: string
}

export interface MeetingTemplateData {
  id: string
  title: string
  description: string
  longDescription: string
  icon: string
  iconGradient: string
  category: 'Research' | 'Planning' | 'Review' | 'Brainstorm' | 'Analysis'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  expectedDuration: string
  participantsRequired: number
  participantRoles: ParticipantRole[]
  agendaSections: AgendaSection[]
  expectedOutcomes: string[]
  tips: string[]
  presetQuestions: string[]
  presetRules: string[]
  presetRounds: number
  presetTemperature: number
  suggestedAgents: string[]
  useCount: number
  isCustom: boolean
  createdAt: string
  updatedAt: string
}

// ============================================================
// Built-in Templates (12 pre-defined)
// ============================================================

const BUILT_IN_TEMPLATES: MeetingTemplateData[] = [
  {
    id: 'literature-review',
    title: 'Literature Review',
    description: 'PI + N scientists discuss recent papers and identify gaps',
    longDescription: 'A structured session for critically reviewing recent publications in your research field. Participants analyze methodology, evaluate findings, and identify gaps that inform future research directions.',
    icon: 'BookOpen',
    iconGradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    category: 'Research',
    difficulty: 'beginner',
    expectedDuration: '45-60 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Guide discussion, identify key themes', prompt: 'You are a senior PI guiding a literature review session.', color: '#10b981' },
      { id: 'scientist-1', name: 'Domain Scientist', responsibility: 'Analyze methodology and findings', prompt: 'You are a domain expert analyzing recent publications.', color: '#06b6d4' },
      { id: 'scientist-2', name: 'Junior Scientist', responsibility: 'Note gaps and suggest follow-ups', prompt: 'You are a junior scientist taking detailed notes and identifying gaps.', color: '#8b5cf6' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Paper Selection', description: 'Review the selected papers and their relevance', duration: '10 min' },
      { id: 'a2', title: 'Methodology Analysis', description: 'Critically evaluate methods used in each paper', duration: '15 min' },
      { id: 'a3', title: 'Key Findings Discussion', description: 'Synthesize main findings and compare results', duration: '15 min' },
      { id: 'a4', title: 'Gap Identification', description: 'Identify research gaps and future directions', duration: '10 min' },
    ],
    expectedOutcomes: ['Summary of key findings', 'Identification of methodology strengths/weaknesses', 'List of research gaps', 'Prioritized future directions'],
    tips: ['Prepare papers in advance', 'Focus on 3-5 recent high-impact papers', 'Assign one paper per participant for deep review'],
    presetQuestions: ['What are the key findings from recent high-impact papers?', 'Where do authors disagree, and what evidence supports each side?', 'What methodological limitations are common across studies?'],
    presetRules: ['Cite specific findings with reasoning', 'Distinguish between strong and weak evidence', 'Identify at least 3 specific gaps in the literature'],
    presetRounds: 2,
    presetTemperature: 0.3,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Scientific Critic'],
    useCount: 342,
    isCustom: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'hypothesis-generation',
    title: 'Hypothesis Generation',
    description: 'PI + Critic + Domain Expert brainstorm hypotheses',
    longDescription: 'An interactive brainstorming session where a diverse team generates and refines novel research hypotheses. The critic challenges assumptions while the domain expert grounds ideas in current knowledge.',
    icon: 'Lightbulb',
    iconGradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    category: 'Brainstorm',
    difficulty: 'intermediate',
    expectedDuration: '30-45 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Lead ideation, propose directions', prompt: 'You are a PI proposing novel research hypotheses.', color: '#10b981' },
      { id: 'critic', name: 'Scientific Critic', responsibility: 'Challenge assumptions, find weaknesses', prompt: 'You are a critic who challenges hypotheses for scientific rigor.', color: '#ef4444' },
      { id: 'expert', name: 'Domain Expert', responsibility: 'Ground ideas in current evidence', prompt: 'You are a domain expert who evaluates feasibility of hypotheses.', color: '#8b5cf6' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Problem Framing', description: 'Define the problem space and constraints', duration: '5 min' },
      { id: 'a2', title: 'Ideation Round', description: 'Generate as many hypotheses as possible', duration: '15 min' },
      { id: 'a3', title: 'Critical Review', description: 'Challenge and refine each hypothesis', duration: '15 min' },
      { id: 'a4', title: 'Prioritization', description: 'Rank hypotheses by impact and feasibility', duration: '10 min' },
    ],
    expectedOutcomes: ['5-10 novel hypotheses', 'Critiqued and refined hypothesis set', 'Prioritized ranking', 'Feasibility assessment'],
    tips: ['Start with quantity over quality', 'Build on each others ideas', 'Use evidence to support claims'],
    presetQuestions: ['What are the most promising unexplored directions in our field?', 'Which emerging techniques could we apply to our current challenges?', 'What novel hypotheses can we generate from recent findings?'],
    presetRules: ['Encourage wild ideas before evaluating feasibility', 'Build on each others suggestions', 'Quantify potential impact for each idea'],
    presetRounds: 3,
    presetTemperature: 0.8,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Scientific Critic'],
    useCount: 256,
    isCustom: false,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'experimental-design',
    title: 'Experimental Design',
    description: 'PI + Methodologist + Statistician plan experiments',
    longDescription: 'A rigorous session for designing well-controlled experiments. The team defines variables, determines sample sizes, plans statistical analysis, and establishes success criteria.',
    icon: 'FlaskConical',
    iconGradient: 'linear-gradient(135deg, #10b981, #059669)',
    category: 'Planning',
    difficulty: 'advanced',
    expectedDuration: '60-90 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Define research question and goals', prompt: 'You are a PI defining the experimental goals and hypothesis.', color: '#10b981' },
      { id: 'methodologist', name: 'Methodologist', responsibility: 'Design experimental procedures', prompt: 'You are a methodologist designing rigorous experimental procedures.', color: '#06b6d4' },
      { id: 'statistician', name: 'Statistician', responsibility: 'Determine sample sizes and analysis', prompt: 'You are a statistician ensuring proper experimental design and analysis.', color: '#8b5cf6' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Hypothesis Definition', description: 'Clearly state the hypothesis to test', duration: '10 min' },
      { id: 'a2', title: 'Variable Identification', description: 'Define independent, dependent, and control variables', duration: '15 min' },
      { id: 'a3', title: 'Procedure Design', description: 'Design step-by-step experimental procedure', duration: '20 min' },
      { id: 'a4', title: 'Statistical Plan', description: 'Define analysis methods and power calculations', duration: '15 min' },
      { id: 'a5', title: 'Contingency Planning', description: 'Plan for potential issues and alternative approaches', duration: '10 min' },
    ],
    expectedOutcomes: ['Complete experimental protocol', 'Statistical analysis plan', 'Sample size calculations', 'Risk mitigation plan'],
    tips: ['Define success criteria upfront', 'Include appropriate controls', 'Consider reproducibility from the start'],
    presetQuestions: ['What are the key variables and controls needed?', 'What sample size provides adequate statistical power?', 'How will we measure and validate the primary outcome?'],
    presetRules: ['Include appropriate positive and negative controls', 'Define clear success/failure criteria before starting', 'Consider potential confounding variables'],
    presetRounds: 3,
    presetTemperature: 0.4,
    suggestedAgents: ['Principal Investigator', 'Immunologist', 'Computational Biologist'],
    useCount: 198,
    isCustom: false,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'data-analysis-review',
    title: 'Data Analysis Review',
    description: 'PI + Data Analyst + Critic review findings',
    longDescription: 'A data-focused session where the team reviews experimental results, evaluates statistical significance, identifies patterns, and formulates evidence-based conclusions.',
    icon: 'BarChart3',
    iconGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    category: 'Analysis',
    difficulty: 'intermediate',
    expectedDuration: '45-60 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Interpret results in context', prompt: 'You are a PI interpreting results in the broader research context.', color: '#10b981' },
      { id: 'analyst', name: 'Data Analyst', responsibility: 'Present findings and analysis', prompt: 'You are a data analyst presenting statistical findings and patterns.', color: '#06b6d4' },
      { id: 'critic', name: 'Scientific Critic', responsibility: 'Challenge conclusions and methodology', prompt: 'You are a critic evaluating the rigor of data analysis.', color: '#ef4444' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Data Overview', description: 'Review collected data and quality assessment', duration: '10 min' },
      { id: 'a2', title: 'Statistical Results', description: 'Present key statistical findings', duration: '15 min' },
      { id: 'a3', title: 'Pattern Analysis', description: 'Identify trends, correlations, outliers', duration: '15 min' },
      { id: 'a4', title: 'Conclusions', description: 'Form evidence-based conclusions', duration: '15 min' },
    ],
    expectedOutcomes: ['Validated statistical findings', 'Identified patterns and trends', 'Evidence-based conclusions', 'Limitations acknowledged'],
    tips: ['Use visualizations to communicate findings', 'Distinguish correlation from causation', 'Acknowledge limitations explicitly'],
    presetQuestions: ['Are the results statistically significant and biologically meaningful?', 'What patterns or trends emerge from the data?', 'How do these results compare to our initial hypotheses?'],
    presetRules: ['Support all claims with specific data points', 'Distinguish correlation from causation', 'Acknowledge limitations and alternative interpretations'],
    presetRounds: 2,
    presetTemperature: 0.3,
    suggestedAgents: ['Computational Biologist', 'ML Engineer', 'Scientific Critic'],
    useCount: 287,
    isCustom: false,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'grant-proposal-draft',
    title: 'Grant Proposal Draft',
    description: 'PI + Co-PI + Admin draft grant sections',
    longDescription: 'A collaborative session for drafting a grant proposal. The team works through specific aims, background/significance, and approach sections to create a compelling proposal.',
    icon: 'FileText',
    iconGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    category: 'Planning',
    difficulty: 'advanced',
    expectedDuration: '90-120 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Lead grant narrative and vision', prompt: 'You are the PI leading the grant proposal drafting.', color: '#10b981' },
      { id: 'co-pi', name: 'Co-Investigator', responsibility: 'Contribute technical expertise', prompt: 'You are a co-PI contributing specialized technical knowledge.', color: '#06b6d4' },
      { id: 'admin', name: 'Research Admin', responsibility: 'Ensure compliance and formatting', prompt: 'You are a research administrator ensuring compliance and proper formatting.', color: '#f59e0b' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Specific Aims', description: 'Define 2-3 specific aims with measurable goals', duration: '20 min' },
      { id: 'a2', title: 'Background & Significance', description: 'Establish the scientific context and importance', duration: '25 min' },
      { id: 'a3', title: 'Preliminary Data', description: 'Present supporting preliminary results', duration: '20 min' },
      { id: 'a4', title: 'Research Approach', description: 'Outline methods and timeline', duration: '25 min' },
      { id: 'a5', title: 'Budget & Timeline', description: 'Estimate resources and milestones', duration: '15 min' },
    ],
    expectedOutcomes: ['Drafted specific aims', 'Background narrative', 'Research approach outline', 'Budget estimates'],
    tips: ['Follow the funding agency guidelines closely', 'Make the significance section compelling', 'Include preliminary data when available'],
    presetQuestions: ['What are the 2-3 most compelling specific aims?', 'How does this work advance the field?', 'What preliminary data supports our approach?'],
    presetRules: ['Align with funding agency priorities', 'Be specific about methods and expected outcomes', 'Include measurable milestones'],
    presetRounds: 3,
    presetTemperature: 0.5,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'ML Engineer'],
    useCount: 156,
    isCustom: false,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'weekly-lab-meeting',
    title: 'Weekly Lab Meeting',
    description: 'PI + all members share progress updates',
    longDescription: 'A regular team meeting for sharing progress, discussing challenges, and planning next steps. Each member provides updates on their work and receives feedback.',
    icon: 'Users',
    iconGradient: 'linear-gradient(135deg, #10b981, #34d399)',
    category: 'Review',
    difficulty: 'beginner',
    expectedDuration: '30-60 min',
    participantsRequired: 4,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Facilitate and provide guidance', prompt: 'You are the PI facilitating the weekly lab meeting.', color: '#10b981' },
      { id: 'member-1', name: 'Senior Researcher', responsibility: 'Present progress and findings', prompt: 'You are a senior researcher presenting your progress.', color: '#06b6d4' },
      { id: 'member-2', name: 'Graduate Student', responsibility: 'Update on project status', prompt: 'You are a graduate student providing a project update.', color: '#8b5cf6' },
      { id: 'member-3', name: 'Lab Technician', responsibility: 'Report on experimental progress', prompt: 'You are a lab technician reporting on experimental work.', color: '#f59e0b' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Progress Updates', description: 'Each member shares their weekly progress', duration: '20 min' },
      { id: 'a2', title: 'Challenges & Solutions', description: 'Discuss current obstacles and brainstorm solutions', duration: '15 min' },
      { id: 'a3', title: 'Planning', description: 'Assign tasks and set goals for next week', duration: '10 min' },
    ],
    expectedOutcomes: ['Updated status for all projects', 'Solutions to current challenges', 'Action items for next week', 'Aligned team priorities'],
    tips: ['Keep updates concise (2-3 min each)', 'Focus on blockers and decisions needed', 'End with clear action items'],
    presetQuestions: ['What progress was made this week?', 'What obstacles are blocking progress?', 'What are the priorities for next week?'],
    presetRules: ['Keep updates to 2-3 minutes each', 'Focus on decisions that need to be made', 'End with clear action items'],
    presetRounds: 2,
    presetTemperature: 0.5,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Bioinformatician', 'ML Engineer'],
    useCount: 521,
    isCustom: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'paper-writing-session',
    title: 'Paper Writing Session',
    description: 'PI + Authors draft paper sections',
    longDescription: 'A focused writing session where the authoring team collaboratively drafts sections of a research paper. The team works through structure, content, and revision together.',
    icon: 'PenTool',
    iconGradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    category: 'Research',
    difficulty: 'advanced',
    expectedDuration: '60-90 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Guide paper structure and narrative', prompt: 'You are the PI guiding the paper writing process.', color: '#10b981' },
      { id: 'author-1', name: 'Lead Author', responsibility: 'Draft primary sections', prompt: 'You are the lead author drafting the main sections.', color: '#06b6d4' },
      { id: 'author-2', name: 'Co-Author', responsibility: 'Contribute specific sections', prompt: 'You are a co-author contributing specialized sections.', color: '#8b5cf6' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Paper Structure', description: 'Define sections, figures, and key messages', duration: '15 min' },
      { id: 'a2', title: 'Introduction Draft', description: 'Write the introduction section', duration: '20 min' },
      { id: 'a3', title: 'Results & Methods', description: 'Draft results and methodology', duration: '25 min' },
      { id: 'a4', title: 'Discussion', description: 'Write discussion and conclusions', duration: '20 min' },
    ],
    expectedOutcomes: ['Drafted introduction', 'Results section outline', 'Discussion framework', 'Figure plan'],
    tips: ['Start with bullet points before full sentences', 'Assign clear section ownership', 'Review for logical flow between sections'],
    presetQuestions: ['What is the main message of this paper?', 'Which figures are essential to tell the story?', 'How does this work advance the field?'],
    presetRules: ['Each author drafts their assigned section', 'Maintain consistent terminology throughout', 'Reference all figures and tables in text'],
    presetRounds: 3,
    presetTemperature: 0.4,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Immunologist'],
    useCount: 189,
    isCustom: false,
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'problem-solving',
    title: 'Problem Solving',
    description: 'PI + Specialist + Critic solve specific problem',
    longDescription: 'A targeted problem-solving session where the team systematically analyzes a specific challenge, identifies root causes, and develops actionable solutions.',
    icon: 'Puzzle',
    iconGradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    category: 'Analysis',
    difficulty: 'intermediate',
    expectedDuration: '30-45 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Define the problem and evaluate solutions', prompt: 'You are the PI defining and evaluating the problem.', color: '#10b981' },
      { id: 'specialist', name: 'Specialist', responsibility: 'Provide domain expertise for solutions', prompt: 'You are a specialist providing deep domain expertise.', color: '#06b6d4' },
      { id: 'critic', name: 'Scientific Critic', responsibility: 'Stress-test proposed solutions', prompt: 'You are a critic who challenges proposed solutions.', color: '#ef4444' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Problem Definition', description: 'Clearly define the problem and its context', duration: '5 min' },
      { id: 'a2', title: 'Root Cause Analysis', description: 'Identify potential root causes', duration: '10 min' },
      { id: 'a3', title: 'Solution Generation', description: 'Brainstorm potential solutions', duration: '15 min' },
      { id: 'a4', title: 'Solution Evaluation', description: 'Evaluate and select best solution', duration: '10 min' },
    ],
    expectedOutcomes: ['Clear problem statement', 'Root cause analysis', 'Prioritized solutions', 'Action plan'],
    tips: ['Start with the simplest explanation', 'Test one variable at a time', 'Document the process for future reference'],
    presetQuestions: ['What are the symptoms and when did they first appear?', 'What recent changes could have caused this issue?', 'What are the most likely root causes ranked by probability?'],
    presetRules: ['Start with the simplest explanation', 'Test one variable at a time', 'Document the process for future reference'],
    presetRounds: 2,
    presetTemperature: 0.4,
    suggestedAgents: ['ML Engineer', 'Computational Biologist', 'Scientific Critic'],
    useCount: 274,
    isCustom: false,
    createdAt: '2024-02-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'project-planning',
    title: 'Project Planning',
    description: 'PI + Team Leads create roadmap',
    longDescription: 'A strategic planning session where the leadership team defines project milestones, assigns responsibilities, and creates a realistic timeline.',
    icon: 'Map',
    iconGradient: 'linear-gradient(135deg, #06b6d4, #0e7490)',
    category: 'Planning',
    difficulty: 'intermediate',
    expectedDuration: '45-60 min',
    participantsRequired: 3,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Set strategic vision and priorities', prompt: 'You are the PI setting the strategic direction.', color: '#10b981' },
      { id: 'lead-1', name: 'Technical Lead', responsibility: 'Define technical milestones', prompt: 'You are a technical lead planning implementation steps.', color: '#06b6d4' },
      { id: 'lead-2', name: 'Operations Lead', responsibility: 'Plan resources and logistics', prompt: 'You are an operations lead managing resources and logistics.', color: '#f59e0b' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Vision & Goals', description: 'Define project vision and key objectives', duration: '10 min' },
      { id: 'a2', title: 'Milestone Definition', description: 'Set clear milestones and deliverables', duration: '15 min' },
      { id: 'a3', title: 'Resource Planning', description: 'Allocate resources and personnel', duration: '15 min' },
      { id: 'a4', title: 'Risk Assessment', description: 'Identify risks and mitigation strategies', duration: '10 min' },
    ],
    expectedOutcomes: ['Clear project vision', 'Milestone roadmap', 'Resource allocation plan', 'Risk register'],
    tips: ['Set SMART goals', 'Include buffer time for unexpected delays', 'Define clear dependencies between tasks'],
    presetQuestions: ['What are the top 3 priorities for the upcoming sprint?', 'What dependencies exist between tasks?', 'What risks could delay our timeline and how can we mitigate them?'],
    presetRules: ['Estimate effort for each task realistically', 'Identify blocking dependencies early', 'Define clear deliverables for each milestone'],
    presetRounds: 3,
    presetTemperature: 0.5,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist', 'Bioinformatician'],
    useCount: 198,
    isCustom: false,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Developer + Reviewer review code and methods',
    longDescription: 'A focused code review session where a developer presents their implementation and a reviewer provides feedback on correctness, efficiency, and best practices.',
    icon: 'Code2',
    iconGradient: 'linear-gradient(135deg, #f97316, #ea580c)',
    category: 'Review',
    difficulty: 'beginner',
    expectedDuration: '20-30 min',
    participantsRequired: 2,
    participantRoles: [
      { id: 'developer', name: 'Developer', responsibility: 'Present code and explain decisions', prompt: 'You are a developer presenting your code for review.', color: '#06b6d4' },
      { id: 'reviewer', name: 'Code Reviewer', responsibility: 'Review correctness and best practices', prompt: 'You are a code reviewer checking for bugs and best practices.', color: '#ef4444' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Code Walkthrough', description: 'Developer walks through the implementation', duration: '10 min' },
      { id: 'a2', title: 'Review Feedback', description: 'Reviewer provides specific feedback', duration: '10 min' },
      { id: 'a3', title: 'Action Items', description: 'List required changes and improvements', duration: '5 min' },
    ],
    expectedOutcomes: ['Identified bugs and issues', 'Performance improvement suggestions', 'Action items for fixes', 'Best practice recommendations'],
    tips: ['Focus on concrete, actionable feedback', 'Prioritize correctness over style', 'Suggest specific alternatives'],
    presetQuestions: ['Are there any bugs or edge cases not handled properly?', 'Can the algorithm be optimized for better performance?', 'Does the code follow established patterns and conventions?'],
    presetRules: ['Focus on concrete, actionable feedback', 'Prioritize correctness over style', 'Suggest specific alternatives for any issues found'],
    presetRounds: 2,
    presetTemperature: 0.2,
    suggestedAgents: ['ML Engineer'],
    useCount: 156,
    isCustom: false,
    createdAt: '2024-04-15T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'student-mentoring',
    title: 'Student Mentoring',
    description: 'PI + Student guidance session',
    longDescription: 'A supportive mentoring session where the PI provides guidance on research direction, career development, and skill building for a student.',
    icon: 'GraduationCap',
    iconGradient: 'linear-gradient(135deg, #ec4899, #be185d)',
    category: 'Research',
    difficulty: 'beginner',
    expectedDuration: '30-45 min',
    participantsRequired: 2,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Mentor and guide the student', prompt: 'You are a PI mentoring a student on their research.', color: '#10b981' },
      { id: 'student', name: 'Student', responsibility: 'Present progress and ask for guidance', prompt: 'You are a student seeking research guidance.', color: '#8b5cf6' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Progress Review', description: 'Review the students recent work', duration: '10 min' },
      { id: 'a2', title: 'Challenges Discussion', description: 'Discuss difficulties and provide guidance', duration: '15 min' },
      { id: 'a3', title: 'Next Steps', description: 'Define clear next steps and goals', duration: '10 min' },
    ],
    expectedOutcomes: ['Feedback on progress', 'Guidance on challenges', 'Clear next steps', 'Skill development plan'],
    tips: ['Be encouraging and constructive', 'Set achievable short-term goals', 'Focus on developing independence'],
    presetQuestions: ['What progress have you made since our last meeting?', 'What challenges are you facing?', 'What do you want to achieve by next week?'],
    presetRules: ['Provide constructive and specific feedback', 'Set achievable short-term goals', 'Encourage independent problem-solving'],
    presetRounds: 2,
    presetTemperature: 0.6,
    suggestedAgents: ['Principal Investigator'],
    useCount: 312,
    isCustom: false,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'collaboration-kickoff',
    title: 'Collaboration Kickoff',
    description: 'PI + External Collaborator establish partnership',
    longDescription: 'An initial meeting to establish a new research collaboration. The teams share expertise, identify synergies, and define the framework for working together.',
    icon: 'Handshake',
    iconGradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    category: 'Brainstorm',
    difficulty: 'intermediate',
    expectedDuration: '45-60 min',
    participantsRequired: 2,
    participantRoles: [
      { id: 'pi', name: 'Principal Investigator', responsibility: 'Present lab capabilities and goals', prompt: 'You are a PI seeking a new collaboration.', color: '#10b981' },
      { id: 'collaborator', name: 'External Collaborator', responsibility: 'Share expertise and explore synergy', prompt: 'You are an external researcher exploring collaboration.', color: '#06b6d4' },
    ],
    agendaSections: [
      { id: 'a1', title: 'Introductions', description: 'Share backgrounds and expertise', duration: '10 min' },
      { id: 'a2', title: 'Synergy Exploration', description: 'Identify areas of mutual interest', duration: '15 min' },
      { id: 'a3', title: 'Collaboration Framework', description: 'Define roles, expectations, and communication', duration: '15 min' },
      { id: 'a4', title: 'Next Steps', description: 'Agree on initial joint project or action', duration: '10 min' },
    ],
    expectedOutcomes: ['Shared understanding of expertise', 'Identified collaboration opportunities', 'Communication framework', 'Initial project plan'],
    tips: ['Be open about capabilities and limitations', 'Focus on win-win outcomes', 'Establish clear communication channels'],
    presetQuestions: ['What are each groups core strengths?', 'Where do our research interests overlap?', 'What would an ideal collaboration look like?'],
    presetRules: ['Be transparent about capabilities', 'Focus on mutual benefit', 'Establish clear communication norms'],
    presetRounds: 2,
    presetTemperature: 0.7,
    suggestedAgents: ['Principal Investigator', 'Computational Biologist'],
    useCount: 87,
    isCustom: false,
    createdAt: '2024-05-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
]

// ============================================================
// In-memory custom template store (simulates localStorage on server)
// ============================================================

let customTemplates: MeetingTemplateData[] = []

// ============================================================
// GET /api/templates
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')

    let templates = [...BUILT_IN_TEMPLATES, ...customTemplates]

    if (category) {
      templates = templates.filter(t => t.category.toLowerCase() === category.toLowerCase())
    }
    if (difficulty) {
      templates = templates.filter(t => t.difficulty.toLowerCase() === difficulty.toLowerCase())
    }
    if (search) {
      const q = search.toLowerCase()
      templates = templates.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }

    return NextResponse.json({
      success: true,
      data: templates,
      total: templates.length,
      builtIn: BUILT_IN_TEMPLATES.length,
      custom: customTemplates.length,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST /api/templates — Create a custom template
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      longDescription,
      icon,
      iconGradient,
      category,
      difficulty,
      expectedDuration,
      participantsRequired,
      participantRoles,
      agendaSections,
      expectedOutcomes,
      tips,
      presetQuestions,
      presetRules,
      presetRounds,
      presetTemperature,
      suggestedAgents,
    } = body

    if (!title || !description || !category || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: title, description, category, difficulty' },
        { status: 400 }
      )
    }

    const newTemplate: MeetingTemplateData = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title?.trim() || 'Untitled Template',
      description: (description || '').trim(),
      longDescription: (longDescription || description || '').trim(),
      icon: icon || 'FileText',
      iconGradient: iconGradient || 'linear-gradient(135deg, #10b981, #059669)',
      category: category || 'Research',
      difficulty: difficulty || 'beginner',
      expectedDuration: expectedDuration || '30-45 min',
      participantsRequired: participantsRequired || 2,
      participantRoles: participantRoles || [],
      agendaSections: agendaSections || [],
      expectedOutcomes: expectedOutcomes || [],
      tips: tips || [],
      presetQuestions: presetQuestions || [],
      presetRules: presetRules || [],
      presetRounds: presetRounds || 2,
      presetTemperature: presetTemperature || 0.5,
      suggestedAgents: suggestedAgents || [],
      useCount: 0,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    customTemplates.push(newTemplate)

    return NextResponse.json(
      { success: true, data: newTemplate },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// ============================================================
// PUT /api/templates — Update a custom template
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const index = customTemplates.findIndex(t => t.id === id)
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Template not found or is a built-in template (cannot modify)' },
        { status: 404 }
      )
    }

    customTemplates[index] = {
      ...customTemplates[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      data: customTemplates[index],
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// ============================================================
// DELETE /api/templates — Delete a custom template
// ============================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const index = customTemplates.findIndex(t => t.id === id)
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Template not found or is a built-in template (cannot delete)' },
        { status: 404 }
      )
    }

    const deleted = customTemplates.splice(index, 1)[0]

    return NextResponse.json({
      success: true,
      data: deleted,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
