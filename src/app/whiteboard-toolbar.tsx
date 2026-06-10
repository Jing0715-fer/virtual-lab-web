'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Pen, Highlighter, Minus, ArrowRight, Square, Circle,
  Type, Eraser, MousePointer2, Undo2, Redo2, Trash2,
  Download, ZoomIn, ZoomOut, Maximize2, Copy, Image,
  Layers, ChevronDown, Eye, EyeOff, Plus, GripVertical,
  HelpCircle, Ruler, X, ChevronUp,
} from 'lucide-react'
import type { WBTool, WBLayer, BackgroundType } from './interactive-whiteboard'

// ============================================================
// Types
// ============================================================

interface WhiteboardToolbarProps {
  activeTool: WBTool
  onToolChange: (tool: WBTool) => void
  color: string
  onColorChange: (color: string) => void
  fillColor: string
  onFillColorChange: (color: string) => void
  strokeWidth: number
  onStrokeWidthChange: (width: number) => void
  opacity: number
  onOpacityChange: (opacity: number) => void
  fontSize: number
  onFontSizeChange: (size: number) => void
  fontWeight: string
  onFontWeightChange: (weight: string) => void
  textAlign: CanvasTextAlign
  onTextAlignChange: (align: CanvasTextAlign) => void
  smoothing: boolean
  onSmoothingChange: (v: boolean) => void
  arrowStyle: 'filled' | 'hollow'
  onArrowStyleChange: (style: 'filled' | 'hollow') => void
  fillEnabled: boolean
  onFillEnabledChange: (v: boolean) => void
  bgType: BackgroundType
  onBgTypeChange: (bg: BackgroundType) => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onClear: () => void
  onExportPng: () => void
  onExportSvg: () => void
  onCopyClipboard: () => void
  layers: WBLayer[]
  activeLayerId: string
  onActiveLayerChange: (id: string) => void
  onLayerToggleVisibility: (id: string) => void
  onLayerRename: (id: string, name: string) => void
  onLayerDelete: (id: string) => void
  onLayerAdd: () => void
  onLayerReorder: (from: number, to: number) => void
  onToggleMinimap: () => void
  showMinimap: boolean
  onToggleVersionSlider: () => void
  showVersionSlider: boolean
  onToggleShortcuts: () => void
  showShortcuts: boolean
  onToggleFullscreen: () => void
  isFullscreen: boolean
  isMobile?: boolean
  readOnly?: boolean
}

// ============================================================
// Constants
// ============================================================

const PRESET_COLORS = [
  '#000000', '#374151', '#6b7280', '#ef4444',
  '#f59e0b', '#eab308', '#22c55e', '#10b981',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
]

const STROKE_PRESETS = [1, 2, 4, 8, 16]
const FONT_SIZE_OPTIONS = [12, 16, 20, 28, 36]

