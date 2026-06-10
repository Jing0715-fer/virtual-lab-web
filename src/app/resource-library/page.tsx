'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Library, Search, Upload, Grid3X3, List, Filter,
  FileText, Database, Brain, FlaskConical, ImageIcon, Code2,
  StickyNote, Presentation, Star, Download, Eye, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, X, Share2, Copy, Archive,
  Trash2, HardDrive, Clock, Tag, Calendar, User, ExternalLink,
  Heart, FolderOpen, BookOpen, FileSpreadsheet,
} from 'lucide-react'

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

type ViewMode = 'grid' | 'list'
type SortKey = 'newest' | 'name' | 'size' | 'downloads'
type DateRange = '7days' | '30days' | '3months' | 'all'

// ─── Constants ──────────────────────────────────────────────────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  paper: <FileText size={22} />,
  dataset: <Database size={22} />,
  model: <Brain size={22} />,
  protocol: <FlaskConical size={22} />,
  image: <ImageIcon size={22} />,
  code: <Code2 size={22} />,
  note: <StickyNote size={22} />,
  presentation: <Presentation size={22} />,
}

const TYPE_CLASSES: Record<string, string> = {
  paper: 'rl-type-paper',
  dataset: 'rl-type-dataset',
  model: 'rl-type-model',
  protocol: 'rl-type-protocol',
  image: 'rl-type-image',
  code: 'rl-type-code',
  note: 'rl-type-note',
  presentation: 'rl-type-presentation',
}

const TYPE_GRADIENTS: Record<string, string> = {
  paper: 'linear-gradient(135deg, #06b6d4, #0891b2)',
  dataset: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  model: 'linear-gradient(135deg, #ec4899, #db2777)',
  protocol: 'linear-gradient(135deg, #10b981, #059669)',
  image: 'linear-gradient(135deg, #f59e0b, #d97706)',
  code: 'linear-gradient(135deg, #ef4444, #dc2626)',
  note: 'linear-gradient(135deg, #14b8a6, #0d9488)',
  presentation: 'linear-gradient(135deg, #a855f7, #9333ea)',
}

const STATUS_CLASSES: Record<string, string> = {
  'Published': 'rl-status-published',
  'Draft': 'rl-status-draft',
  'Under Review': 'rl-status-review',
}

const ALL_TAGS = ['Machine Learning', 'Biology', 'Chemistry', 'Statistics', 'Experimental']
const ALL_TYPES = ['paper', 'dataset', 'model', 'protocol', 'image', 'code', 'note', 'presentation']

