import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

interface ResourceAuthor {
  id: string
  name: string
  initials: string
  color: string
}

interface ResourceVersion {
  version: string
  date: string
  author: string
  changes: string
}

interface ResourceItem {
  id: string
  title: string
  description: string
  type: 'paper' | 'dataset' | 'model' | 'protocol' | 'image' | 'code' | 'note' | 'presentation'
  tags: string[]
  fileSize: string
  uploadDate: string
  modifiedDate: string
  uploader: ResourceAuthor
  downloadCount: number
  viewCount: number
  favorite: boolean
  status: 'Published' | 'Draft' | 'Under Review'
  license: string
  doi: string
  gradient: string
  relatedIds: string[]
  versions: ResourceVersion[]
}

// ─── Mock Data ──────────────────────────────────────────────────

const AUTHORS: ResourceAuthor[] = [
  { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981' },
  { id: 'a2', name: 'Dr. Wei Zhang', initials: 'WZ', color: '#06b6d4' },
  { id: 'a3', name: 'Dr. Lisa Wang', initials: 'LW', color: '#8b5cf6' },
  { id: 'a4', name: 'Dr. Emma Davis', initials: 'ED', color: '#f59e0b' },
  { id: 'a5', name: 'Dr. Michael Ross', initials: 'MR', color: '#ef4444' },
  { id: 'a6', name: 'Dr. Sophie Martin', initials: 'SM', color: '#ec4899' },
  { id: 'a7', name: 'Dr. James Park', initials: 'JP', color: '#14b8a6' },
  { id: 'a8', name: 'Dr. Ana Silva', initials: 'AS', color: '#a855f7' },
]

const RESOURCES: ResourceItem[] = [
  {
    id: 'r1', title: 'Protein Folding with AlphaFold v3',
    description: 'Comprehensive analysis of protein structure prediction using the latest AlphaFold v3 model on benchmark datasets.',
    type: 'paper', tags: ['Machine Learning', 'Biology'],
    fileSize: '4.2 MB', uploadDate: '2025-01-15', modifiedDate: '2025-01-18',
    uploader: AUTHORS[0], downloadCount: 342, viewCount: 1580, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1038/s41586-025-00123',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    relatedIds: ['r2', 'r5', 'r10'],
    versions: [
      { version: 'v3.0', date: '2025-01-18', author: 'Dr. Sarah Chen', changes: 'Updated benchmark results with new dataset' },
      { version: 'v2.1', date: '2025-01-10', author: 'Dr. Wei Zhang', changes: 'Fixed evaluation metrics calculation' },
      { version: 'v2.0', date: '2024-12-20', author: 'Dr. Sarah Chen', changes: 'Major revision: added ablation studies' },
    ],
  },
  {
    id: 'r2', title: 'Single-Cell RNA-seq Atlas v2',
    description: 'Updated single-cell RNA sequencing atlas covering 45 human tissue types with 2.3 million cells.',
    type: 'dataset', tags: ['Biology', 'Statistics'],
    fileSize: '1.8 GB', uploadDate: '2025-01-12', modifiedDate: '2025-01-16',
    uploader: AUTHORS[1], downloadCount: 891, viewCount: 2340, favorite: true,
    status: 'Published', license: 'MIT', doi: '10.5281/zenodo.1452367',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    relatedIds: ['r1', 'r7', 'r12'],
    versions: [
      { version: 'v2.0', date: '2025-01-16', author: 'Dr. Wei Zhang', changes: 'Added 12 new tissue types' },
      { version: 'v1.5', date: '2024-11-15', author: 'Dr. Lisa Wang', changes: 'Quality control improvements' },
      { version: 'v1.0', date: '2024-09-01', author: 'Dr. Wei Zhang', changes: 'Initial release' },
    ],
  },
  {
    id: 'r3', title: 'CRISPR Guide RNA Predictor',
    description: 'Machine learning model for predicting CRISPR-Cas9 guide RNA on-target efficiency and off-target effects.',
    type: 'model', tags: ['Machine Learning', 'Biology'],
    fileSize: '256 MB', uploadDate: '2025-01-10', modifiedDate: '2025-01-14',
    uploader: AUTHORS[4], downloadCount: 567, viewCount: 1890, favorite: false,
    status: 'Published', license: 'Apache 2.0', doi: '10.1101/2025.01.10.001234',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    relatedIds: ['r1', 'r5', 'r15'],
    versions: [
      { version: 'v2.2', date: '2025-01-14', author: 'Dr. Michael Ross', changes: 'Improved off-target prediction accuracy' },
      { version: 'v2.1', date: '2024-12-28', author: 'Dr. Sophie Martin', changes: 'Added SpCas9 variant support' },
      { version: 'v2.0', date: '2024-12-01', author: 'Dr. Michael Ross', changes: 'Model architecture overhaul' },
    ],
  },
  {
    id: 'r4', title: 'Western Blot Protocol SOP',
    description: 'Standard operating procedure for Western blot protein detection with detailed reagent preparation steps.',
    type: 'protocol', tags: ['Experimental', 'Chemistry'],
    fileSize: '1.1 MB', uploadDate: '2024-12-20', modifiedDate: '2025-01-05',
    uploader: AUTHORS[6], downloadCount: 234, viewCount: 890, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    relatedIds: ['r8', 'r14'],
    versions: [
      { version: 'v1.3', date: '2025-01-05', author: 'Dr. James Park', changes: 'Updated antibody concentrations' },
      { version: 'v1.2', date: '2024-12-01', author: 'Dr. James Park', changes: 'Added troubleshooting section' },
      { version: 'v1.0', date: '2024-10-15', author: 'Dr. James Park', changes: 'Initial protocol' },
    ],
  },
  {
    id: 'r5', title: 'Protein Structure Gallery',
    description: 'High-resolution 3D protein structure visualizations rendered with PyMOL for 50 therapeutic targets.',
    type: 'image', tags: ['Biology', 'Machine Learning'],
    fileSize: '890 MB', uploadDate: '2025-01-08', modifiedDate: '2025-01-13',
    uploader: AUTHORS[0], downloadCount: 156, viewCount: 720, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1452890',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    relatedIds: ['r1', 'r2', 'r11'],
    versions: [
      { version: 'v1.1', date: '2025-01-13', author: 'Dr. Sarah Chen', changes: 'Added 15 new structures' },
      { version: 'v1.0', date: '2025-01-08', author: 'Dr. Sarah Chen', changes: 'Initial gallery release' },
    ],
  },
  {
    id: 'r6', title: 'Molecular Docking Pipeline',
    description: 'Automated molecular docking pipeline using AutoDock Vina with GPU-accelerated scoring functions.',
    type: 'code', tags: ['Chemistry', 'Machine Learning'],
    fileSize: '45 MB', uploadDate: '2025-01-06', modifiedDate: '2025-01-12',
    uploader: AUTHORS[2], downloadCount: 423, viewCount: 1120, favorite: false,
    status: 'Published', license: 'MIT', doi: '',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    relatedIds: ['r7', 'r13', 'r17'],
    versions: [
      { version: 'v3.1', date: '2025-01-12', author: 'Dr. Lisa Wang', changes: 'GPU optimization for Vina scoring' },
      { version: 'v3.0', date: '2024-12-15', author: 'Dr. Lisa Wang', changes: 'Rewritten in Rust for speed' },
      { version: 'v2.5', date: '2024-11-01', author: 'Dr. Ana Silva', changes: 'Added batch processing' },
    ],
  },
  {
    id: 'r7', title: 'Drug Discovery Research Notes',
    description: 'Lab notebook entries documenting virtual screening campaign results and hit validation experiments.',
    type: 'note', tags: ['Chemistry', 'Experimental'],
    fileSize: '2.4 MB', uploadDate: '2025-01-11', modifiedDate: '2025-01-17',
    uploader: AUTHORS[2], downloadCount: 45, viewCount: 320, favorite: false,
    status: 'Draft', license: '', doi: '',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    relatedIds: ['r6', 'r13'],
    versions: [
      { version: 'v0.3', date: '2025-01-17', author: 'Dr. Lisa Wang', changes: 'Added Week 4 screening results' },
      { version: 'v0.2', date: '2025-01-14', author: 'Dr. Lisa Wang', changes: 'Added Week 3 validation data' },
    ],
  },
  {
    id: 'r8', title: 'Lab Meeting Q1 Presentation',
    description: 'Quarterly lab presentation covering CRISPR optimization progress and gene expression analysis results.',
    type: 'presentation', tags: ['Biology', 'Statistics'],
    fileSize: '18 MB', uploadDate: '2025-01-09', modifiedDate: '2025-01-15',
    uploader: AUTHORS[4], downloadCount: 67, viewCount: 450, favorite: false,
    status: 'Published', license: '', doi: '',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    relatedIds: ['r3', 'r4', 'r12'],
    versions: [
      { version: 'v1.0', date: '2025-01-15', author: 'Dr. Michael Ross', changes: 'Final presentation for Q1 meeting' },
    ],
  },
  {
    id: 'r9', title: 'Transformer Protein Language Model',
    description: 'Pre-trained transformer model for protein sequence analysis trained on UniRef50 with 1.2 billion parameters.',
    type: 'model', tags: ['Machine Learning', 'Biology'],
    fileSize: '4.8 GB', uploadDate: '2024-12-28', modifiedDate: '2025-01-10',
    uploader: AUTHORS[1], downloadCount: 1203, viewCount: 3450, favorite: true,
    status: 'Published', license: 'Apache 2.0', doi: '10.1101/2024.12.28.098765',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    relatedIds: ['r1', 'r2', 'r5'],
    versions: [
      { version: 'v1.1', date: '2025-01-10', author: 'Dr. Wei Zhang', changes: 'Fine-tuned on membrane proteins' },
      { version: 'v1.0', date: '2024-12-28', author: 'Dr. Wei Zhang', changes: 'Initial model release' },
    ],
  },
  {
    id: 'r10', title: 'Gene Expression Heatmap Dataset',
    description: 'Normalized gene expression values across 200 tissue samples with differential expression analysis results.',
    type: 'dataset', tags: ['Biology', 'Statistics'],
    fileSize: '340 MB', uploadDate: '2025-01-04', modifiedDate: '2025-01-11',
    uploader: AUTHORS[3], downloadCount: 189, viewCount: 670, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1453012',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    relatedIds: ['r2', 'r7', 'r12'],
    versions: [
      { version: 'v1.2', date: '2025-01-11', author: 'Dr. Emma Davis', changes: 'Added FDR-corrected p-values' },
      { version: 'v1.1', date: '2025-01-08', author: 'Dr. Emma Davis', changes: 'Normalization fix' },
      { version: 'v1.0', date: '2025-01-04', author: 'Dr. Emma Davis', changes: 'Initial dataset' },
    ],
  },
  {
    id: 'r11', title: 'Cell Segmentation ML Model',
    description: 'Deep learning model for automated cell segmentation in fluorescence microscopy images using U-Net architecture.',
    type: 'model', tags: ['Machine Learning', 'Biology'],
    fileSize: '180 MB', uploadDate: '2025-01-03', modifiedDate: '2025-01-09',
    uploader: AUTHORS[5], downloadCount: 312, viewCount: 1450, favorite: false,
    status: 'Under Review', license: 'MIT', doi: '',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    relatedIds: ['r5', 'r9', 'r20'],
    versions: [
      { version: 'v0.9', date: '2025-01-09', author: 'Dr. Sophie Martin', changes: 'Pre-release candidate' },
      { version: 'v0.8', date: '2025-01-05', author: 'Dr. Sophie Martin', changes: 'Improved edge detection' },
    ],
  },
  {
    id: 'r12', title: 'Biomarker Panel Analysis',
    description: 'Proteomics panel analyzing 150 biomarkers for early disease detection from plasma samples.',
    type: 'paper', tags: ['Chemistry', 'Experimental'],
    fileSize: '3.5 MB', uploadDate: '2025-01-02', modifiedDate: '2025-01-14',
    uploader: AUTHORS[7], downloadCount: 278, viewCount: 920, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1038/s41591-025-00234',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    relatedIds: ['r2', 'r10', 'r18'],
    versions: [
      { version: 'v2.0', date: '2025-01-14', author: 'Dr. Ana Silva', changes: 'Updated with validation cohort' },
      { version: 'v1.0', date: '2025-01-02', author: 'Dr. Ana Silva', changes: 'Initial submission' },
    ],
  },
  {
    id: 'r13', title: 'Compound Library Collection',
    description: 'Curated library of 500,000 drug-like compounds with calculated ADMET properties and 3D conformers.',
    type: 'dataset', tags: ['Chemistry', 'Machine Learning'],
    fileSize: '12 GB', uploadDate: '2024-12-25', modifiedDate: '2025-01-08',
    uploader: AUTHORS[2], downloadCount: 734, viewCount: 2100, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '10.5281/zenodo.1453456',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    relatedIds: ['r6', 'r7', 'r17'],
    versions: [
      { version: 'v2.0', date: '2025-01-08', author: 'Dr. Lisa Wang', changes: 'Added ADMET predictions' },
      { version: 'v1.5', date: '2024-12-28', author: 'Dr. Lisa Wang', changes: 'Added 200K compounds' },
      { version: 'v1.0', date: '2024-12-25', author: 'Dr. Lisa Wang', changes: 'Initial collection' },
    ],
  },
  {
    id: 'r14', title: 'Chromatin Immunoprecipitation SOP',
    description: 'Detailed ChIP-seq protocol covering cell fixation, chromatin shearing, immunoprecipitation and library preparation.',
    type: 'protocol', tags: ['Biology', 'Experimental'],
    fileSize: '800 KB', uploadDate: '2024-12-22', modifiedDate: '2025-01-06',
    uploader: AUTHORS[3], downloadCount: 198, viewCount: 650, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    relatedIds: ['r4', 'r10'],
    versions: [
      { version: 'v1.4', date: '2025-01-06', author: 'Dr. Emma Davis', changes: 'Optimized sonication parameters' },
      { version: 'v1.3', date: '2024-12-01', author: 'Dr. Emma Davis', changes: 'Updated antibody list' },
    ],
  },
  {
    id: 'r15', title: 'Variant Calling Pipeline',
    description: 'GATK-based variant calling pipeline for whole-genome sequencing data with quality control checks.',
    type: 'code', tags: ['Machine Learning', 'Biology'],
    fileSize: '32 MB', uploadDate: '2024-12-18', modifiedDate: '2025-01-05',
    uploader: AUTHORS[4], downloadCount: 289, viewCount: 980, favorite: false,
    status: 'Published', license: 'GPL-3.0', doi: '',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    relatedIds: ['r3', 'r9', 'r16'],
    versions: [
      { version: 'v2.0', date: '2025-01-05', author: 'Dr. Michael Ross', changes: 'Added somatic variant calling' },
      { version: 'v1.5', date: '2024-12-01', author: 'Dr. Michael Ross', changes: 'Parallel processing support' },
    ],
  },
  {
    id: 'r16', title: 'Microscopy Image Collection',
    description: 'High-resolution confocal microscopy images of fluorescently labeled neurons in cortical brain slices.',
    type: 'image', tags: ['Biology', 'Experimental'],
    fileSize: '2.1 GB', uploadDate: '2024-12-15', modifiedDate: '2025-01-03',
    uploader: AUTHORS[5], downloadCount: 98, viewCount: 540, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1453789',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    relatedIds: ['r11', 'r20'],
    versions: [
      { version: 'v1.2', date: '2025-01-03', author: 'Dr. Sophie Martin', changes: 'Added super-resolution images' },
      { version: 'v1.0', date: '2024-12-15', author: 'Dr. Sophie Martin', changes: 'Initial collection' },
    ],
  },
  {
    id: 'r17', title: 'Quantum Chemistry Scripts',
    description: 'Python scripts for DFT calculations using ORCA with automated geometry optimization and frequency analysis.',
    type: 'code', tags: ['Chemistry', 'Machine Learning'],
    fileSize: '8.5 MB', uploadDate: '2024-12-12', modifiedDate: '2025-01-02',
    uploader: AUTHORS[7], downloadCount: 167, viewCount: 620, favorite: false,
    status: 'Draft', license: 'MIT', doi: '',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    relatedIds: ['r6', 'r13'],
    versions: [
      { version: 'v0.5', date: '2025-01-02', author: 'Dr. Ana Silva', changes: 'Added solvent models' },
      { version: 'v0.4', date: '2024-12-20', author: 'Dr. Ana Silva', changes: 'Bug fixes in frequency analysis' },
    ],
  },
  {
    id: 'r18', title: 'Longitudinal Study Dataset',
    description: 'Three-year longitudinal clinical data tracking biomarker progression in 500 Alzheimer\'s patients.',
    type: 'dataset', tags: ['Statistics', 'Biology'],
    fileSize: '560 MB', uploadDate: '2024-12-10', modifiedDate: '2025-01-07',
    uploader: AUTHORS[6], downloadCount: 445, viewCount: 1560, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1454012',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    relatedIds: ['r12', 'r10'],
    versions: [
      { version: 'v1.5', date: '2025-01-07', author: 'Dr. James Park', changes: 'Added Year 3 follow-up data' },
      { version: 'v1.4', date: '2024-12-01', author: 'Dr. James Park', changes: 'Quality control on Year 2 data' },
    ],
  },
  {
    id: 'r19', title: 'Metabolomics Workflow Script',
    description: 'Automated LC-MS metabolomics data processing pipeline with peak detection and pathway analysis.',
    type: 'code', tags: ['Chemistry', 'Statistics'],
    fileSize: '15 MB', uploadDate: '2024-12-08', modifiedDate: '2025-01-01',
    uploader: AUTHORS[7], downloadCount: 134, viewCount: 480, favorite: false,
    status: 'Under Review', license: 'MIT', doi: '',
    gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    relatedIds: ['r12', 'r17'],
    versions: [
      { version: 'v0.9', date: '2025-01-01', author: 'Dr. Ana Silva', changes: 'Added pathway enrichment' },
      { version: 'v0.8', date: '2024-12-20', author: 'Dr. Ana Silva', changes: 'Peak alignment improvements' },
    ],
  },
  {
    id: 'r20', title: 'Synthetic Biology Circuit Designs',
    description: 'Collection of genetic circuit designs for metabolic pathway engineering with simulation results.',
    type: 'presentation', tags: ['Biology', 'Experimental'],
    fileSize: '24 MB', uploadDate: '2024-12-05', modifiedDate: '2025-01-10',
    uploader: AUTHORS[5], downloadCount: 89, viewCount: 380, favorite: false,
    status: 'Published', license: '', doi: '',
    gradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    relatedIds: ['r14', 'r16'],
    versions: [
      { version: 'v1.1', date: '2025-01-10', author: 'Dr. Sophie Martin', changes: 'Added simulation plots' },
      { version: 'v1.0', date: '2024-12-05', author: 'Dr. Sophie Martin', changes: 'Initial presentation' },
    ],
  },
  {
    id: 'r21', title: 'Statistical Analysis Templates',
    description: 'R and Python template notebooks for common statistical analyses in biomedical research.',
    type: 'note', tags: ['Statistics', 'Machine Learning'],
    fileSize: '6.8 MB', uploadDate: '2024-12-01', modifiedDate: '2025-01-09',
    uploader: AUTHORS[3], downloadCount: 523, viewCount: 2100, favorite: false,
    status: 'Published', license: 'MIT', doi: '',
    gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)',
    relatedIds: ['r10', 'r18'],
    versions: [
      { version: 'v2.0', date: '2025-01-09', author: 'Dr. Emma Davis', changes: 'Added mixed-effects models' },
      { version: 'v1.5', date: '2024-12-15', author: 'Dr. Emma Davis', changes: 'Added survival analysis' },
    ],
  },
  {
    id: 'r22', title: 'Nanoparticle Synthesis Protocol',
    description: 'Gold nanoparticle synthesis protocol with controlled size distribution and surface functionalization steps.',
    type: 'protocol', tags: ['Chemistry', 'Experimental'],
    fileSize: '950 KB', uploadDate: '2024-11-28', modifiedDate: '2025-01-04',
    uploader: AUTHORS[6], downloadCount: 312, viewCount: 890, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    relatedIds: ['r4', 'r14'],
    versions: [
      { version: 'v1.2', date: '2025-01-04', author: 'Dr. James Park', changes: 'Optimized reduction conditions' },
      { version: 'v1.1', date: '2024-12-10', author: 'Dr. James Park', changes: 'Added PEG functionalization' },
    ],
  },
  {
    id: 'r23', title: 'Clinical Trial Data Summary',
    description: 'Anonymized summary data from Phase II clinical trial with efficacy endpoints and safety profiles.',
    type: 'dataset', tags: ['Statistics', 'Biology'],
    fileSize: '120 MB', uploadDate: '2024-11-25', modifiedDate: '2025-01-02',
    uploader: AUTHORS[7], downloadCount: 178, viewCount: 560, favorite: false,
    status: 'Draft', license: '', doi: '',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    relatedIds: ['r18', 'r12'],
    versions: [
      { version: 'v0.2', date: '2025-01-02', author: 'Dr. Ana Silva', changes: 'Added safety data' },
      { version: 'v0.1', date: '2024-11-25', author: 'Dr. Ana Silva', changes: 'Initial data extract' },
    ],
  },
  {
    id: 'r24', title: 'Experimental Design Guidelines',
    description: 'Best practices document for designing statistically rigorous experiments in molecular biology.',
    type: 'paper', tags: ['Statistics', 'Experimental'],
    fileSize: '2.8 MB', uploadDate: '2024-11-20', modifiedDate: '2024-12-28',
    uploader: AUTHORS[0], downloadCount: 356, viewCount: 1340, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1101/2024.11.20.567890',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    relatedIds: ['r21', 'r4'],
    versions: [
      { version: 'v1.0', date: '2024-12-28', author: 'Dr. Sarah Chen', changes: 'Final publication version' },
    ],
  },
]

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  const resources = RESOURCES.map(r => ({ ...r }))
  const tags = ['Machine Learning', 'Biology', 'Chemistry', 'Statistics', 'Experimental']
  const types = ['paper', 'dataset', 'model', 'protocol', 'image', 'code', 'note', 'presentation']
  const totalSize = 2.4 // GB

  return NextResponse.json({
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      resources,
      filters: {
        types: types.map(t => ({
          value: t,
          label: t.charAt(0).toUpperCase() + t.slice(1),
          count: resources.filter(r => r.type === t).length,
        })),
        tags: tags.map(tag => ({
          value: tag,
          count: resources.filter(r => r.tags.includes(tag)).length,
        })),
      },
      stats: {
        total: resources.length,
        papers: resources.filter(r => r.type === 'paper').length,
        datasets: resources.filter(r => r.type === 'dataset').length,
        models: resources.filter(r => r.type === 'model').length,
        totalSize,
        maxStorage: 10, // GB
        storageUsedPercent: (totalSize / 10) * 100,
      },
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
