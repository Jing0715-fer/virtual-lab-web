'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ChevronUp, ChevronDown, Search, Filter, Download, X,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  Eye, EyeOff, Copy, Trash2, FileJson, FileSpreadsheet,
  GripVertical, MoreHorizontal, Loader2, Pin, PinOff,
  Maximize2, Minimize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

export interface DataTableColumn<T = Record<string, unknown>> {
  id: string
  label: string
  width?: number
  minWidth?: number
  sortable?: boolean
  filterable?: boolean
  pinnable?: boolean
  defaultHidden?: boolean
  render?: (value: unknown, row: T, index: number) => React.ReactNode
  sortValue?: (row: T) => string | number
}

type SortDirection = 'asc' | 'desc' | 'none'

interface SortState {
  columnId: string
  direction: SortDirection
}

interface ColumnVisibility {
  [columnId: string]: boolean
}

interface ColumnFilters {
  [columnId: string]: string
}

interface SelectionState {
  type: 'none' | 'single' | 'multi'
  selectedIds: Set<string>
}

interface ContextMenuState {
  x: number
  y: number
  rowId: string
  visible: boolean
}

// ============================================================
// AdvancedDataTable Props
// ============================================================

export interface AdvancedDataTableProps<T = Record<string, unknown>> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowId: (row: T) => string
  lang?: Lang
  loading?: boolean
  emptyMessage?: string
  expandableRow?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
  onSelectionChange?: (selected: T[]) => void
  stickyHeader?: boolean
  pageSize?: number
}

// ============================================================
// Skeleton Loading
// ============================================================

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header skeleton */}
      <div className="flex gap-px border-b border-[var(--vl-border-subtle)]">
        <div className="w-10 h-10 flex-shrink-0 skeleton-gradient" />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 h-10 skeleton-gradient" />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-px border-b border-[var(--vl-border-subtle)]">
          <div className="w-10 h-12 flex-shrink-0 skeleton-gradient" />
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="flex-1 h-12 skeleton-gradient" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Empty State
// ============================================================

function TableEmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-16 h-16 rounded-2xl bg-[var(--vl-bg-inner)] border border-[var(--vl-border-subtle)] flex items-center justify-center">
        <Search className="size-6 vl-text-muted opacity-40" />
      </div>
      <p className="text-sm vl-text-muted">{message}</p>
    </div>
  )
}

// ============================================================
// AdvancedDataTable — Main Component
// ============================================================

