'use client'

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import {
  GitBranch, Plus, Play, Pause, SkipForward, FastForward,
  Download, Rocket, ChevronRight, ChevronLeft, X,
  Settings, Activity, Cpu, MemoryStick, Monitor,
  Database, Brain, FlaskConical, Shield, BarChart3, Eye,
  Gauge, AlertTriangle, CheckCircle2, Clock, Loader2,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────

interface PipelineLog {
  time: string
  level: string
  message: string
}

interface PipelineRun {
  time: string
  status: string
  duration: string
}

interface PipelineNode {
  id: string
  title: string
  type: 'input' | 'processing' | 'model' | 'validation' | 'output' | 'monitor'
  status: 'Idle' | 'Running' | 'Error' | 'Done'
  description: string
  config: Record<string, string | number | boolean>
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  logs: PipelineLog[]
  runHistory: PipelineRun[]
}

interface PipelineConnection {
  id: string
  source: string
  target: string
  dataFormat: string
  transformRule: string
}

interface ThroughputPoint {
  hour: string
  processed: number
}

interface ErrorRatePoint {
  hour: string
  rate: number
}

// ─── Constants ──────────────────────────────────────────────────

const NODE_ICONS: Record<string, React.ReactNode> = {
  input: <Database size={18} />,
  processing: <FlaskConical size={18} />,
  model: <Brain size={18} />,
  validation: <Shield size={18} />,
  output: <BarChart3 size={18} />,
  monitor: <Eye size={18} />,
}

const NODE_TYPE_LABELS: Record<string, string> = {
  input: 'Input',
  processing: 'Processing',
  model: 'Model',
  validation: 'Validation',
  output: 'Output',
  monitor: 'Monitor',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  Idle: <Clock size={10} />,
  Running: <Loader2 size={10} className="pe-spin-icon" />,
  Error: <AlertTriangle size={10} />,
  Done: <CheckCircle2 size={10} />,
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  n1: { x: 400, y: 60 },
  n2: { x: 400, y: 190 },
  n3: { x: 400, y: 320 },
  n4: { x: 400, y: 450 },
  n5: { x: 400, y: 580 },
  n6: { x: 400, y: 710 },
  n7: { x: 400, y: 840 },
  n8: { x: 400, y: 970 },
}

const NODES: PipelineNode[] = [
  {
    id: 'n1', title: 'Data Source', type: 'input', status: 'Done',
    description: 'Connects to external databases and APIs to fetch raw training data',
    config: { source: 'UniProt API', format: 'JSON', batchSize: 1000, retryAttempts: 3 },
    inputSchema: { endpoint: 'string', auth: 'string' },
    outputSchema: { records: 'array', metadata: 'object' },
    logs: [
      { time: '14:32:01', level: 'INFO', message: 'Connected to UniProt API successfully' },
      { time: '14:32:05', level: 'INFO', message: 'Fetched batch 1 of 50 (1000 records)' },
      { time: '14:33:45', level: 'INFO', message: 'All 50 batches completed' },
      { time: '14:33:46', level: 'INFO', message: 'Total records: 50,000' },
    ],
    runHistory: [
      { time: '14:30', status: 'Success', duration: '3m 46s' },
      { time: '12:00', status: 'Success', duration: '3m 52s' },
      { time: '09:30', status: 'Success', duration: '4m 01s' },
      { time: '06:00', status: 'Failed', duration: '1m 23s' },
      { time: '03:00', status: 'Success', duration: '3m 48s' },
    ],
  },
  {
    id: 'n2', title: 'Preprocessing', type: 'processing', status: 'Done',
    description: 'Cleans, normalizes, and transforms raw data into model-ready format',
    config: { normalize: true, removeDuplicates: true, fillMissing: 'mean', encoding: 'one-hot' },
    inputSchema: { rawRecords: 'array' },
    outputSchema: { cleanRecords: 'array', stats: 'object' },
    logs: [
      { time: '14:33:50', level: 'INFO', message: 'Starting preprocessing on 50,000 records' },
      { time: '14:34:02', level: 'WARN', message: 'Found 234 duplicate entries, removing' },
      { time: '14:34:25', level: 'INFO', message: 'Output: 49,766 clean records' },
    ],
    runHistory: [
      { time: '14:33', status: 'Success', duration: '35s' },
      { time: '12:03', status: 'Success', duration: '38s' },
      { time: '09:34', status: 'Success', duration: '33s' },
      { time: '06:05', status: 'Failed', duration: '8s' },
      { time: '03:03', status: 'Success', duration: '36s' },
    ],
  },
  {
    id: 'n3', title: 'Feature Extraction', type: 'processing', status: 'Done',
    description: 'Extracts relevant features using PCA and domain-specific transformations',
    config: { method: 'PCA+Custom', nComponents: 256, windowSize: 10, stride: 5 },
    inputSchema: { cleanRecords: 'array' },
    outputSchema: { features: 'matrix', importance: 'array' },
    logs: [
      { time: '14:34:30', level: 'INFO', message: 'Extracting features using PCA' },
      { time: '14:34:55', level: 'INFO', message: 'PCA explained variance: 94.2%' },
      { time: '14:35:15', level: 'INFO', message: 'Total feature dimensions: 384' },
    ],
    runHistory: [
      { time: '14:34', status: 'Success', duration: '45s' },
      { time: '12:04', status: 'Success', duration: '48s' },
      { time: '09:35', status: 'Success', duration: '42s' },
      { time: '06:06', status: 'Failed', duration: '5s' },
      { time: '03:04', status: 'Success', duration: '44s' },
    ],
  },
  {
    id: 'n4', title: 'Model Training', type: 'model', status: 'Running',
    description: 'Trains the deep learning model on extracted features with hyperparameter optimization',
    config: { architecture: 'Transformer', epochs: 100, batchSize: 64, learningRate: 0.001, optimizer: 'AdamW' },
    inputSchema: { features: 'matrix', labels: 'array' },
    outputSchema: { modelPath: 'string', metrics: 'object' },
    logs: [
      { time: '14:35:20', level: 'INFO', message: 'Initializing Transformer model (8 layers, 12 heads)' },
      { time: '14:35:25', level: 'INFO', message: 'Starting training (Epoch 1/100)' },
      { time: '14:37:10', level: 'INFO', message: 'Epoch 10/100 - Loss: 0.342' },
      { time: '14:41:00', level: 'INFO', message: 'Epoch 30/100 - Loss: 0.145' },
    ],
    runHistory: [
      { time: '14:35', status: 'Running', duration: '6m 12s' },
      { time: '12:05', status: 'Success', duration: '12m 45s' },
      { time: '09:36', status: 'Success', duration: '11m 58s' },
      { time: '06:07', status: 'Failed', duration: '3m 21s' },
      { time: '03:05', status: 'Success', duration: '12m 30s' },
    ],
  },
  {
    id: 'n5', title: 'Validation', type: 'validation', status: 'Idle',
    description: 'Validates model performance on held-out test set with comprehensive metrics',
    config: { testSet: 'held-out-20%', metrics: 'accuracy,f1,precision,recall,auc', crossValidate: true },
    inputSchema: { modelPath: 'string', testFeatures: 'matrix' },
    outputSchema: { metrics: 'object', confusionMatrix: 'array' },
    logs: [
      { time: '12:18', level: 'INFO', message: 'Running predictions on test set (9,953 records)' },
      { time: '12:19', level: 'INFO', message: 'Accuracy: 96.8%, F1: 0.957, AUC: 0.991' },
    ],
    runHistory: [
      { time: '12:18', status: 'Success', duration: '58s' },
      { time: '09:48', status: 'Success', duration: '1m 02s' },
      { time: '06:20', status: 'Failed', duration: '12s' },
      { time: '03:18', status: 'Success', duration: '55s' },
      { time: '00:18', status: 'Success', duration: '1m 01s' },
    ],
  },
  {
    id: 'n6', title: 'Post-processing', type: 'processing', status: 'Idle',
    description: 'Post-processes model outputs including calibration, formatting, and quality checks',
    config: { calibrate: true, format: 'standardized', qualityThreshold: 0.95, outlierRemoval: true },
    inputSchema: { rawPredictions: 'array' },
    outputSchema: { processedPredictions: 'array', qualityReport: 'object' },
    logs: [
      { time: '12:20', level: 'INFO', message: 'Calibrating probabilities (Platt scaling)' },
      { time: '12:21', level: 'INFO', message: 'Quality score: 0.987 (above threshold)' },
    ],
    runHistory: [
      { time: '12:20', status: 'Success', duration: '22s' },
      { time: '09:50', status: 'Success', duration: '24s' },
      { time: '06:21', status: 'Failed', duration: '5s' },
      { time: '03:20', status: 'Success', duration: '21s' },
      { time: '00:20', status: 'Success', duration: '23s' },
    ],
  },
  {
    id: 'n7', title: 'Output', type: 'output', status: 'Idle',
    description: 'Exports processed results to databases, dashboards, and downstream systems',
    config: { destination: 'PostgreSQL', dashboard: 'Grafana', format: 'Parquet', compress: true },
    inputSchema: { processedPredictions: 'array' },
    outputSchema: { exportPath: 'string', recordCount: 'number' },
    logs: [
      { time: '12:22', level: 'INFO', message: 'Exporting 49,754 predictions to PostgreSQL' },
      { time: '12:23', level: 'INFO', message: 'Export complete (2.3 GB compressed)' },
    ],
    runHistory: [
      { time: '12:22', status: 'Success', duration: '45s' },
      { time: '09:52', status: 'Success', duration: '48s' },
      { time: '06:23', status: 'Failed', duration: '10s' },
      { time: '03:22', status: 'Success', duration: '42s' },
      { time: '00:22', status: 'Success', duration: '44s' },
    ],
  },
  {
    id: 'n8', title: 'Monitoring', type: 'monitor', status: 'Running',
    description: 'Continuously monitors pipeline health, data quality, and sends alerts on anomalies',
    config: { alertThreshold: 'error-rate > 5%', checkInterval: '60s', notifications: 'Slack,Email' },
    inputSchema: { pipelineMetrics: 'object' },
    outputSchema: { alerts: 'array', healthScore: 'number' },
    logs: [
      { time: '14:35:30', level: 'INFO', message: 'Health check: all nodes operational' },
      { time: '14:37:30', level: 'INFO', message: 'GPU utilization at 87%' },
      { time: '14:38:30', level: 'WARN', message: 'GPU temperature approaching threshold (78C)' },
    ],
    runHistory: [
      { time: '14:35', status: 'Running', duration: 'ongoing' },
      { time: '12:00', status: 'Success', duration: 'ongoing' },
      { time: '09:00', status: 'Success', duration: 'ongoing' },
      { time: '06:00', status: 'Success', duration: 'ongoing' },
      { time: '03:00', status: 'Success', duration: 'ongoing' },
    ],
  },
]

const CONNECTIONS: PipelineConnection[] = [
  { id: 'c1', source: 'n1', target: 'n2', dataFormat: 'JSON', transformRule: 'Direct passthrough' },
  { id: 'c2', source: 'n2', target: 'n3', dataFormat: 'Parquet', transformRule: 'Column selection + encoding' },
  { id: 'c3', source: 'n3', target: 'n4', dataFormat: 'Tensor (float32)', transformRule: 'Matrix reshaping' },
  { id: 'c4', source: 'n4', target: 'n5', dataFormat: 'Model checkpoint', transformRule: 'Prediction extraction' },
  { id: 'c5', source: 'n5', target: 'n6', dataFormat: 'Validation report', transformRule: 'Filter by threshold' },
  { id: 'c6', source: 'n6', target: 'n7', dataFormat: 'Processed predictions', transformRule: 'Format conversion' },
  { id: 'c7', source: 'n7', target: 'n8', dataFormat: 'Export metrics', transformRule: 'Aggregation' },
]

const THROUGHPUT: ThroughputPoint[] = [
  { hour: '00', processed: 1200 }, { hour: '01', processed: 980 }, { hour: '02', processed: 750 },
  { hour: '03', processed: 320 }, { hour: '04', processed: 180 }, { hour: '05', processed: 250 },
  { hour: '06', processed: 890 }, { hour: '07', processed: 1450 }, { hour: '08', processed: 2100 },
  { hour: '09', processed: 2800 }, { hour: '10', processed: 3200 }, { hour: '11', processed: 3100 },
  { hour: '12', processed: 2900 }, { hour: '13', processed: 2600 }, { hour: '14', processed: 3400 },
  { hour: '15', processed: 3600 }, { hour: '16', processed: 3300 }, { hour: '17', processed: 2800 },
  { hour: '18', processed: 2200 }, { hour: '19', processed: 1800 }, { hour: '20', processed: 1500 },
  { hour: '21', processed: 1100 }, { hour: '22', processed: 800 }, { hour: '23', processed: 600 },
]

const ERROR_RATE: ErrorRatePoint[] = [
  { hour: '00', rate: 1.2 }, { hour: '01', rate: 0.8 }, { hour: '02', rate: 1.5 },
  { hour: '03', rate: 3.8 }, { hour: '04', rate: 5.2 }, { hour: '05', rate: 4.1 },
  { hour: '06', rate: 2.9 }, { hour: '07', rate: 1.8 }, { hour: '08', rate: 1.1 },
  { hour: '09', rate: 0.6 }, { hour: '10', rate: 0.4 }, { hour: '11', rate: 0.5 },
  { hour: '12', rate: 0.8 }, { hour: '13', rate: 1.0 }, { hour: '14', rate: 0.3 },
  { hour: '15', rate: 0.5 }, { hour: '16', rate: 0.7 }, { hour: '17', rate: 1.2 },
  { hour: '18', rate: 1.8 }, { hour: '19', rate: 2.1 }, { hour: '20', rate: 1.5 },
  { hour: '21', rate: 1.3 }, { hour: '22', rate: 1.6 }, { hour: '23', rate: 2.0 },
]

// ─── Helper: Connection Path ───────────────────────────────────

function getConnectionPath(sx: number, sy: number, tx: number, ty: number): string {
  const midY = (sy + ty) / 2
  return `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`
}

// ─── Main Component ─────────────────────────────────────────────

export default function PipelineEditorPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [speed, setSpeed] = useState(50)
  const [currentStep, setCurrentStep] = useState(3)
  const canvasRef = useRef<HTMLDivElement>(null)

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    return NODES.find(n => n.id === selectedNodeId) || null
  }, [selectedNodeId])

  const connectionsSvg = useMemo(() => {
    const nodeW = 220
    const nodeH = 72
    return CONNECTIONS.map(conn => {
      const srcPos = NODE_POSITIONS[conn.source]
      const tgtPos = NODE_POSITIONS[conn.target]
      if (!srcPos || !tgtPos) return null

      const sx = srcPos.x + nodeW / 2
      const sy = srcPos.y + nodeH
      const tx = tgtPos.x + nodeW / 2
      const ty = tgtPos.y

      const path = getConnectionPath(sx, sy, tx, ty)

      const srcNode = NODES.find(n => n.id === conn.source)
      const isFlowing = srcNode?.status === 'Running' || srcNode?.status === 'Done'

      return (
        <g key={conn.id}>
          <path d={path} className="pe-connection-path"
            style={{ '--pe-conn-color': '#8b5cf6' } as React.CSSProperties}
            strokeDasharray="6,4" />
          {isFlowing && (
            <circle r="3" fill="#8b5cf6" opacity="0.8">
              <animateMotion dur="2s" repeatCount="indefinite" path={path} />
            </circle>
          )}
          <circle r="3" fill="#8b5cf6" opacity="0.6" style={{ transformOrigin: 'center' }}>
            <animateMotion dur="2s" repeatCount="indefinite" path={path} begin="1s" />
          </circle>
        </g>
      )
    })
  }, [])

  const throughputChart = useMemo(() => {
    const chartW = 500
    const chartH = 100
    const padL = 35
    const padR = 10
    const padT = 10
    const padB = 20
    const innerW = chartW - padL - padR
    const innerH = chartH - padT - padB
    const maxVal = Math.max(...THROUGHPUT.map(d => d.processed))

    const areaPoints = THROUGHPUT.map((d, i) => {
      const x = padL + (i / (THROUGHPUT.length - 1)) * innerW
      const y = padT + innerH - (d.processed / maxVal) * innerH
      return `${x},${y}`
    })

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="pe-throughput-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 1000, 2000, 3000, 4000].map(val => {
          const y = padT + innerH - (val / maxVal) * innerH
          return (
            <React.Fragment key={`grid-${val}`}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y}
                stroke="var(--vl-border)" strokeWidth="0.5" strokeDasharray="3,3" />
              <text x={padL - 4} y={y + 3} textAnchor="end"
                fill="var(--vl-text-muted)" fontSize="8">{val}</text>
            </React.Fragment>
          )
        })}
        <polygon points={`${padL},${chartH - padB} ${areaPoints.join(' ')} ${chartW - padR},${chartH - padB}`}
          fill="url(#pe-throughput-grad)" />
        <polyline points={areaPoints.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {THROUGHPUT.map((d, i) => {
          const x = padL + (i / (THROUGHPUT.length - 1)) * innerW
          const y = padT + innerH - (d.processed / maxVal) * innerH
          return <circle key={d.hour} cx={x} cy={y} r={2} fill="#8b5cf6" stroke="var(--vl-bg-card)" strokeWidth={1} />
        })}
      </svg>
    )
  }, [])

  const errorRateChart = useMemo(() => {
    const chartW = 500
    const chartH = 100
    const padL = 35
    const padR = 10
    const padT = 10
    const padB = 20
    const innerW = chartW - padL - padR
    const innerH = chartH - padT - padB
    const maxVal = 6

    const points = ERROR_RATE.map((d, i) => {
      const x = padL + (i / (ERROR_RATE.length - 1)) * innerW
      const y = padT + innerH - (d.rate / maxVal) * innerH
      return `${x},${y}`
    })

    return (
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', height: 'auto' }}>
        <line x1={padL} y1={padT + innerH - (5 / maxVal) * innerH} x2={chartW - padR}
          y2={padT + innerH - (5 / maxVal) * innerH}
          stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5" />
        <text x={chartW - padR} y={padT + innerH - (5 / maxVal) * innerH - 3} textAnchor="end"
          fill="#ef4444" fontSize="8" opacity="0.7">5% threshold</text>
        <polyline points={points.join(' ')} fill="none" stroke="#ef4444" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
        {ERROR_RATE.map((d, i) => {
          const x = padL + (i / (ERROR_RATE.length - 1)) * innerW
          const y = padT + innerH - (d.rate / maxVal) * innerH
          const isOver = d.rate > 5
          return (
            <circle key={d.hour} cx={x} cy={y} r={isOver ? 3 : 2}
              fill={isOver ? '#ef4444' : '#f59e0b'} stroke="var(--vl-bg-card)" strokeWidth={1} />
          )
        })}
      </svg>
    )
  }, [])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(prev => prev === nodeId ? null : nodeId)
  }, [])

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleStepThrough = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, NODES.length))
  }, [])

  return (
    <div className="pe-container">
      {/* Header */}
      <header className="pe-header">
        <div className="pe-header-left">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
          }}>
            <GitBranch size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.5px',
              background: 'linear-gradient(135deg, var(--vl-text-primary), #8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Pipeline Editor</h1>
            <p style={{ fontSize: 12, color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>
              Visual data pipeline editor &mdash; 8 nodes &middot; 7 connections
            </p>
          </div>
        </div>
        <div className="pe-header-right">
          <select className="pe-pipeline-select" defaultValue="pipe-1">
            <option value="pipe-1">ML Training Pipeline v2.3</option>
            <option value="pipe-2">Data Ingestion Pipeline</option>
            <option value="pipe-3">Analysis Pipeline v1.5</option>
          </select>
          <button className="pe-new-pipeline-btn">
            <Plus size={15} />
            New Pipeline
          </button>
        </div>
      </header>

      {/* Workspace */}
      <div className="pe-workspace">
        {/* Canvas */}
        <div className="pe-canvas-container" ref={canvasRef}>
          <div className="pe-canvas">
            {/* Connections SVG layer */}
            <svg className="pe-connections-layer" width="100%" height="1100"
              viewBox="0 0 1020 1100" preserveAspectRatio="xMidYMid meet">
              {connectionsSvg}
            </svg>

            {/* Nodes */}
            <div className="pe-canvas-flow">
              {NODES.map((node, idx) => {
                const pos = NODE_POSITIONS[node.id]
                const typeClass = `pe-node-type-${node.type}`
                const statusClass = `pe-node-status-${node.status.toLowerCase()}`
                const isSelected = selectedNodeId === node.id

                return (
                  <div key={node.id}
                    className={`pe-node ${typeClass} ${isSelected ? 'pe-node-selected' : ''}`}
                    style={{
                      position: 'absolute',
                      left: pos.x - 110,
                      top: pos.y,
                      animation: `pe-node-enter 0.4s ease ${idx * 0.08}s both`,
                    }}
                    onClick={() => handleNodeClick(node.id)}>
                    {/* Status badge */}
                    <span className={`pe-node-status ${statusClass}`}>
                      {STATUS_ICONS[node.status]}
                      {' '}{node.status}
                    </span>

                    {/* Input port */}
                    {node.id !== 'n1' && (
                      <div className="pe-port pe-port-input" style={{ borderColor: undefined }} />
                    )}

                    {/* Output port */}
                    {node.id !== 'n8' && (
                      <div className="pe-port pe-port-output" />
                    )}

                    <div className="pe-node-header">
                      <div className="pe-node-icon">
                        {NODE_ICONS[node.type]}
                      </div>
                      <div className="pe-node-info">
                        <h3 className="pe-node-title">{node.title}</h3>
                        <p className="pe-node-type-label">{NODE_TYPE_LABELS[node.type]}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mini Map */}
            <div className="pe-minimap">
              <div className="pe-minimap-content">
                <div className="pe-minimap-viewport" style={{
                  left: '15%', top: '5%', width: '70%', height: '60%',
                }} />
                {NODES.map(node => {
                  const pos = NODE_POSITIONS[node.id]
                  const typeClass = `pe-node-type-${node.type}`
                  return (
                    <div key={node.id}
                      className={`pe-minimap-node ${typeClass}`}
                      style={{
                        left: `${(pos.x - 110 + 110) / 1020 * 100}%`,
                        top: `${pos.y / 1100 * 100}%`,
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Config Panel */}
        <div className={`pe-config-panel ${selectedNode ? '' : 'pe-config-panel-closed'}`}>
          {selectedNode && (
            <>
              <div className="pe-config-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={`pe-node-icon pe-node-type-${selectedNode.type}`}
                    style={{ width: 30, height: 30, borderRadius: 8 }}>
                    {NODE_ICONS[selectedNode.type]}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{selectedNode.title}</h3>
                    <span className={`pe-node-status pe-node-status-${selectedNode.status.toLowerCase()}`}
                      style={{ position: 'static', fontSize: 10 }}>
                      {STATUS_ICONS[selectedNode.status]} {selectedNode.status}
                    </span>
                  </div>
                </div>
                <button className="pe-modal-close" onClick={() => setSelectedNodeId(null)} style={{
                  background: 'var(--vl-bg-secondary)', border: 'none',
                  width: 28, height: 28, borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--vl-text-muted)',
                }}>
                  <X size={14} />
                </button>
              </div>

              {/* Description */}
              <div className="pe-config-section">
                <div className="pe-config-title">Description</div>
                <p style={{ fontSize: 12, color: 'var(--vl-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {selectedNode.description}
                </p>
              </div>

              {/* Parameters */}
              <div className="pe-config-section">
                <div className="pe-config-title">Parameters</div>
                {Object.entries(selectedNode.config).map(([key, val]) => (
                  <div key={key} className="pe-config-field">
                    <label className="pe-config-label">{key}</label>
                    <input className="pe-config-input"
                      defaultValue={typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val)} />
                  </div>
                ))}
              </div>

              {/* Input Schema */}
              <div className="pe-config-section">
                <div className="pe-config-title">Input Schema</div>
                <pre className="pe-config-json">{JSON.stringify(selectedNode.inputSchema, null, 2)}</pre>
              </div>

              {/* Output Schema */}
              <div className="pe-config-section">
                <div className="pe-config-title">Output Schema</div>
                <pre className="pe-config-json">{JSON.stringify(selectedNode.outputSchema, null, 2)}</pre>
              </div>

              {/* Execution Logs */}
              <div className="pe-config-section">
                <div className="pe-config-title">Execution Logs</div>
                {selectedNode.logs.slice(0, 5).map((log, i) => (
                  <div key={i} className="pe-log-entry">
                    <span className="pe-log-time">{log.time}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, flexShrink: 0,
                      color: log.level === 'WARN' ? '#f59e0b' : log.level === 'ERROR' ? '#ef4444' : 'var(--vl-text-muted)',
                      padding: '0 6px', borderRadius: 4,
                      background: log.level === 'WARN' ? 'rgba(245,158,11,0.1)' :
                        log.level === 'ERROR' ? 'rgba(239,68,68,0.1)' : 'var(--vl-bg-secondary)',
                    }}>{log.level}</span>
                    <span className="pe-log-msg">{log.message}</span>
                  </div>
                ))}
              </div>

              {/* Run History */}
              <div className="pe-config-section">
                <div className="pe-config-title">Run History</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                  <span style={{ flex: 1 }}>Status</span>
                  <span>Duration</span>
                </div>
                {selectedNode.runHistory.map((run, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 0', borderBottom: '1px solid var(--vl-border-subtle, rgba(229,231,235,0.3))',
                    fontSize: 12,
                  }}>
                    <span className="pe-log-time">{run.time}</span>
                    <span style={{
                      flex: 1, fontSize: 11, fontWeight: 500,
                      color: run.status === 'Success' ? '#10b981' : run.status === 'Failed' ? '#ef4444' : '#8b5cf6',
                    }}>
                      {run.status === 'Success' && <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />}
                      {run.status === 'Failed' && <AlertTriangle size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />}
                      {run.status === 'Running' && <Loader2 size={11} style={{ display: 'inline', marginRight: 3, verticalAlign: -2 }} />}
                      {run.status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', fontFamily: 'monospace' }}>{run.duration}</span>
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div style={{ padding: 16 }}>
                <button className="pe-save-btn">
                  <Settings size={14} />
                  Save Configuration
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      <div className={`pe-analytics-panel ${analyticsOpen ? 'pe-analytics-open' : 'pe-analytics-closed'}`}>
        <div className="pe-analytics-header">
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Pipeline Analytics</h3>
          <button className="pe-analytics-toggle" onClick={() => setAnalyticsOpen(!analyticsOpen)}>
            <ChevronRight size={14} style={{
              transform: analyticsOpen ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }} />
            {analyticsOpen ? 'Hide Analytics' : 'Show Analytics'}
          </button>
        </div>
        {analyticsOpen && (
          <div className="pe-analytics-grid">
            {/* Throughput */}
            <div className="pe-chart-container">
              <div className="pe-chart-title">Data Processed (24h)</div>
              {throughputChart}
            </div>

            {/* Error Rate */}
            <div className="pe-chart-container">
              <div className="pe-chart-title">Error Rate Trend (24h)</div>
              {errorRateChart}
            </div>

            {/* Resource Usage */}
            <div className="pe-chart-container">
              <div className="pe-chart-title">Resource Usage</div>
              {[
                { label: 'CPU', usage: 72, color: '#8b5cf6' },
                { label: 'Memory', usage: 58, color: '#06b6d4' },
                { label: 'GPU', usage: 87, color: '#10b981' },
              ].map(res => (
                <div key={res.label} className="pe-resource-bar">
                  <div className="pe-resource-label">
                    <span>{res.label}</span>
                    <span>{res.usage}%</span>
                  </div>
                  <div className="pe-resource-track">
                    <div className="pe-resource-fill" style={{
                      width: `${res.usage}%`,
                      background: res.color,
                    }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'var(--vl-text-muted)' }}>
                <span>Success Rate: 91.3%</span>
                <span>Executions Today: 24</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="pe-toolbar">
        <button className="pe-play-btn" onClick={handlePlayToggle}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button className="pe-toolbar-btn" onClick={handleStepThrough}>
          <SkipForward size={14} />
          Step
        </button>

        <div className="pe-step-indicator">
          <FastForward size={14} />
          Step {currentStep} / {NODES.length}
        </div>

        <span className="pe-exec-time">
          <Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          18m 42s
        </span>

        <div style={{ flex: 1 }} />

        <div className="pe-speed-control">
          <span style={{ fontSize: 11, color: 'var(--vl-text-muted)' }}>Speed</span>
          <input type="range" className="pe-speed-slider" min={1} max={100} value={speed}
            onChange={e => setSpeed(Number(e.target.value))} />
          <span style={{ fontSize: 11, color: 'var(--vl-text-muted)', width: 32, textAlign: 'right' }}>{speed}%</span>
        </div>

        <button className="pe-deploy-btn">
          <Rocket size={14} />
          Deploy
        </button>

        <button className="pe-toolbar-btn">
          <Download size={14} />
          Export
        </button>
      </div>
    </div>
  )
}
