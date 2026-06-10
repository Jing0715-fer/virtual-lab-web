import { NextResponse } from 'next/server'

// ─── Types ──────────────────────────────────────────────────────

interface PipelineNode {
  id: string
  title: string
  type: 'input' | 'processing' | 'model' | 'validation' | 'output' | 'monitor'
  status: 'Idle' | 'Running' | 'Error' | 'Done'
  description: string
  config: Record<string, string | number | boolean>
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  logs: { time: string; level: string; message: string }[]
  runHistory: { time: string; status: string; duration: string }[]
}

interface PipelineConnection {
  id: string
  source: string
  target: string
  dataFormat: string
  transformRule: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  nodes: PipelineNode[]
  connections: PipelineConnection[]
}

interface ThroughputPoint {
  hour: string
  processed: number
}

interface ErrorRatePoint {
  hour: string
  rate: number
}

// ─── Mock Data ──────────────────────────────────────────────────

const PIPELINES: Pipeline[] = [
  {
    id: 'pipe-1',
    name: 'ML Training Pipeline v2.3',
    description: 'End-to-end machine learning pipeline for protein structure prediction',
    nodes: [
      {
        id: 'n1', title: 'Data Source', type: 'input', status: 'Done',
        description: 'Connects to external databases and APIs to fetch raw training data',
        config: { source: 'UniProt API', format: 'JSON', batchSize: 1000, retryAttempts: 3 },
        inputSchema: { endpoint: 'string', auth: 'string' },
        outputSchema: { records: 'array', metadata: 'object' },
        logs: [
          { time: '14:32:01', level: 'INFO', message: 'Connected to UniProt API successfully' },
          { time: '14:32:05', level: 'INFO', message: 'Fetched batch 1 of 50 (1000 records)' },
          { time: '14:32:10', level: 'INFO', message: 'Fetched batch 2 of 50' },
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
          { time: '14:34:15', level: 'INFO', message: 'Normalization complete (z-score)' },
          { time: '14:34:20', level: 'INFO', message: 'Missing values filled with column means' },
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
          { time: '14:35:10', level: 'INFO', message: 'Custom domain features added (128)' },
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
          { time: '14:37:10', level: 'INFO', message: 'Epoch 10/100 - Loss: 0.342, Val Loss: 0.356' },
          { time: '14:39:00', level: 'INFO', message: 'Epoch 20/100 - Loss: 0.198, Val Loss: 0.212' },
          { time: '14:41:00', level: 'INFO', message: 'Epoch 30/100 - Loss: 0.145, Val Loss: 0.158 (training...' },
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
        config: { testSet: 'held-out-20%', metrics: ['accuracy', 'f1', 'precision', 'recall', 'auc'], crossValidate: true },
        inputSchema: { modelPath: 'string', testFeatures: 'matrix' },
        outputSchema: { metrics: 'object', confusionMatrix: 'array' },
        logs: [
          { time: '12:18', level: 'INFO', message: 'Loading validation set (9,953 records)' },
          { time: '12:18', level: 'INFO', message: 'Running predictions...' },
          { time: '12:19', level: 'INFO', message: 'Accuracy: 96.8%, F1: 0.957, AUC: 0.991' },
          { time: '12:19', level: 'INFO', message: 'Validation passed all thresholds' },
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
          { time: '12:20', level: 'INFO', message: 'Starting post-processing' },
          { time: '12:20', level: 'INFO', message: 'Calibrating probabilities (Platt scaling)' },
          { time: '12:21', level: 'INFO', message: 'Removed 12 outlier predictions' },
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
          { time: '12:22', level: 'INFO', message: 'Uploading to Grafana dashboard' },
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
        config: { alertThreshold: 'error-rate > 5%', checkInterval: '60s', notifications: ['Slack', 'Email'] },
        inputSchema: { pipelineMetrics: 'object' },
        outputSchema: { alerts: 'array', healthScore: 'number' },
        logs: [
          { time: '14:35:30', level: 'INFO', message: 'Health check: all nodes operational' },
          { time: '14:36:30', level: 'INFO', message: 'Health check: model training in progress' },
          { time: '14:37:30', level: 'INFO', message: 'Health check: GPU utilization at 87%' },
          { time: '14:38:30', level: 'WARN', message: 'GPU temperature approaching threshold (78°C)' },
          { time: '14:39:30', level: 'INFO', message: 'Health check: all systems nominal' },
        ],
        runHistory: [
          { time: '14:35', status: 'Running', duration: 'ongoing' },
          { time: '12:00', status: 'Success', duration: 'ongoing' },
          { time: '09:00', status: 'Success', duration: 'ongoing' },
          { time: '06:00', status: 'Success', duration: 'ongoing' },
          { time: '03:00', status: 'Success', duration: 'ongoing' },
        ],
      },
    ],
    connections: [
      { id: 'c1', source: 'n1', target: 'n2', dataFormat: 'JSON', transformRule: 'Direct passthrough' },
      { id: 'c2', source: 'n2', target: 'n3', dataFormat: 'Parquet', transformRule: 'Column selection + encoding' },
      { id: 'c3', source: 'n3', target: 'n4', dataFormat: 'Tensor (float32)', transformRule: 'Matrix reshaping' },
      { id: 'c4', source: 'n4', target: 'n5', dataFormat: 'Model checkpoint + predictions', transformRule: 'Prediction extraction' },
      { id: 'c5', source: 'n5', target: 'n6', dataFormat: 'Validation report + predictions', transformRule: 'Filter by threshold' },
      { id: 'c6', source: 'n6', target: 'n7', dataFormat: 'Processed predictions', transformRule: 'Format conversion' },
      { id: 'c7', source: 'n7', target: 'n8', dataFormat: 'Export metrics', transformRule: 'Aggregation' },
    ],
  },
]

const THROUGHPUT_DATA: ThroughputPoint[] = [
  { hour: '00:00', processed: 1200 },
  { hour: '01:00', processed: 980 },
  { hour: '02:00', processed: 750 },
  { hour: '03:00', processed: 320 },
  { hour: '04:00', processed: 180 },
  { hour: '05:00', processed: 250 },
  { hour: '06:00', processed: 890 },
  { hour: '07:00', processed: 1450 },
  { hour: '08:00', processed: 2100 },
  { hour: '09:00', processed: 2800 },
  { hour: '10:00', processed: 3200 },
  { hour: '11:00', processed: 3100 },
  { hour: '12:00', processed: 2900 },
  { hour: '13:00', processed: 2600 },
  { hour: '14:00', processed: 3400 },
  { hour: '15:00', processed: 3600 },
  { hour: '16:00', processed: 3300 },
  { hour: '17:00', processed: 2800 },
  { hour: '18:00', processed: 2200 },
  { hour: '19:00', processed: 1800 },
  { hour: '20:00', processed: 1500 },
  { hour: '21:00', processed: 1100 },
  { hour: '22:00', processed: 800 },
  { hour: '23:00', processed: 600 },
]

const ERROR_RATE_DATA: ErrorRatePoint[] = [
  { hour: '00:00', rate: 1.2 },
  { hour: '01:00', rate: 0.8 },
  { hour: '02:00', rate: 1.5 },
  { hour: '03:00', rate: 3.8 },
  { hour: '04:00', rate: 5.2 },
  { hour: '05:00', rate: 4.1 },
  { hour: '06:00', rate: 2.9 },
  { hour: '07:00', rate: 1.8 },
  { hour: '08:00', rate: 1.1 },
  { hour: '09:00', rate: 0.6 },
  { hour: '10:00', rate: 0.4 },
  { hour: '11:00', rate: 0.5 },
  { hour: '12:00', rate: 0.8 },
  { hour: '13:00', rate: 1.0 },
  { hour: '14:00', rate: 0.3 },
  { hour: '15:00', rate: 0.5 },
  { hour: '16:00', rate: 0.7 },
  { hour: '17:00', rate: 1.2 },
  { hour: '18:00', rate: 1.8 },
  { hour: '19:00', rate: 2.1 },
  { hour: '20:00', rate: 1.5 },
  { hour: '21:00', rate: 1.3 },
  { hour: '22:00', rate: 1.6 },
  { hour: '23:00', rate: 2.0 },
]

// ─── GET Handler ────────────────────────────────────────────────

export async function GET() {
  const pipeline = PIPELINES[0]

  return NextResponse.json({
    success: true as const,
    timestamp: new Date().toISOString(),
    data: {
      pipelines: PIPELINES.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        nodeCount: p.nodes.length,
        connectionCount: p.connections.length,
      })),
      currentPipeline: pipeline,
      analytics: {
        throughput: THROUGHPUT_DATA,
        errorRate: ERROR_RATE_DATA,
        resources: {
          cpu: { usage: 72, label: 'CPU' },
          memory: { usage: 58, label: 'Memory' },
          gpu: { usage: 87, label: 'GPU' },
        },
        totalExecutionTime: '18m 42s',
        successRate: 91.3,
        executionsToday: 24,
      },
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