export function AdvancedDataTable<T extends Record<string, unknown>>({
  columns: initialColumns,
  data: initialData,
  rowId,
  lang = 'en',
  loading = false,
  emptyMessage,
  expandableRow,
  onRowClick,
  onSelectionChange,
  stickyHeader = true,
  pageSize: defaultPageSize = 10,
}: AdvancedDataTableProps<T>) {
  // Column visibility
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(() => {
    const vis: ColumnVisibility = {}
    initialColumns.forEach(col => {
      vis[col.id] = !col.defaultHidden
    })
    return vis
  })

  // Column filters
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({})

  // Sort
  const [sortState, setSortState] = useState<SortState>({ columnId: '', direction: 'none' })

  // Selection
  const [selection, setSelection] = useState<SelectionState>({ type: 'none', selectedIds: new Set() })
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const shiftRef = useRef(false)

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Context menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, rowId: '', visible: false })

  // Column pinning (left-pinned columns by id)
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set())

  // Column widths (resizable)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const widths: Record<string, number> = {}
    initialColumns.forEach(col => {
      widths[col.id] = col.width || 150
    })
    return widths
  })
  const [resizingCol, setResizingCol] = useState<string | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // Global search
  const [globalSearch, setGlobalSearch] = useState('')

  // Processed columns (visible + filtered/sorted data)
  const visibleColumns = useMemo(() => {
    return initialColumns.filter(col => columnVisibility[col.id] !== false)
  }, [initialColumns, columnVisibility])

  const pinnedLeft = useMemo(() => {
    return visibleColumns.filter(col => pinnedColumns.has(col.id))
  }, [visibleColumns, pinnedColumns])

  const unpinned = useMemo(() => {
    return visibleColumns.filter(col => !pinnedColumns.has(col.id))
  }, [visibleColumns, pinnedColumns])

  // Filtered + sorted data
  const processedData = useMemo(() => {
    let result = [...initialData]

    // Global search
    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase()
      result = result.filter(row => {
        return initialColumns.some(col => {
          const val = row[col.id]
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query)
        })
      })
    }

    // Column filters
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal.trim()) return
      const query = filterVal.toLowerCase()
      result = result.filter(row => {
        const val = row[colId]
        return val !== undefined && val !== null && String(val).toLowerCase().includes(query)
      })
    })

    // Sort
    if (sortState.columnId && sortState.direction !== 'none') {
      const col = initialColumns.find(c => c.id === sortState.columnId)
      result.sort((a, b) => {
        const va = col?.sortValue ? col.sortValue(a) : (a[sortState.columnId] as string | number)
        const vb = col?.sortValue ? col.sortValue(b) : (b[sortState.columnId] as string | number)
        const vaStr = String(va ?? '')
        const vbStr = String(vb ?? '')
        const cmp = vaStr.localeCompare(vbStr, undefined, { numeric: true })
        return sortState.direction === 'asc' ? cmp : -cmp
      })
    }

    return result
  }, [initialData, initialColumns, globalSearch, columnFilters, sortState])

  // Paginated data
  const totalPages = Math.max(1, Math.ceil(processedData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, currentPage, pageSize])

  // Reset page when data changes
  useEffect(() => {
    requestAnimationFrame(() => setCurrentPage(1))
  }, [globalSearch, columnFilters, sortState])

  // Shift key tracking for range selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = true }
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftRef.current = false }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu.visible) return
    const close = () => setContextMenu(prev => ({ ...prev, visible: false }))
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [contextMenu.visible])

  // Notify selection change
  useEffect(() => {
    if (!onSelectionChange) return
    const selected = initialData.filter(row => selection.selectedIds.has(rowId(row)))
    onSelectionChange(selected)
  }, [selection, initialData, rowId, onSelectionChange])

  // Handlers
  const handleSort = useCallback((columnId: string) => {
    setSortState(prev => {
      if (prev.columnId !== columnId) return { columnId, direction: 'asc' }
      if (prev.direction === 'asc') return { columnId, direction: 'desc' }
      return { columnId: '', direction: 'none' }
    })
    requestAnimationFrame(() => setCurrentPage(1))
  }, [])

  const handleRowSelect = useCallback((rowIdValue: string, index: number, e: React.MouseEvent | React.KeyboardEvent) => {
    setSelection(prev => {
      const newSelected = new Set(prev.selectedIds)
      if (e.shiftKey && shiftRef.current && lastSelectedIndex !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        for (let i = start; i <= end; i++) {
          if (paginatedData[i]) newSelected.add(rowId(paginatedData[i]))
        }
        setLastSelectedIndex(index)
        return { type: 'multi', selectedIds: newSelected }
      }
      if (newSelected.has(rowIdValue)) {
        newSelected.delete(rowIdValue)
        if (newSelected.size === 0) return { type: 'none', selectedIds: newSelected }
        return { type: 'multi', selectedIds: newSelected }
      }
      newSelected.add(rowIdValue)
      setLastSelectedIndex(index)
      return { type: 'multi', selectedIds: newSelected }
    })
  }, [paginatedData, rowId, lastSelectedIndex])

  const handleSelectAll = useCallback(() => {
    const allSelected = paginatedData.every(row => selection.selectedIds.has(rowId(row)))
    if (allSelected) {
      setSelection({ type: 'none', selectedIds: new Set() })
    } else {
      setSelection({
        type: 'multi',
        selectedIds: new Set(paginatedData.map(row => rowId(row))),
      })
    }
  }, [paginatedData, selection.selectedIds, rowId])

  const handleContextMenu = useCallback((e: React.MouseEvent, rowIdValue: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, rowId: rowIdValue, visible: true })
  }, [])

  const toggleColumnPin = useCallback((colId: string) => {
    setPinnedColumns(prev => {
      const next = new Set(prev)
      if (next.has(colId)) next.delete(colId)
      else next.add(colId)
      return next
    })
  }, [])

  // Export functions
  const handleExportCSV = useCallback(() => {
    const headers = visibleColumns.map(c => c.label).join(',')
    const rows = processedData.map(row =>
      visibleColumns.map(col => `"${String(row[col.id] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [visibleColumns, processedData])

  const handleExportJSON = useCallback(() => {
    const selectedRows = selection.selectedIds.size > 0
      ? processedData.filter(row => selection.selectedIds.has(rowId(row)))
      : processedData
    const json = JSON.stringify(selectedRows, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'export.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [processedData, selection.selectedIds, rowId])

  // Column resize handlers
  const handleResizeStart = useCallback((colId: string, e: React.MouseEvent) => {
    e.preventDefault()
    setResizingCol(colId)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = columnWidths[colId] || 150
  }, [columnWidths])

  useEffect(() => {
    if (!resizingCol) return
    const handleMove = (e: MouseEvent) => {
      const diff = e.clientX - resizeStartX.current
      const newWidth = Math.max(60, resizeStartWidth.current + diff)
      setColumnWidths(prev => ({ ...prev, [resizingCol]: newWidth }))
    }
    const handleUp = () => setResizingCol(null)
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [resizingCol])

  const allSelected = paginatedData.length > 0 && paginatedData.every(row => selection.selectedIds.has(rowId(row)))
  const someSelected = paginatedData.some(row => selection.selectedIds.has(rowId(row))) && !allSelected

  if (loading) return <TableSkeleton rows={5} cols={visibleColumns.length} />
  if (processedData.length === 0 && !loading) {
    return <TableEmptyState message={emptyMessage || t(lang, 'dataTable.noData')} />
  }

  return (
    <div className="w-full rounded-lg border border-[var(--vl-border)] overflow-hidden bg-[var(--vl-bg-card)]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-[var(--vl-border-subtle)]">
        {/* Global search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 vl-text-muted" />
          <Input
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder={t(lang, 'common.search')}
            className="h-7 pl-9 text-xs vl-input"
          />
        </div>

        {/* Column visibility toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs vl-text-muted gap-1">
              <Eye className="size-3" /> {t(lang, 'dataTable.columns')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 vl-dialog" align="end">
            <div className="space-y-1">
              {initialColumns.map(col => (
                <label key={col.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--vl-bg-inner)] cursor-pointer text-xs">
                  <Checkbox
                    checked={columnVisibility[col.id] !== false}
                    onCheckedChange={(checked) => {
                      setColumnVisibility(prev => ({ ...prev, [col.id]: !!checked }))
                    }}
                    className="size-3.5"
                  />
                  <span className="vl-text-body">{col.label}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs vl-text-muted gap-1">
              <Download className="size-3" /> {t(lang, 'common.export')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="vl-dialog">
            <DropdownMenuItem onClick={handleExportCSV}>
              <FileSpreadsheet className="size-3 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>
              <FileJson className="size-3 mr-2" /> JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Selection count */}
        {selection.selectedIds.size > 0 && (
          <Badge variant="outline" className="h-6 px-2 text-[10px] border-emerald-500/30 text-emerald-400">
            {selection.selectedIds.size} {t(lang, 'common.select').toLowerCase()}
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          {/* Header */}
          <thead>
            <tr className={`border-b border-[var(--vl-border-subtle)] bg-[var(--vl-bg-inner)] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              {/* Checkbox column */}
              <th className="w-10 text-center px-1">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as unknown as HTMLInputElement).indeterminate = someSelected
                  }}
                  onCheckedChange={handleSelectAll}
                  className="size-3.5"
                />
              </th>

              {/* Pinned left columns */}
              {pinnedLeft.map(col => (
                <th
                  key={`pinned-${col.id}`}
                  className="text-left px-2 py-2 font-medium vl-text-muted text-xs whitespace-nowrap sticky left-0 bg-[var(--vl-bg-inner)] z-10 border-r border-[var(--vl-border-subtle)]"
                  style={{ width: columnWidths[col.id] || col.width || 150, minWidth: col.minWidth || 60 }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSort(col.id)}
                      className="flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors"
                    >
                      {col.label}
                      {sortState.columnId === col.id && sortState.direction !== 'none' ? (
                        sortState.direction === 'asc' ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : col.sortable ? (
                        <ArrowUpDown className="size-3 opacity-30" />
                      ) : null}
                    </button>
                  </div>
                </th>
              ))}

              {/* Unpinned columns */}
              {unpinned.map(col => (
                <th
                  key={col.id}
                  className={`text-left px-2 py-2 font-medium vl-text-muted text-xs whitespace-nowrap relative ${
                    col.filterable ? '' : ''
                  }`}
                  style={{ width: columnWidths[col.id] || col.width || 150, minWidth: col.minWidth || 60 }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSort(col.id)}
                      className="flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors"
                    >
                      {col.label}
                      {sortState.columnId === col.id && sortState.direction !== 'none' ? (
                        sortState.direction === 'asc' ? <ArrowUp className="size-3 text-emerald-400" /> : <ArrowDown className="size-3 text-emerald-400" />
                      ) : col.sortable ? (
                        <ArrowUpDown className="size-3 opacity-30" />
                      ) : null}
                    </button>
                    {/* Column filter icon */}
                    {col.filterable && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className={`p-0.5 rounded cursor-pointer ${columnFilters[col.id] ? 'text-emerald-400' : 'vl-text-muted opacity-40 hover:opacity-100'}`}>
                            <Filter className="size-2.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2 vl-dialog" align="start">
                          <Input
                            value={columnFilters[col.id] || ''}
                            onChange={(e) => setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                            placeholder={`Filter ${col.label}...`}
                            className="h-7 text-xs vl-input"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                    {/* Pin button */}
                    {col.pinnable && (
                      <button
                        type="button"
                        onClick={() => toggleColumnPin(col.id)}
                        className="p-0.5 rounded cursor-pointer vl-text-muted opacity-30 hover:opacity-100"
                        title={pinnedColumns.has(col.id) ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="size-2.5" />
                      </button>
                    )}
                  </div>
                  {/* Resize handle */}
                  {(
                    <div
                      className="col-resize-handle absolute right-0 top-0 bottom-0 w-1 cursor-col-resize"
                      onMouseDown={(e) => handleResizeStart(col.id, e)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {paginatedData.map((row, rowIndex) => {
              const rid = rowId(row)
              const isSelected = selection.selectedIds.has(rid)
              const isExpanded = expandedRows.has(rid)

              return (
                <React.Fragment key={rid}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: rowIndex * 0.03 }}
                    className={`
                      border-b border-[var(--vl-border-subtle)] transition-colors
                      ${isSelected ? 'bg-emerald-500/5' : 'hover:bg-[var(--vl-bg-inner)]'}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={(e) => {
                      if (onRowClick) onRowClick(row)
                    }}
                    onContextMenu={(e) => handleContextMenu(e, rid)}
                  >
                    {/* Checkbox */}
                    <td className="w-10 text-center px-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleRowSelect(rid, rowIndex, {} as React.MouseEvent)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-3.5"
                      />
                    </td>

                    {/* Pinned left */}
                    {pinnedLeft.map(col => (
                      <td
                        key={`pinned-${col.id}`}
                        className="px-2 py-2.5 vl-text-body whitespace-nowrap sticky left-0 z-10 border-r border-[var(--vl-border-subtle)]"
                        style={{
                          backgroundColor: isSelected ? 'rgba(16,185,129,0.03)' : undefined,
                          width: columnWidths[col.id] || col.width || 150,
                        }}
                      >
                        {col.render ? col.render(row[col.id], row, rowIndex) : String(row[col.id] ?? '')}
                      </td>
                    ))}

                    {/* Unpinned */}
                    {unpinned.map(col => (
                      <td
                        key={col.id}
                        className="px-2 py-2.5 vl-text-body whitespace-nowrap"
                        style={{ width: columnWidths[col.id] || col.width || 150 }}
                      >
                        {col.render ? col.render(row[col.id], row, rowIndex) : String(row[col.id] ?? '')}
                      </td>
                    ))}

                    {/* Expand toggle */}
                    {expandableRow && (
                      <td className="w-8 text-center px-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedRows(prev => {
                              const next = new Set(prev)
                              if (next.has(rid)) next.delete(rid)
                              else next.add(rid)
                              return next
                            })
                          }}
                          className="p-0.5 rounded cursor-pointer vl-text-muted hover:text-emerald-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                        </button>
                      </td>
                    )}
                  </motion.tr>

                  {/* Expanded row */}
                  {expandableRow && isExpanded && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="px-4 py-3 bg-[var(--vl-bg-inner)] border-b border-[var(--vl-border-subtle)]">
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {expandableRow(row)}
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[var(--vl-border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] vl-text-muted">
            {t(lang, 'dataTable.showing')} {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, processedData.length)} {t(lang, 'dataTable.of')} {processedData.length}
          </span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
            <SelectTrigger className="h-6 w-16 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="vl-dialog">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted" disabled={currentPage <= 1} onClick={() => setCurrentPage(1)}>
            <ChevronLeft className="size-3" />
          </Button>
          <span className="text-[10px] vl-text-muted px-1">{currentPage} / {totalPages}</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 vl-text-muted" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[200] min-w-[160px] py-1 rounded-lg vl-dialog border border-[var(--vl-border)] shadow-lg row-context-menu-appear"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onClick={() => {
              const row = initialData.find(r => rowId(r) === contextMenu.rowId)
              if (row) {
                const text = JSON.stringify(row, null, 2)
                navigator.clipboard.writeText(text).then(() => {
                  toast.success(t(lang, 'common.copied'))
                })
              }
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}>
              <Copy className="size-3 mr-2" /> {t(lang, 'common.copy')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>
              <Download className="size-3 mr-2" /> {t(lang, 'common.export')} JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelection(prev => {
                  const newSet = new Set(prev.selectedIds)
                  newSet.add(contextMenu.rowId)
                  return { type: 'multi', selectedIds: newSet }
                })
                setContextMenu(prev => ({ ...prev, visible: false }))
              }}
            >
              {t(lang, 'dataTable.selectRow')}
            </DropdownMenuItem>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