const TOOL_ITEMS: { tool: WBTool; Icon: typeof Pen; label: string; shortcut: string }[] = [
  { tool: 'pen', Icon: Pen, label: 'Pen', shortcut: 'P' },
  { tool: 'highlighter', Icon: Highlighter, label: 'Highlighter', shortcut: 'H' },
  { tool: 'line', Icon: Minus, label: 'Line', shortcut: 'L' },
  { tool: 'arrow', Icon: ArrowRight, label: 'Arrow', shortcut: 'A' },
  { tool: 'rectangle', Icon: Square, label: 'Rectangle', shortcut: 'R' },
  { tool: 'ellipse', Icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { tool: 'text', Icon: Type, label: 'Text', shortcut: 'T' },
  { tool: 'eraser', Icon: Eraser, label: 'Eraser', shortcut: 'E' },
  { tool: 'select', Icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { tool: 'measure', Icon: Ruler, label: 'Measure', shortcut: 'M' },
]

const BG_OPTIONS: { type: BackgroundType; label: string }[] = [
  { type: 'blank', label: 'Blank' },
  { type: 'dot-grid', label: 'Dots' },
  { type: 'line-grid', label: 'Grid' },
  { type: 'graph-paper', label: 'Graph' },
]

// ============================================================
// Toolbar Position Persistence
// ============================================================

function useToolbarPosition() {
  const STORAGE_POS = 'vl-wb-toolbar-pos'
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_POS)
      if (raw) setPosition(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  const savePosition = useCallback((pos: { top: number; left: number }) => {
    setPosition(pos)
    try { localStorage.setItem(STORAGE_POS, JSON.stringify(pos)) } catch { /* ignore */ }
  }, [])

  return { position, savePosition }
}

// ============================================================
// Sub-components
// ============================================================

function ToolButton({ tool, icon: Icon, label, shortcut, isActive, onClick, readOnly }: {
  tool: WBTool
  icon: typeof Pen
  label: string
  shortcut: string
  isActive: boolean
  onClick: (t: WBTool) => void
  readOnly?: boolean
}) {
  return (
    <button
      className={`wb-tool-btn ${isActive ? 'wb-tool-active' : ''} ${readOnly ? 'wb-tool-disabled' : ''}`}
      data-wb-tooltip={`${label} (${shortcut})`}
      onClick={() => onClick(tool)}
      disabled={readOnly}
      type="button"
    >
      <Icon size={16} />
    </button>
  )
}

function ColorSwatchRow({ color, fillColor, onColorChange, fillColorEnabled, onFillColorChange }: {
  color: string
  fillColor: string
  onColorChange: (c: string) => void
  fillColorEnabled: boolean
  onFillColorChange: (c: string) => void
}) {
  const colorRef = useRef<HTMLInputElement>(null)
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="wb-toolbar-section" style={{ gap: 2 }}>
      {PRESET_COLORS.map(c => (
        <button
          key={c}
          className={`wb-color-swatch ${color === c ? 'wb-color-active' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onColorChange(c)}
          title={c}
          type="button"
        />
      ))}
      <div className="wb-color-picker-btn" title="Custom color">
        <input
          ref={colorRef}
          type="color"
          value={color}
          onChange={e => { onColorChange(e.target.value); setShowCustom(false) }}
        />
      </div>
      {fillColorEnabled && (
        <>
          <div className="wb-toolbar-divider" />
          <span style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>Fill</span>
          {PRESET_COLORS.slice(0, 6).map(c => (
            <button
              key={`fill-${c}`}
              className={`wb-color-swatch ${fillColor === c ? 'wb-color-active' : ''}`}
              style={{ backgroundColor: c, opacity: 0.7 }}
              onClick={() => onFillColorChange(c)}
              title={`Fill: ${c}`}
              type="button"
            />
          ))}
        </>
      )}
    </div>
  )
}

function StrokeWidthSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="wb-toolbar-section" style={{ gap: 2 }}>
      {STROKE_PRESETS.map(w => (
        <button
          key={w}
          className={`wb-stroke-option ${value === w ? 'wb-stroke-active' : ''}`}
          title={`${w}px`}
          onClick={() => onChange(w)}
          type="button"
        >
          <div className="wb-stroke-dot" style={{ width: Math.max(4, w), height: Math.max(4, w) }} />
        </button>
      ))}
      {showCustom && (
        <input
          type="range"
          className="wb-stroke-slider"
          min={0.5}
          max={32}
          step={0.5}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
      )}
      <button
        className="wb-tool-btn"
        data-wb-tooltip="Custom width"
        onClick={() => setShowCustom(p => !p)}
        type="button"
      >
        <span style={{ fontSize: 10, fontWeight: 700 }}>{value}</span>
      </button>
    </div>
  )
}

function LayerPanel({ layers, activeLayerId, onActiveLayerChange, onToggleVisibility, onRename, onDelete, onAdd, onReorder }: {
  layers: WBLayer[]
  activeLayerId: string
  onActiveLayerChange: (id: string) => void
  onToggleVisibility: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onReorder: (from: number, to: number) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const handleDoubleClick = useCallback((id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }, [])

  const commitRename = useCallback(() => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
  }, [editingId, editName, onRename])

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx)
  }, [])

  const handleDrop = useCallback((toIdx: number) => {
    if (dragIdx !== null && dragIdx !== toIdx) {
      onReorder(dragIdx, toIdx)
    }
    setDragIdx(null)
  }, [dragIdx, onReorder])

  return (
    <div className="wb-layer-panel" ref={listRef}>
      <div className="wb-layer-panel-header">
        <span>Layers</span>
        <button className="wb-layer-visibility" onClick={onAdd} title="Add layer">
          <Plus size={14} />
        </button>
      </div>
      {layers.map((layer, idx) => (
        <div
          key={layer.id}
          className={`wb-layer-item ${layer.id === activeLayerId ? 'wb-layer-active' : ''}`}
          onClick={() => onActiveLayerChange(layer.id)}
          draggable={dragIdx !== null}
          onDragStart={() => handleDragStart(idx)}
          onDragOver={e => e.preventDefault()}
          onDrop={() => handleDrop(idx)}
        >
          <div className="wb-layer-drag-handle" title="Drag to reorder">
            <GripVertical size={12} />
          </div>
          <button
            className={`wb-layer-visibility ${!layer.visible ? 'wb-layer-hidden' : ''}`}
            onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
            title={layer.visible ? 'Hide layer' : 'Show layer'}
            type="button"
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          {editingId === layer.id ? (
            <input
              className="wb-layer-name-input"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="wb-layer-name"
              onDoubleClick={e => { e.stopPropagation(); handleDoubleClick(layer.id, layer.name) }}
            >
              {layer.name}
            </span>
          )}
          {layers.length > 1 && (
            <button
              className="wb-layer-delete"
              onClick={e => { e.stopPropagation(); onDelete(layer.id) }}
              title="Delete layer"
              type="button"
            >
              <X size={12} />
            </button>
          )}
        </div>
      ))}
      <button className="wb-layer-add-btn" onClick={onAdd} type="button">
        <Plus size={12} /> Add Layer
      </button>
    </div>
  )
}

function ToolOptionsPanel({ tool, props }: {
  tool: WBTool
  props: WhiteboardToolbarProps
}) {
  if (!tool) return null

  switch (tool) {
    case 'pen':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Width</span>
            <StrokeWidthSelector value={props.strokeWidth} onChange={props.onStrokeWidthChange} />
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Opacity</span>
            <input
              type="range"
              className="wb-opacity-slider"
              min={0.1}
              max={1}
              step={0.05}
              value={props.opacity}
              onChange={e => props.onOpacityChange(Number(e.target.value))}
            />
            <span className="wb-options-value">{Math.round(props.opacity * 100)}%</span>
          </div>
          <div className="wb-smoothing-toggle">
            <button
              className={`wb-smoothing-switch ${props.smoothing ? 'wb-smoothing-on' : ''}`}
              onClick={() => props.onSmoothingChange(!props.smoothing)}
              type="button"
            />
            <span className="wb-smoothing-label">Stroke Smoothing</span>
          </div>
        </div>
      )

    case 'highlighter':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Width</span>
            <StrokeWidthSelector value={props.strokeWidth} onChange={props.onStrokeWidthChange} />
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Opacity</span>
            <input
              type="range"
              className="wb-opacity-slider"
              min={0.05}
              max={0.5}
              step={0.05}
              value={props.opacity}
              onChange={e => props.onOpacityChange(Number(e.target.value))}
            />
            <span className="wb-options-value">{Math.round(props.opacity * 100)}%</span>
          </div>
        </div>
      )

    case 'arrow':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Width</span>
            <StrokeWidthSelector value={props.strokeWidth} onChange={props.onStrokeWidthChange} />
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Style</span>
            <div className="wb-font-selector">
              <button
                className={`wb-font-weight-btn ${props.arrowStyle === 'filled' ? 'wb-font-active' : ''}`}
                onClick={() => props.onArrowStyleChange('filled')}
                type="button"
              >
                ▶
              </button>
              <button
                className={`wb-font-weight-btn ${props.arrowStyle === 'hollow' ? 'wb-font-active' : ''}`}
                onClick={() => props.onArrowStyleChange('hollow')}
                type="button"
              >
                ◇
              </button>
            </div>
          </div>
        </div>
      )

    case 'rectangle':
    case 'ellipse':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Stroke</span>
            <StrokeWidthSelector value={props.strokeWidth} onChange={props.onStrokeWidthChange} />
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Opacity</span>
            <input
              type="range"
              className="wb-opacity-slider"
              min={0.1}
              max={1}
              step={0.05}
              value={props.opacity}
              onChange={e => props.onOpacityChange(Number(e.target.value))}
            />
            <span className="wb-options-value">{Math.round(props.opacity * 100)}%</span>
          </div>
          <div className="wb-fill-toggle">
            <button
              className={`wb-fill-checkbox ${props.fillEnabled ? 'wb-fill-checked' : ''}`}
              onClick={() => props.onFillEnabledChange(!props.fillEnabled)}
              type="button"
            >
              {props.fillEnabled && <span style={{ fontSize: 10, color: '#fff' }}>✓</span>}
            </button>
            <span className="wb-fill-label">Enable Fill</span>
          </div>
        </div>
      )

    case 'text':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Size</span>
            <div className="wb-font-selector">
              {FONT_SIZE_OPTIONS.map(fs => (
                <button
                  key={fs}
                  className={`wb-font-size-btn ${props.fontSize === fs ? 'wb-font-active' : ''}`}
                  onClick={() => props.onFontSizeChange(fs)}
                  type="button"
                >
                  {fs}
                </button>
              ))}
            </div>
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Weight</span>
            <div className="wb-font-selector">
              {['normal', 'bold'].map(w => (
                <button
                  key={w}
                  className={`wb-font-weight-btn ${props.fontWeight === w ? 'wb-font-active' : ''}`}
                  onClick={() => props.onFontWeightChange(w)}
                  type="button"
                  style={{ fontWeight: w as 'normal' | 'bold' }}
                >
                  Aa
                </button>
              ))}
            </div>
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Align</span>
            <div className="wb-font-selector">
              {(['left', 'center', 'right'] as CanvasTextAlign[]).map(align => (
                <button
                  key={align}
                  className={`wb-font-weight-btn ${props.textAlign === align ? 'wb-font-active' : ''}`}
                  onClick={() => props.onTextAlignChange(align)}
                  type="button"
                >
                  {align === 'left' ? '☰' : align === 'center' ? '≡' : '☰'}
                  <span style={{ fontSize: 8, marginLeft: 1 }}>{align.charAt(0).toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="wb-options-row">
            <span className="wb-options-label">Opacity</span>
            <input
              type="range"
              className="wb-opacity-slider"
              min={0.1}
              max={1}
              step={0.05}
              value={props.opacity}
              onChange={e => props.onOpacityChange(Number(e.target.value))}
            />
            <span className="wb-options-value">{Math.round(props.opacity * 100)}%</span>
          </div>
        </div>
      )

    case 'eraser':
      return (
        <div className="wb-options-panel">
          <div className="wb-options-row">
            <span className="wb-options-label">Width</span>
            <StrokeWidthSelector value={props.strokeWidth} onChange={props.onStrokeWidthChange} />
          </div>
        </div>
      )

    default:
      return null
  }
}

// ============================================================
// Main Component
// ============================================================

export function WhiteboardToolbar(props: WhiteboardToolbarProps) {
  const {
    activeTool, onToolChange, color, onColorChange, fillColor, onFillColorChange,
    strokeWidth, onStrokeWidthChange, opacity, onOpacityChange,
    fontSize, onFontSizeChange, fontWeight, onFontWeightChange,
    textAlign, onTextAlignChange, smoothing, onSmoothingChange,
    arrowStyle, onArrowStyleChange, fillEnabled, onFillEnabledChange,
    bgType, onBgTypeChange, zoom, onZoomIn, onZoomOut, onZoomReset,
    onUndo, onRedo, canUndo, canRedo, onClear,
    onExportPng, onExportSvg, onCopyClipboard,
    layers, activeLayerId, onActiveLayerChange,
    onLayerToggleVisibility, onLayerRename, onLayerDelete, onLayerAdd, onLayerReorder,
    onToggleMinimap, showMinimap,
    onToggleVersionSlider, showVersionSlider,
    onToggleShortcuts, showShortcuts,
    onToggleFullscreen, isFullscreen,
    isMobile = false,
    readOnly = false,
  } = props

  const { position: savedPosition, savePosition } = useToolbarPosition()
  const [collapsed, setCollapsed] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showOptionsPanel, setShowOptionsPanel] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  // Draggable toolbar position
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [toolbarPos, setToolbarPos] = useState(savedPosition ?? { top: 12, left: '50%' as string | number })
  const toolbarRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as HTMLElement).closest('.wb-export-trigger')) {
        setShowExportMenu(false)
      }
      if (showOptionsPanel && !(e.target as HTMLElement).closest('.wb-options-panel') && !(e.target as HTMLElement).closest('.wb-tool-btn')) {
        setShowOptionsPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu, showOptionsPanel])

  // Drag handler
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, .wb-color-swatch, .wb-stroke-option')) return
    setIsDragging(true)
    setDragOffset({ x: e.clientX - (typeof toolbarPos.left === 'number' ? toolbarPos.left : 0), y: e.clientY - toolbarPos.top })
  }, [toolbarPos])

  useEffect(() => {
    if (!isDragging) return
    const handleMove = (e: MouseEvent) => {
      const newLeft = Math.max(0, Math.min(window.innerWidth - 400, e.clientX - dragOffset.x))
      const newTop = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y))
      setToolbarPos({ top: newTop, left: newLeft })
    }
    const handleUp = () => {
      setIsDragging(false)
      savePosition({ top: toolbarPos.top, left: typeof toolbarPos.left === 'number' ? toolbarPos.left : 0 })
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [isDragging, dragOffset, toolbarPos.top, toolbarPos.left, savePosition])

  // Toggle options panel on tool change
  useEffect(() => {
    setShowOptionsPanel(true)
  }, [activeTool])

  const handleClear = useCallback(() => {
    setConfirmClear(true)
  }, [])

  const handleConfirmClear = useCallback(() => {
    onClear()
    setConfirmClear(false)
  }, [onClear])

  if (isMobile && collapsed) {
    return (
      <button
        className="wb-fab"
        onClick={() => setCollapsed(false)}
        type="button"
        aria-label="Open toolbar"
      >
        <Pen size={22} />
      </button>
    )
  }

  const toolbarStyle: React.CSSProperties = isDragging || typeof toolbarPos.left === 'number'
    ? { position: 'absolute', top: toolbarPos.top, left: toolbarPos.left, transform: 'none', cursor: isDragging ? 'grabbing' : 'grab' }
    : {}

  return (
    <>
      {/* Main Toolbar */}
      <div
        ref={toolbarRef}
        className={`wb-toolbar ${isMobile ? '' : ''} ${isDragging ? '' : ''}`}
        style={toolbarStyle}
        onMouseDown={handleDragStart}
      >
        {/* Tool buttons */}
        <div className="wb-toolbar-section">
          {TOOL_ITEMS.map(({ tool, Icon, label, shortcut }) => (
            <ToolButton
              key={tool}
              tool={tool}
              icon={Icon}
              label={label}
              shortcut={shortcut}
              isActive={activeTool === tool}
              onClick={onToolChange}
              readOnly={readOnly}
            />
          ))}
        </div>

        <div className="wb-toolbar-divider" />

        {/* Colors */}
        <ColorSwatchRow
          color={color}
          fillColor={fillColor}
          onColorChange={onColorChange}
          fillColorEnabled={fillEnabled}
          onFillColorChange={onFillColorChange}
        />

        <div className="wb-toolbar-divider" />

        {/* Stroke Width */}
        <StrokeWidthSelector value={strokeWidth} onChange={onStrokeWidthChange} />

        {/* Opacity (quick slider) */}
        {!isMobile && (
          <>
            <div className="wb-toolbar-divider" />
            <div className="wb-toolbar-section" style={{ gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--vl-text-muted)', whiteSpace: 'nowrap' }}>Opacity</span>
              <input
                type="range"
                className="wb-opacity-slider"
                min={0.1}
                max={1}
                step={0.05}
                value={opacity}
                onChange={e => onOpacityChange(Number(e.target.value))}
                style={{ width: 50 }}
              />
            </div>
          </>
        )}

        <div className="wb-toolbar-divider" />

        {/* Background type */}
        <div className="wb-toolbar-section" style={{ gap: 2 }}>
          {BG_OPTIONS.map(bg => (
            <button
              key={bg.type}
              className={`wb-tool-btn ${bgType === bg.type ? 'wb-tool-active' : ''}`}
              data-wb-tooltip={bg.label}
              onClick={() => onBgTypeChange(bg.type)}
              type="button"
            >
              <div
                style={{
                  width: 14, height: 14, borderRadius: 2,
                  background: bg.type === 'blank' ? '#fff' : bg.type === 'dot-grid'
                    ? 'radial-gradient(circle, #999 1px, transparent 1px)'
                    : bg.type === 'line-grid'
                      ? 'linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)'
                      : 'linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)',
                  backgroundSize: bg.type === 'dot-grid' ? '4px 4px' : bg.type === 'line-grid' ? '5px 5px' : bg.type === 'graph-paper' ? '6px 6px, 6px 6px' : undefined,
                  border: bg.type === 'blank' ? '1px solid #ddd' : 'none',
                }}
              />
            </button>
          ))}
        </div>

        <div className="wb-toolbar-divider" />

        {/* Action buttons */}
        <div className="wb-toolbar-section">
          <button className={`wb-tool-btn ${!canUndo ? 'wb-tool-disabled' : ''}`} data-wb-tooltip="Undo (⌘Z)" onClick={onUndo} disabled={!canUndo} type="button">
            <Undo2 size={16} />
          </button>
          <button className={`wb-tool-btn ${!canRedo ? 'wb-tool-disabled' : ''}`} data-wb-tooltip="Redo (⌘⇧Z)" onClick={onRedo} disabled={!canRedo} type="button">
            <Redo2 size={16} />
          </button>
          {!readOnly && (
            <button
              className={`wb-tool-btn ${confirmClear ? 'wb-tool-active' : ''}`}
              data-wb-tooltip="Clear"
              onClick={handleClear}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="wb-toolbar-divider" />

        {/* Layer toggle */}
        <button
          className={`wb-tool-btn ${showLayerPanel ? 'wb-tool-active' : ''}`}
          data-wb-tooltip="Layers"
          onClick={() => setShowLayerPanel(p => !p)}
          type="button"
        >
          <Layers size={16} />
        </button>

        {/* Export */}
        <div style={{ position: 'relative' }}>
          <button
            className="wb-tool-btn wb-export-trigger"
            data-wb-tooltip="Export"
            onClick={() => setShowExportMenu(p => !p)}
            type="button"
          >
            <Download size={16} />
          </button>
          {showExportMenu && (
            <div className="wb-export-menu" style={{ top: 42, left: '50%', transform: 'translateX(-50%)' }}>
              <button className="wb-export-item" onClick={() => { onExportPng(); setShowExportMenu(false) }} type="button">
                <Download size={14} /> Export PNG
              </button>
              <button className="wb-export-item" onClick={() => { onExportSvg(); setShowExportMenu(false) }} type="button">
                <Image size={14} /> Export SVG
              </button>
              <button className="wb-export-item" onClick={() => { onCopyClipboard(); setShowExportMenu(false) }} type="button">
                <Copy size={14} /> Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Options panel toggle */}
        <button
          className={`wb-tool-btn`}
          data-wb-tooltip="Tool options"
          onClick={() => setShowOptionsPanel(p => !p)}
          type="button"
        >
          {showOptionsPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Minimap toggle */}
        <button
          className={`wb-tool-btn ${showMinimap ? 'wb-tool-active' : ''}`}
          data-wb-tooltip="Minimap"
          onClick={onToggleMinimap}
          type="button"
        >
          <Maximize2 size={16} />
        </button>

        {/* Version history toggle */}
        <button
          className={`wb-tool-btn ${showVersionSlider ? 'wb-tool-active' : ''}`}
          data-wb-tooltip="Version history"
          onClick={onToggleVersionSlider}
          type="button"
        >
          <RotateCcwIcon size={16} />
        </button>

        {/* Shortcuts */}
        <button
          className={`wb-tool-btn ${showShortcuts ? 'wb-tool-active' : ''}`}
          data-wb-tooltip="Shortcuts (?)"
          onClick={onToggleShortcuts}
          type="button"
        >
          <HelpCircle size={16} />
        </button>

        {/* Fullscreen toggle */}
        <button
          className="wb-tool-btn"
          data-wb-tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          onClick={onToggleFullscreen}
          type="button"
        >
          <Maximize2 size={16} />
        </button>

        {/* Mobile collapse */}
        {isMobile && (
          <button className="wb-tool-btn" data-wb-tooltip="Collapse" onClick={() => setCollapsed(true)} type="button">
            <X size={16} />
          </button>
        )}

        {/* Confirm clear overlay inside toolbar */}
        {confirmClear && (
          <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 70 }}>
            <div className="wb-export-menu">
              <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--vl-text-muted)' }}>
                Clear all layers?
              </div>
              <div style={{ display: 'flex', gap: 4, padding: 4 }}>
                <button className="wb-export-item" onClick={handleConfirmClear} style={{ color: '#ef4444', flex: 1 }} type="button">
                  Clear All
                </button>
                <button className="wb-export-item" onClick={() => setConfirmClear(false)} style={{ flex: 1 }} type="button">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options Panel (floating, below toolbar) */}
      {showOptionsPanel && !isMobile && (
        <ToolOptionsPanel tool={activeTool} props={props} />
      )}

      {/* Layer Panel */}
      {showLayerPanel && (
        <LayerPanel
          layers={layers}
          activeLayerId={activeLayerId}
          onActiveLayerChange={onActiveLayerChange}
          onToggleVisibility={onLayerToggleVisibility}
          onRename={onLayerRename}
          onDelete={onLayerDelete}
          onAdd={onLayerAdd}
          onReorder={onLayerReorder}
        />
      )}
    </>
  )
}

// Simple rotate icon
function RotateCcwIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
    </svg>
  )
}