const MOCK_RESOURCES: ResourceItem[] = [
  {
    id: 'r1', title: 'Protein Folding with AlphaFold v3',
    description: 'Comprehensive analysis of protein structure prediction using the latest AlphaFold v3 model on benchmark datasets.',
    type: 'paper', tags: ['Machine Learning', 'Biology'],
    fileSize: '4.2 MB', uploadDate: '2025-01-15', modifiedDate: '2025-01-18',
    uploader: { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981' },
    downloadCount: 342, viewCount: 1580, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1038/s41586-025-00123',
    gradient: TYPE_GRADIENTS.paper,
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
    uploader: { id: 'a2', name: 'Dr. Wei Zhang', initials: 'WZ', color: '#06b6d4' },
    downloadCount: 891, viewCount: 2340, favorite: true,
    status: 'Published', license: 'MIT', doi: '10.5281/zenodo.1452367',
    gradient: TYPE_GRADIENTS.dataset,
    relatedIds: ['r1', 'r7', 'r12'],
    versions: [
      { version: 'v2.0', date: '2025-01-16', author: 'Dr. Wei Zhang', changes: 'Added 12 new tissue types' },
      { version: 'v1.5', date: '2024-11-15', author: 'Dr. Lisa Wang', changes: 'Quality control improvements' },
    ],
  },
  {
    id: 'r3', title: 'CRISPR Guide RNA Predictor',
    description: 'Machine learning model for predicting CRISPR-Cas9 guide RNA on-target efficiency and off-target effects.',
    type: 'model', tags: ['Machine Learning', 'Biology'],
    fileSize: '256 MB', uploadDate: '2025-01-10', modifiedDate: '2025-01-14',
    uploader: { id: 'a3', name: 'Dr. Michael Ross', initials: 'MR', color: '#ef4444' },
    downloadCount: 567, viewCount: 1890, favorite: false,
    status: 'Published', license: 'Apache 2.0', doi: '10.1101/2025.01.10.001234',
    gradient: TYPE_GRADIENTS.model,
    relatedIds: ['r1', 'r5', 'r15'],
    versions: [
      { version: 'v2.2', date: '2025-01-14', author: 'Dr. Michael Ross', changes: 'Improved off-target prediction accuracy' },
      { version: 'v2.0', date: '2024-12-01', author: 'Dr. Michael Ross', changes: 'Model architecture overhaul' },
    ],
  },
  {
    id: 'r4', title: 'Western Blot Protocol SOP',
    description: 'Standard operating procedure for Western blot protein detection with detailed reagent preparation steps.',
    type: 'protocol', tags: ['Experimental', 'Chemistry'],
    fileSize: '1.1 MB', uploadDate: '2024-12-20', modifiedDate: '2025-01-05',
    uploader: { id: 'a4', name: 'Dr. James Park', initials: 'JP', color: '#14b8a6' },
    downloadCount: 234, viewCount: 890, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: TYPE_GRADIENTS.protocol,
    relatedIds: ['r8', 'r14'],
    versions: [
      { version: 'v1.3', date: '2025-01-05', author: 'Dr. James Park', changes: 'Updated antibody concentrations' },
      { version: 'v1.0', date: '2024-10-15', author: 'Dr. James Park', changes: 'Initial protocol' },
    ],
  },
  {
    id: 'r5', title: 'Protein Structure Gallery',
    description: 'High-resolution 3D protein structure visualizations rendered with PyMOL for 50 therapeutic targets.',
    type: 'image', tags: ['Biology', 'Machine Learning'],
    fileSize: '890 MB', uploadDate: '2025-01-08', modifiedDate: '2025-01-13',
    uploader: { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981' },
    downloadCount: 156, viewCount: 720, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1452890',
    gradient: TYPE_GRADIENTS.image,
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
    uploader: { id: 'a5', name: 'Dr. Lisa Wang', initials: 'LW', color: '#8b5cf6' },
    downloadCount: 423, viewCount: 1120, favorite: false,
    status: 'Published', license: 'MIT', doi: '',
    gradient: TYPE_GRADIENTS.code,
    relatedIds: ['r7', 'r13', 'r17'],
    versions: [
      { version: 'v3.1', date: '2025-01-12', author: 'Dr. Lisa Wang', changes: 'GPU optimization for Vina scoring' },
      { version: 'v2.5', date: '2024-11-01', author: 'Dr. Ana Silva', changes: 'Added batch processing' },
    ],
  },
  {
    id: 'r7', title: 'Drug Discovery Research Notes',
    description: 'Lab notebook entries documenting virtual screening campaign results and hit validation experiments.',
    type: 'note', tags: ['Chemistry', 'Experimental'],
    fileSize: '2.4 MB', uploadDate: '2025-01-11', modifiedDate: '2025-01-17',
    uploader: { id: 'a5', name: 'Dr. Lisa Wang', initials: 'LW', color: '#8b5cf6' },
    downloadCount: 45, viewCount: 320, favorite: false,
    status: 'Draft', license: '', doi: '',
    gradient: TYPE_GRADIENTS.note,
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
    uploader: { id: 'a3', name: 'Dr. Michael Ross', initials: 'MR', color: '#ef4444' },
    downloadCount: 67, viewCount: 450, favorite: false,
    status: 'Published', license: '', doi: '',
    gradient: TYPE_GRADIENTS.presentation,
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
    uploader: { id: 'a2', name: 'Dr. Wei Zhang', initials: 'WZ', color: '#06b6d4' },
    downloadCount: 1203, viewCount: 3450, favorite: true,
    status: 'Published', license: 'Apache 2.0', doi: '10.1101/2024.12.28.098765',
    gradient: TYPE_GRADIENTS.model,
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
    uploader: { id: 'a6', name: 'Dr. Emma Davis', initials: 'ED', color: '#f59e0b' },
    downloadCount: 189, viewCount: 670, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1453012',
    gradient: TYPE_GRADIENTS.dataset,
    relatedIds: ['r2', 'r7', 'r12'],
    versions: [
      { version: 'v1.2', date: '2025-01-11', author: 'Dr. Emma Davis', changes: 'Added FDR-corrected p-values' },
      { version: 'v1.0', date: '2025-01-04', author: 'Dr. Emma Davis', changes: 'Initial dataset' },
    ],
  },
  {
    id: 'r11', title: 'Cell Segmentation ML Model',
    description: 'Deep learning model for automated cell segmentation in fluorescence microscopy images using U-Net architecture.',
    type: 'model', tags: ['Machine Learning', 'Biology'],
    fileSize: '180 MB', uploadDate: '2025-01-03', modifiedDate: '2025-01-09',
    uploader: { id: 'a7', name: 'Dr. Sophie Martin', initials: 'SM', color: '#ec4899' },
    downloadCount: 312, viewCount: 1450, favorite: false,
    status: 'Under Review', license: 'MIT', doi: '',
    gradient: TYPE_GRADIENTS.model,
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
    uploader: { id: 'a8', name: 'Dr. Ana Silva', initials: 'AS', color: '#a855f7' },
    downloadCount: 278, viewCount: 920, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1038/s41591-025-00234',
    gradient: TYPE_GRADIENTS.paper,
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
    uploader: { id: 'a5', name: 'Dr. Lisa Wang', initials: 'LW', color: '#8b5cf6' },
    downloadCount: 734, viewCount: 2100, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '10.5281/zenodo.1453456',
    gradient: TYPE_GRADIENTS.dataset,
    relatedIds: ['r6', 'r7', 'r17'],
    versions: [
      { version: 'v2.0', date: '2025-01-08', author: 'Dr. Lisa Wang', changes: 'Added ADMET predictions' },
      { version: 'v1.0', date: '2024-12-25', author: 'Dr. Lisa Wang', changes: 'Initial collection' },
    ],
  },
  {
    id: 'r14', title: 'Chromatin Immunoprecipitation SOP',
    description: 'Detailed ChIP-seq protocol covering cell fixation, chromatin shearing, immunoprecipitation and library preparation.',
    type: 'protocol', tags: ['Biology', 'Experimental'],
    fileSize: '800 KB', uploadDate: '2024-12-22', modifiedDate: '2025-01-06',
    uploader: { id: 'a6', name: 'Dr. Emma Davis', initials: 'ED', color: '#f59e0b' },
    downloadCount: 198, viewCount: 650, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: TYPE_GRADIENTS.protocol,
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
    uploader: { id: 'a3', name: 'Dr. Michael Ross', initials: 'MR', color: '#ef4444' },
    downloadCount: 289, viewCount: 980, favorite: false,
    status: 'Published', license: 'GPL-3.0', doi: '',
    gradient: TYPE_GRADIENTS.code,
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
    uploader: { id: 'a7', name: 'Dr. Sophie Martin', initials: 'SM', color: '#ec4899' },
    downloadCount: 98, viewCount: 540, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1453789',
    gradient: TYPE_GRADIENTS.image,
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
    uploader: { id: 'a8', name: 'Dr. Ana Silva', initials: 'AS', color: '#a855f7' },
    downloadCount: 167, viewCount: 620, favorite: false,
    status: 'Draft', license: 'MIT', doi: '',
    gradient: TYPE_GRADIENTS.code,
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
    uploader: { id: 'a4', name: 'Dr. James Park', initials: 'JP', color: '#14b8a6' },
    downloadCount: 445, viewCount: 1560, favorite: true,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.5281/zenodo.1454012',
    gradient: TYPE_GRADIENTS.dataset,
    relatedIds: ['r12', 'r10'],
    versions: [
      { version: 'v1.5', date: '2025-01-07', author: 'Dr. James Park', changes: 'Added Year 3 follow-up data' },
      { version: 'v1.0', date: '2024-12-10', author: 'Dr. James Park', changes: 'Initial release' },
    ],
  },
  {
    id: 'r19', title: 'Metabolomics Workflow Script',
    description: 'Automated LC-MS metabolomics data processing pipeline with peak detection and pathway analysis.',
    type: 'code', tags: ['Chemistry', 'Statistics'],
    fileSize: '15 MB', uploadDate: '2024-12-08', modifiedDate: '2025-01-01',
    uploader: { id: 'a8', name: 'Dr. Ana Silva', initials: 'AS', color: '#a855f7' },
    downloadCount: 134, viewCount: 480, favorite: false,
    status: 'Under Review', license: 'MIT', doi: '',
    gradient: TYPE_GRADIENTS.code,
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
    uploader: { id: 'a7', name: 'Dr. Sophie Martin', initials: 'SM', color: '#ec4899' },
    downloadCount: 89, viewCount: 380, favorite: false,
    status: 'Published', license: '', doi: '',
    gradient: TYPE_GRADIENTS.presentation,
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
    uploader: { id: 'a6', name: 'Dr. Emma Davis', initials: 'ED', color: '#f59e0b' },
    downloadCount: 523, viewCount: 2100, favorite: false,
    status: 'Published', license: 'MIT', doi: '',
    gradient: TYPE_GRADIENTS.note,
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
    uploader: { id: 'a4', name: 'Dr. James Park', initials: 'JP', color: '#14b8a6' },
    downloadCount: 312, viewCount: 890, favorite: false,
    status: 'Published', license: 'CC-BY-SA 4.0', doi: '',
    gradient: TYPE_GRADIENTS.protocol,
    relatedIds: ['r4', 'r14'],
    versions: [
      { version: 'v1.2', date: '2025-01-04', author: 'Dr. James Park', changes: 'Optimized reduction conditions' },
      { version: 'v1.0', date: '2024-11-28', author: 'Dr. James Park', changes: 'Initial protocol' },
    ],
  },
  {
    id: 'r23', title: 'Clinical Trial Data Summary',
    description: 'Anonymized summary data from Phase II clinical trial with efficacy endpoints and safety profiles.',
    type: 'dataset', tags: ['Statistics', 'Biology'],
    fileSize: '120 MB', uploadDate: '2024-11-25', modifiedDate: '2025-01-02',
    uploader: { id: 'a8', name: 'Dr. Ana Silva', initials: 'AS', color: '#a855f7' },
    downloadCount: 178, viewCount: 560, favorite: false,
    status: 'Draft', license: '', doi: '',
    gradient: TYPE_GRADIENTS.dataset,
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
    uploader: { id: 'a1', name: 'Dr. Sarah Chen', initials: 'SC', color: '#10b981' },
    downloadCount: 356, viewCount: 1340, favorite: false,
    status: 'Published', license: 'CC-BY 4.0', doi: '10.1101/2024.11.20.567890',
    gradient: TYPE_GRADIENTS.paper,
    relatedIds: ['r21', 'r4'],
    versions: [
      { version: 'v1.0', date: '2024-12-28', author: 'Dr. Sarah Chen', changes: 'Final publication version' },
    ],
  },
]

// ─── Main Component ─────────────────────────────────────────────

export default function ResourceLibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null)
  const [resources, setResources] = useState<ResourceItem[]>(MOCK_RESOURCES)
  const [isDragging, setIsDragging] = useState(false)

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setResources(prev => prev.map(r =>
      r.id === id ? { ...r, favorite: !r.favorite } : r
    ))
  }, [])

  const filteredResources = useMemo(() => {
    let result = [...resources]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    if (selectedTypes.size > 0) {
      result = result.filter(r => selectedTypes.has(r.type))
    }

    if (selectedTags.size > 0) {
      result = result.filter(r => r.tags.some(t => selectedTags.has(t)))
    }

    if (favoritesOnly) {
      result = result.filter(r => r.favorite)
    }

    if (dateRange !== 'all') {
      const now = new Date()
      let cutoff: Date
      switch (dateRange) {
        case '7days': cutoff = new Date(now.getTime() - 7 * 86400000); break
        case '30days': cutoff = new Date(now.getTime() - 30 * 86400000); break
        case '3months': cutoff = new Date(now.getTime() - 90 * 86400000); break
        default: cutoff = new Date(0)
      }
      result = result.filter(r => new Date(r.uploadDate) >= cutoff)
    }

    switch (sortKey) {
      case 'newest': result.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()); break
      case 'name': result.sort((a, b) => a.title.localeCompare(b.title)); break
      case 'downloads': result.sort((a, b) => b.downloadCount - a.downloadCount); break
      case 'size': result.sort((a, b) => parseSize(b.fileSize) - parseSize(a.fileSize)); break
    }

    return result
  }, [resources, searchQuery, selectedTypes, selectedTags, favoritesOnly, dateRange, sortKey])

  const stats = useMemo(() => {
    const total = resources.length
    const papers = resources.filter(r => r.type === 'paper').length
    const datasets = resources.filter(r => r.type === 'dataset').length
    return { total, papers, datasets }
  }, [resources])

  return (
    <div className="rl-container">
      {/* Header */}
      <header className="rl-header">
        <div style={{ maxWidth: 1600, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}>
              <Library size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{
                fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, var(--vl-text-primary), var(--vl-accent))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Resource Library</h1>
              <p style={{ fontSize: 13, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
                Manage and organize your research assets
              </p>
            </div>
          </div>

          <div className="rl-header-actions">
            <div className="rl-search-box">
              <Search size={15} style={{ color: 'var(--vl-text-muted)', flexShrink: 0 }} />
              <input
                placeholder="Search resources by name, type, or tag..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', fontSize: 13, color: 'var(--vl-text-primary)' }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--vl-text-muted)', padding: 2,
                }}>
                  <X size={14} />
                </button>
              )}
            </div>

            <button className="rl-upload-btn" onClick={() => {}}>
              <Upload size={15} />
              Upload Resource
            </button>

            <div className="rl-view-toggle">
              <button className={viewMode === 'grid' ? 'rl-view-active' : ''} onClick={() => setViewMode('grid')}>
                <Grid3X3 size={16} />
              </button>
              <button className={viewMode === 'list' ? 'rl-view-active' : ''} onClick={() => setViewMode('list')}>
                <List size={16} />
              </button>
            </div>
          </div>

          <div className="rl-quick-stats">
            {[
              { label: `${stats.total} Resources`, color: '#10b981', icon: <FolderOpen size={14} /> },
              { label: `${stats.papers} Papers`, color: '#06b6d4', icon: <FileText size={14} /> },
              { label: `${stats.datasets} Datasets`, color: '#8b5cf6', icon: <Database size={14} /> },
              { label: '2.4 GB Used', color: '#f59e0b', icon: <HardDrive size={14} /> },
            ].map(stat => (
              <div key={stat.label} className="rl-stat-pill" style={{
                background: `${stat.color}10`, border: `1px solid ${stat.color}25`, color: stat.color,
              }}>
                {stat.icon}
                {stat.label}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="rl-main-layout">
        {/* Sidebar */}
        <aside className={`rl-sidebar ${sidebarOpen ? '' : 'rl-sidebar-collapsed'}`} style={{ position: 'relative' }}>
          {sidebarOpen && (
            <button className="rl-sidebar-toggle" onClick={() => setSidebarOpen(false)} style={{ right: -14 }}>
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Resource Types */}
          <div className="rl-filter-section">
            <div className="rl-filter-title">Resource Types</div>
            {ALL_TYPES.map(type => (
              <div key={type} className={`rl-filter-item ${selectedTypes.has(type) ? 'rl-filter-active' : ''}`}
                onClick={() => toggleType(type)}>
                <span style={{ display: 'flex', color: 'var(--vl-text-muted)' }}>
                  {TYPE_ICONS[type]}
                </span>
                <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                <span className="rl-filter-count">{resources.filter(r => r.type === type).length}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="rl-filter-section">
            <div className="rl-filter-title">Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {ALL_TAGS.map(tag => (
                <span key={tag} className={`rl-tag-chip ${selectedTags.has(tag) ? 'rl-tag-active' : ''}`}
                  onClick={() => toggleTag(tag)}>
                  <Tag size={10} style={{ marginRight: 3 }} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="rl-filter-section">
            <div className="rl-filter-title">Date Range</div>
            {([['7days', 'Last 7 days'], ['30days', 'Last 30 days'], ['3months', 'Last 3 months'], ['all', 'All time']] as [DateRange, string][]).map(([val, label]) => (
              <div key={val} className={`rl-filter-item ${dateRange === val ? 'rl-filter-active' : ''}`}
                onClick={() => setDateRange(val)}>
                <Calendar size={14} />
                {label}
              </div>
            ))}
          </div>

          {/* Storage */}
          <div className="rl-filter-section">
            <div className="rl-filter-title">Storage</div>
            <div className="rl-storage-bar-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--vl-text-secondary)' }}>
                <span>2.4 GB used</span>
                <span>10 GB</span>
              </div>
              <div className="rl-storage-bar">
                <div className="rl-storage-bar-fill" style={{ width: '24%' }} />
              </div>
            </div>
          </div>

          {/* Favorites */}
          <div className="rl-filter-section">
            <div className={`rl-favorites-toggle ${favoritesOnly ? 'rl-fav-active' : ''}`}
              onClick={() => setFavoritesOnly(!favoritesOnly)}>
              <Heart size={15} fill={favoritesOnly ? '#f59e0b' : 'none'} />
              {favoritesOnly ? 'Showing Favorites' : 'Show Favorites'}
            </div>
          </div>
        </aside>

        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} style={{
            position: 'absolute', left: 12, top: 12, zIndex: 10,
            width: 32, height: 32, borderRadius: 8,
            border: '1px solid var(--vl-border)', background: 'var(--vl-bg-card)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--vl-text-muted)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <ChevronRight size={14} />
          </button>
        )}

        {/* Content */}
        <main className="rl-content-area">
          {/* Sort Bar */}
          <div className="rl-sort-bar">
            <span className="rl-sort-label">{filteredResources.length} resources found</span>
            <div className="rl-sort-options">
              {([['newest', 'Newest'], ['name', 'Name'], ['size', 'Size'], ['downloads', 'Most Downloaded']] as [SortKey, string][]).map(([key, label]) => (
                <button key={key} className={`rl-sort-btn ${sortKey === key ? 'rl-sort-active' : ''}`}
                  onClick={() => setSortKey(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="rl-resource-grid">
              {filteredResources.map((resource, idx) => (
                <div key={resource.id} className={`rl-card ${TYPE_CLASSES[resource.type]}`}
                  style={{ animation: `rl-card-enter 0.3s ease ${idx * 0.03}s both` }}
                  onClick={() => setSelectedResource(resource)}>
                  <div className="rl-card-thumb" style={{ background: resource.gradient }}>
                    <div className="rl-card-thumb-icon">
                      {TYPE_ICONS[resource.type]}
                    </div>
                  </div>
                  <div className="rl-card-body">
                    <h3 className="rl-card-title">{resource.title}</h3>
                    <p className="rl-card-desc">{resource.description}</p>
                    <div className="rl-card-tags">
                      {resource.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="rl-card-tag">{tag}</span>
                      ))}
                    </div>
                    <div className="rl-card-meta">
                      <div className="rl-card-meta-left">
                        <span className="rl-avatar" style={{ background: resource.uploader.color }}>
                          {resource.uploader.initials}
                        </span>
                        <span>{resource.fileSize}</span>
                      </div>
                      <div className="rl-card-meta-right">
                        <span className="rl-card-stat"><Download size={11} />{resource.downloadCount}</span>
                        <span className="rl-card-stat"><Eye size={11} />{resource.viewCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rl-card-footer">
                    <span className={`rl-card-status ${STATUS_CLASSES[resource.status] || ''}`}>
                      {resource.status}
                    </span>
                    <button className={`rl-fav-btn ${resource.favorite ? 'rl-fav-active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorite(resource.id) }}>
                      <Star size={16} fill={resource.favorite ? '#f59e0b' : 'none'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="rl-resource-list">
              {filteredResources.map((resource, idx) => (
                <div key={resource.id} className="rl-list-row"
                  style={{ animation: `rl-card-enter 0.25s ease ${idx * 0.02}s both` }}
                  onClick={() => setSelectedResource(resource)}>
                  <div className="rl-list-icon" style={{ background: resource.gradient }}>
                    {React.cloneElement(TYPE_ICONS[resource.type] as React.ReactElement, { size: 18 })}
                  </div>
                  <div className="rl-list-info">
                    <h4 className="rl-list-title">{resource.title}</h4>
                    <p className="rl-list-subtitle">{resource.tags.join(', ')} &middot; {resource.uploader.name}</p>
                  </div>
                  <div className="rl-list-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Download size={12} /> {resource.downloadCount}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Eye size={12} /> {resource.viewCount}
                    </span>
                    <span>{resource.fileSize}</span>
                    <span className={`rl-card-status ${STATUS_CLASSES[resource.status] || ''}`} style={{ fontSize: 10 }}>
                      {resource.status}
                    </span>
                    <button className={`rl-fav-btn ${resource.favorite ? 'rl-fav-active' : ''}`}
                      onClick={e => { e.stopPropagation(); toggleFavorite(resource.id) }}>
                      <Star size={15} fill={resource.favorite ? '#f59e0b' : 'none'} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Zone */}
          <div className="rl-upload-zone"
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => { e.preventDefault(); setIsDragging(false) }}
            onClick={() => {}}
            style={isDragging ? { borderColor: 'var(--vl-accent)' } : {}}>
            <div className="rl-upload-zone-icon">
              <Upload size={28} />
            </div>
            <p className="rl-upload-zone-title">Drag and drop files here</p>
            <p className="rl-upload-zone-desc">or click to browse. Supports PDF, CSV, JSON, images, and code files up to 5 GB.</p>
          </div>
        </main>
      </div>

      {/* Detail Modal */}
      {selectedResource && (
        <div className="rl-modal-overlay" onClick={() => setSelectedResource(null)}>
          <div className="rl-modal" onClick={e => e.stopPropagation()}>
            <div className="rl-modal-header">
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedResource.title}</h2>
                <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '4px 0 0' }}>
                  {selectedResource.type.charAt(0).toUpperCase() + selectedResource.type.slice(1)} &middot; {selectedResource.status}
                </p>
              </div>
              <button className="rl-modal-close" onClick={() => setSelectedResource(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="rl-modal-body">
              {/* Preview */}
              <div className="rl-modal-preview" style={{ background: selectedResource.gradient }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)',
                }}>
                  {TYPE_ICONS[selectedResource.type]}
                </div>
              </div>

              {/* Metadata Table */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Metadata</h3>
                <table className="rl-meta-table">
                  <tbody>
                    <tr><td>Title</td><td>{selectedResource.title}</td></tr>
                    <tr><td>Type</td><td>{selectedResource.type.charAt(0).toUpperCase() + selectedResource.type.slice(1)}</td></tr>
                    <tr><td>Size</td><td>{selectedResource.fileSize}</td></tr>
                    <tr><td>Created</td><td>{selectedResource.uploadDate}</td></tr>
                    <tr><td>Modified</td><td>{selectedResource.modifiedDate}</td></tr>
                    <tr><td>Author</td><td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="rl-avatar" style={{ background: selectedResource.uploader.color, width: 18, height: 18, fontSize: 8 }}>
                          {selectedResource.uploader.initials}
                        </span>
                        {selectedResource.uploader.name}
                      </span>
                    </td></tr>
                    <tr><td>License</td><td>{selectedResource.license || 'Not specified'}</td></tr>
                    <tr><td>DOI / URL</td><td>{selectedResource.doi ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--vl-accent)' }}>
                        {selectedResource.doi} <ExternalLink size={12} />
                      </span>
                    ) : 'Not available'}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                <button className="rl-action-btn"><Download size={14} /> Download</button>
                <button className="rl-action-btn"><Share2 size={14} /> Share</button>
                <button className="rl-action-btn"><Copy size={14} /> Duplicate</button>
                <button className="rl-action-btn"><Archive size={14} /> Archive</button>
                <button className="rl-action-btn rl-action-danger"><Trash2 size={14} /> Delete</button>
              </div>

              {/* Related Resources */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Related Resources</h3>
                <div className="rl-related-grid">
                  {selectedResource.relatedIds.map(relId => {
                    const rel = resources.find(r => r.id === relId)
                    if (!rel) return null
                    return (
                      <div key={rel.id} className="rl-related-card" onClick={() => setSelectedResource(rel)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{
                            width: 28, height: 28, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', background: rel.gradient, fontSize: 14,
                          }}>
                            {TYPE_ICONS[rel.type]}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {rel.title}
                          </span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>{rel.fileSize} &middot; {rel.type}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Version History */}
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Version History</h3>
                {selectedResource.versions.map((ver, idx) => (
                  <div key={ver.version} className="rl-version-item">
                    <div className="rl-version-dot" style={{
                      background: idx === 0 ? 'var(--vl-accent)' : 'var(--vl-text-muted)',
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ver.version}</div>
                      <div style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>
                        {ver.author} &middot; {ver.date}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--vl-text-secondary)', marginTop: 2 }}>{ver.changes}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────

function parseSize(size: string): number {
  const num = parseFloat(size)
  if (size.includes('GB')) return num * 1024
  if (size.includes('MB')) return num
  if (size.includes('KB')) return num / 1024
  return num
}
