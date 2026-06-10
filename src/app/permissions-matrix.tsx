'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Shield, ShieldCheck, ShieldX, Check, X, ChevronDown,
  Download, FileJson, FileText, GitCompare, AlertTriangle,
  Clock, Eye, Lock, Unlock, Copy, ArrowRightLeft,
  ChevronRight, Users, Settings, Activity,
} from 'lucide-react'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Types
// ============================================================

type Proficiency = 'beginner' | 'intermediate' | 'expert'

interface PermissionDef {
  id: string
  name: string
  description: string
  category: string
}

interface Role {
  id: string
  name: string
  color: string
  description: string
  permissions: Record<string, boolean>
  inheritsFrom?: string
}

interface AuditEntry {
  id: string
  action: string
  actor: string
  description: string
  timestamp: string
  changeType: 'granted' | 'revoked'
}

interface Template {
  id: string
  name: string
  description: string
  permissions: Record<string, Record<string, boolean>>
  icon: string
}

// ============================================================
// Constants
// ============================================================

const PERMISSIONS: PermissionDef[] = [
  { id: 'create_meeting', name: 'Create Meeting', description: 'Can create new meetings and schedule sessions', category: 'Meetings' },
  { id: 'run_meeting', name: 'Run Meeting', description: 'Can start, run, and facilitate meetings', category: 'Meetings' },
  { id: 'edit_meeting', name: 'Edit Meeting', description: 'Can edit meeting settings, agenda, and participants', category: 'Meetings' },
  { id: 'delete_meeting', name: 'Delete Meeting', description: 'Can permanently delete meetings', category: 'Meetings' },
  { id: 'manage_agents', name: 'Manage Agents', description: 'Can create, modify, and manage AI agents', category: 'Agents' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Can access and view analytics dashboards', category: 'Analytics' },
  { id: 'export_data', name: 'Export Data', description: 'Can export datasets and reports in various formats', category: 'Data' },
  { id: 'manage_pipeline', name: 'Manage Pipeline', description: 'Can create and modify research pipelines', category: 'Pipelines' },
  { id: 'edit_wiki', name: 'Edit Wiki', description: 'Can create and edit knowledge base articles', category: 'Knowledge' },
  { id: 'manage_experiments', name: 'Manage Experiments', description: 'Can create, run, and manage experiments', category: 'Experiments' },
  { id: 'review_meetings', name: 'Review Meetings', description: 'Can review, annotate, and comment on meetings', category: 'Meetings' },
  { id: 'admin_settings', name: 'Admin Settings', description: 'Can modify team configuration and system settings', category: 'Admin' },
]

const ROLE_COLORS: Record<string, string> = {
  admin: '#ef4444',
  lead_researcher: '#8b5cf6',
  researcher: '#10b981',
  analyst: '#06b6d4',
  reviewer: '#f59e0b',
  viewer: '#6b7280',
}

const ROLE_COLORS_HEX: Record<string, string> = {
  Admin: '#ef4444',
  'Lead Researcher': '#8b5cf6',
  Researcher: '#10b981',
  Analyst: '#06b6d4',
  Reviewer: '#f59e0b',
  Viewer: '#6b7280',
}

const TEMPLATES: Template[] = [
  {
    id: 'research_lab',
    name: 'Research Lab',
    description: 'Standard research lab with hierarchical roles and balanced permissions',
    icon: '🔬',
    permissions: {
      admin: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: true },
      lead_researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      analyst: { create_meeting: true, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: true, manage_experiments: false, review_meetings: true, admin_settings: false },
      reviewer: { create_meeting: true, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: true, admin_settings: false },
      viewer: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false },
    },
  },
  {
    id: 'classroom',
    name: 'Classroom',
    description: 'Educational setting with instructor-led roles and limited student access',
    icon: '📚',
    permissions: {
      admin: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: true },
      lead_researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: false, admin_settings: false },
      analyst: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false },
      reviewer: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: true, admin_settings: false },
      viewer: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false },
    },
  },
  {
    id: 'open_collab',
    name: 'Open Collaboration',
    description: 'Flat hierarchy with maximum permissions for most roles',
    icon: '🌐',
    permissions: {
      admin: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: true },
      lead_researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: true },
      researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      analyst: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      reviewer: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: true, manage_experiments: false, review_meetings: true, admin_settings: false },
      viewer: { create_meeting: true, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: true, manage_experiments: false, review_meetings: false, admin_settings: false },
    },
  },
  {
    id: 'restricted',
    name: 'Restricted Access',
    description: 'Tight security with minimal permissions for most roles',
    icon: '🔒',
    permissions: {
      admin: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: true },
      lead_researcher: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false },
      researcher: { create_meeting: true, run_meeting: true, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: false, export_data: false, manage_pipeline: true, edit_wiki: false, manage_experiments: true, review_meetings: false, admin_settings: false },
      analyst: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false },
      reviewer: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: false, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: true, admin_settings: false },
      viewer: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false },
    },
  },
]

const DEFAULT_ROLES: Role[] = [
  { id: 'admin', name: 'Admin', color: '#ef4444', description: 'Full access to all team features', permissions: Object.fromEntries(PERMISSIONS.map(p => [p.id, true])) },
  { id: 'lead_researcher', name: 'Lead Researcher', color: '#8b5cf6', description: 'Leads research direction', inheritsFrom: 'researcher', permissions: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: true, manage_agents: true, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false } },
  { id: 'researcher', name: 'Researcher', color: '#10b981', description: 'Conducts research', permissions: { create_meeting: true, run_meeting: true, edit_meeting: true, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: true, edit_wiki: true, manage_experiments: true, review_meetings: true, admin_settings: false } },
  { id: 'analyst', name: 'Analyst', color: '#06b6d4', description: 'Analyzes data', permissions: { create_meeting: true, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: true, manage_experiments: false, review_meetings: true, admin_settings: false } },
  { id: 'reviewer', name: 'Reviewer', color: '#f59e0b', description: 'Reviews work', permissions: { create_meeting: true, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: true, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: true, admin_settings: false } },
  { id: 'viewer', name: 'Viewer', color: '#6b7280', description: 'Read-only access', permissions: { create_meeting: false, run_meeting: false, edit_meeting: false, delete_meeting: false, manage_agents: false, view_analytics: true, export_data: false, manage_pipeline: false, edit_wiki: false, manage_experiments: false, review_meetings: false, admin_settings: false } },
]

const SAMPLE_AUDIT: AuditEntry[] = [
  { id: 'audit-1', action: 'Permission granted', actor: 'Dr. Sarah Chen', description: 'Granted export_data to Analyst role', timestamp: new Date(Date.now() - 3600000).toISOString(), changeType: 'granted' },
  { id: 'audit-2', action: 'Permission revoked', actor: 'Dr. Sarah Chen', description: 'Revoked manage_pipeline from Reviewer role', timestamp: new Date(Date.now() - 86400000).toISOString(), changeType: 'revoked' },
  { id: 'audit-3', action: 'Template applied', actor: 'Dr. Sarah Chen', description: 'Applied Research Lab template', timestamp: new Date(Date.now() - 172800000).toISOString(), changeType: 'granted' },
  { id: 'audit-4', action: 'Permission granted', actor: 'Dr. Sarah Chen', description: 'Granted run_meeting to Lead Researcher', timestamp: new Date(Date.now() - 259200000).toISOString(), changeType: 'granted' },
  { id: 'audit-5', action: 'Permission revoked', actor: 'Dr. Sarah Chen', description: 'Revoked delete_meeting from Researcher', timestamp: new Date(Date.now() - 345600000).toISOString(), changeType: 'revoked' },
  { id: 'audit-6', action: 'Permission granted', actor: 'Dr. Sarah Chen', description: 'Granted edit_wiki to Analyst', timestamp: new Date(Date.now() - 432000000).toISOString(), changeType: 'granted' },
]

// ============================================================
// Helpers
// ============================================================

function formatAuditTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function detectConflicts(roles: Role[]): { roleId: string; permId: string; message: string }[] {
  const conflicts: { roleId: string; permId: string; message: string }[] = []
  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const lowerRole = roles[j]
      const upperRole = roles[i]
      PERMISSIONS.forEach(perm => {
        const upperHas = upperRole.permissions[perm.id] ?? false
        const lowerHas = lowerRole.permissions[perm.id] ?? false
        if (!upperHas && lowerHas) {
          conflicts.push({
            roleId: lowerRole.id,
            permId: perm.id,
            message: `${lowerRole.name} has "${perm.name}" but ${upperRole.name} does not — inheritance conflict`,
          })
        }
      })
    }
  }
  return conflicts
}

// ============================================================
// PermissionsMatrix Component
// ============================================================

export function PermissionsMatrix({ lang }: { lang: Lang }) {
  const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(SAMPLE_AUDIT)
  const [activeTab, setActiveTab] = useState<'matrix' | 'templates' | 'comparison' | 'audit'>('matrix')
  const [compareRoleA, setCompareRoleA] = useState<string>('admin')
  const [compareRoleB, setCompareRoleB] = useState<string>('viewer')
  const [hoveredCell, setHoveredCell] = useState<{ roleId: string; permId: string } | null>(null)

  const conflicts = useMemo(() => detectConflicts(roles), [roles])

  const togglePermission = useCallback((roleId: string, permId: string) => {
    setRoles(prev => {
      const updated = prev.map(role => {
        if (role.id !== roleId) return role
        const currentVal = role.permissions[permId] ?? false
        const newPermissions = { ...role.permissions, [permId]: !currentVal }
        return { ...role, permissions: newPermissions }
      })
      return updated
    })

    const roleName = roles.find(r => r.id === roleId)?.name ?? roleId
    const permName = PERMISSIONS.find(p => p.id === permId)?.name ?? permId
    const newPerms = !((roles.find(r => r.id === roleId)?.permissions[permId]) ?? false)
    setAuditLog(prev => [{
      id: `audit-${Date.now()}`,
      action: newPerms ? 'Permission granted' : 'Permission revoked',
      actor: 'Current User',
      description: `${newPerms ? 'Granted' : 'Revoked'} ${permName} for ${roleName}`,
      timestamp: new Date().toISOString(),
      changeType: newPerms ? 'granted' : 'revoked',
    }, ...prev])
  }, [roles])

  const applyTemplate = useCallback((template: Template) => {
    setRoles(prev => prev.map(role => ({
      ...role,
      permissions: template.permissions[role.id] ?? role.permissions,
    })))

    setAuditLog(prev => [{
      id: `audit-${Date.now()}`,
      action: 'Template applied',
      actor: 'Current User',
      description: `Applied "${template.name}" template`,
      timestamp: new Date().toISOString(),
      changeType: 'granted',
    }, ...prev])
  }, [])

  const exportAsJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      permissions: PERMISSIONS,
      roles: roles.map(r => ({ id: r.id, name: r.name, permissions: r.permissions })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'permissions-matrix.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [roles])

  const exportAsCSV = useCallback(() => {
    const headers = ['Role', ...PERMISSIONS.map(p => p.name)]
    const rows = roles.map(role => [
      role.name,
      ...PERMISSIONS.map(p => role.permissions[p.id] ? '✓' : '✗'),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'permissions-matrix.csv'
    link.click()
    URL.revokeObjectURL(url)
  }, [roles])

  const inheritedPerms = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    roles.forEach(role => {
      if (role.inheritsFrom) {
        const parent = roles.find(r => r.id === role.inheritsFrom)
        if (parent) {
          const inherited = new Set<string>()
          PERMISSIONS.forEach(p => {
            if (role.permissions[p.id] && parent.permissions[p.id]) {
              inherited.add(p.id)
            }
          })
          map[role.id] = inherited
        }
      }
    })
    return map
  }, [roles])

  const comparisonData = useMemo(() => {
    const roleA = roles.find(r => r.id === compareRoleA)
    const roleB = roles.find(r => r.id === compareRoleB)
    if (!roleA || !roleB) return { perms: [], onlyA: 0, onlyB: 0, same: 0 }

    const perms: { id: string; name: string; aHas: boolean; bHas: boolean; diff: 'only-a' | 'only-b' | 'same' }[] = []
    let onlyACount = 0
    let onlyBCount = 0
    let sameCount = 0

    PERMISSIONS.forEach(p => {
      const aHas = roleA.permissions[p.id] ?? false
      const bHas = roleB.permissions[p.id] ?? false
      const diff = aHas === bHas ? 'same' as const : (aHas ? 'only-a' as const : 'only-b' as const)
      if (diff === 'only-a') onlyACount++
      else if (diff === 'only-b') onlyBCount++
      else sameCount++
      perms.push({ id: p.id, name: p.name, aHas, bHas, diff })
    })

    return { perms, onlyA: onlyACount, onlyB: onlyBCount, same: sameCount }
  }, [roles, compareRoleA, compareRoleB])

  const conflictMap = useMemo(() => {
    const map: Record<string, Record<string, boolean>> = {}
    conflicts.forEach(c => {
      if (!map[c.roleId]) map[c.roleId] = {}
      map[c.roleId][c.permId] = true
    })
    return map
  }, [conflicts])

  return (
    <div className="tm-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--vl-space-5)', flexWrap: 'wrap', gap: 'var(--vl-space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-3)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--vl-radius-md)', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield style={{ width: 20, height: 20, color: '#8b5cf6' }} />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--vl-text-lg)', fontWeight: 700, color: 'var(--vl-text-heading)', margin: 0 }}>Permissions Matrix</h2>
            <p style={{ fontSize: 'var(--vl-text-xs)', color: 'var(--vl-text-muted)', margin: '2px 0 0' }}>Manage role-based access control for your team</p>
          </div>
        </div>
        <div className="pm-export-bar">
          <button className="pm-export-btn" onClick={exportAsJSON}>
            <FileJson style={{ width: 14, height: 14 }} />
            JSON
          </button>
          <button className="pm-export-btn" onClick={exportAsCSV}>
            <FileText style={{ width: 14, height: 14 }} />
            CSV
          </button>
          {conflicts.length > 0 && (
            <span className="pm-conflict-badge">
              <AlertTriangle style={{ width: 12, height: 12 }} />
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tm-tabs">
        <button className={`tm-tab ${activeTab === 'matrix' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('matrix')}>
          <ShieldCheck style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Matrix
        </button>
        <button className={`tm-tab ${activeTab === 'templates' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('templates')}>
          <Copy style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Templates
        </button>
        <button className={`tm-tab ${activeTab === 'comparison' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('comparison')}>
          <GitCompare style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Compare Roles
        </button>
        <button className={`tm-tab ${activeTab === 'audit' ? 'tm-tab-active' : ''}`} onClick={() => setActiveTab('audit')}>
          <Activity style={{ width: 14, height: 14, marginRight: 4, display: 'inline' }} />
          Audit Log
        </button>
      </div>

      {/* Matrix Tab */}
      {activeTab === 'matrix' && (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--vl-radius-lg)', border: '1px solid var(--vl-border-subtle)' }}>
          <table className="pm-matrix-table">
            <thead>
              <tr>
                <th className="pm-role-header" style={{ minWidth: 140 }}>Role</th>
                {PERMISSIONS.map(perm => (
                  <th key={perm.id} className="pm-permission-header" style={{ minWidth: 100 }}>
                    {perm.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role, roleIdx) => {
                const roleColor = ROLE_COLORS_HEX[role.name] ?? role.color
                const hasConflict = conflictMap[role.id]
                return (
                  <tr
                    key={role.id}
                    className={hasConflict ? 'pm-conflict-row' : ''}
                    style={{ animationDelay: `${roleIdx * 40}ms` }}
                  >
                    <td>
                      <div className="pm-permission-label">
                        <span className="tm-role-color-dot" style={{ background: roleColor }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 'var(--vl-text-sm)' }}>{role.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--vl-text-muted)' }}>{role.description}</div>
                        </div>
                      </div>
                    </td>
                    {PERMISSIONS.map(perm => {
                      const granted = role.permissions[perm.id] ?? false
                      const isInherited = inheritedPerms[role.id]?.has(perm.id)
                      const isConflict = hasConflict?.[perm.id]
                      return (
                        <td
                          key={perm.id}
                          className={`pm-cell ${granted ? (isInherited ? 'pm-cell-inherited' : 'pm-cell-granted') : 'pm-cell-denied'}`}
                          onClick={() => togglePermission(role.id, perm.id)}
                          onMouseEnter={() => setHoveredCell({ roleId: role.id, permId: perm.id })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <div className={`pm-cell-toggle ${granted ? (isInherited ? 'pm-cell-toggle-inherited' : 'pm-cell-toggle-granted') : 'pm-cell-toggle-denied'}`}>
                            {granted ? <Check style={{ width: 16, height: 16 }} /> : <X style={{ width: 16, height: 16 }} />}
                          </div>
                          <div className="pm-cell-tooltip">
                            {perm.description}
                            {isConflict && (
                              <div style={{ color: '#f59e0b', marginTop: 2, fontSize: 10 }}>
                                ⚠ Inheritance conflict
                              </div>
                            )}
                            {isInherited && (
                              <div style={{ color: '#8b5cf6', marginTop: 2, fontSize: 10 }}>
                                ↳ Inherited from parent
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <p style={{ fontSize: 'var(--vl-text-sm)', color: 'var(--vl-text-muted)', marginBottom: 'var(--vl-space-5)' }}>
            Select a permission template to quickly configure role permissions. Click to apply.
          </p>
          <div className="pm-templates-grid">
            {TEMPLATES.map(template => {
              const permCount = Object.values(template.permissions).reduce(
                (sum, rolePerms) => sum + Object.values(rolePerms).filter(Boolean).length, 0
              )
              const isApplied = JSON.stringify(template.permissions) === JSON.stringify(
                Object.fromEntries(roles.map(r => [r.id, r.permissions]))
              )
              return (
                <div
                  key={template.id}
                  className={`pm-template-card ${isApplied ? 'pm-template-card-active' : ''}`}
                  onClick={() => applyTemplate(template)}
                >
                  <div style={{ fontSize: 28, marginBottom: 'var(--vl-space-2)' }}>{template.icon}</div>
                  <div className="pm-template-name">{template.name}</div>
                  <div className="pm-template-desc">{template.description}</div>
                  <div className="pm-template-permissions">
                    <span className="pm-template-perm-tag">{permCount} permissions</span>
                    <span className="pm-template-perm-tag">{Object.keys(template.permissions).length} roles</span>
                    {isApplied && (
                      <span className="pm-template-perm-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                        ✓ Active
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeTab === 'comparison' && (
        <div>
          <p style={{ fontSize: 'var(--vl-text-sm)', color: 'var(--vl-text-muted)', marginBottom: 'var(--vl-space-5)' }}>
            Select two roles to compare their permission differences side by side.
          </p>
          <div className="pm-comparison-selectors">
            <label>Role A</label>
            <select className="pm-comparison-select" value={compareRoleA} onChange={e => setCompareRoleA(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span className="pm-vs-badge">VS</span>
            <label>Role B</label>
            <select className="pm-comparison-select" value={compareRoleB} onChange={e => setCompareRoleB(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--vl-space-3)', marginBottom: 'var(--vl-space-4)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 'var(--vl-radius-full)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontWeight: 600 }}>
              {comparisonData.onlyA} only in {(roles.find(r => r.id === compareRoleA)?.name ?? 'A')}
            </span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 'var(--vl-radius-full)', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontWeight: 600 }}>
              {comparisonData.onlyB} only in {(roles.find(r => r.id === compareRoleB)?.name ?? 'B')}
            </span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 'var(--vl-radius-full)', background: 'var(--vl-bg-secondary)', color: 'var(--vl-text-muted)', fontWeight: 600 }}>
              {comparisonData.same} same
            </span>
          </div>

          <div className="pm-comparison-grid">
            {/* Role A Column */}
            <div className="pm-comparison-col">
              <div className="pm-comparison-header" style={{ borderBottom: `2px solid ${roles.find(r => r.id === compareRoleA)?.color ?? '#ccc'}` }}>
                {roles.find(r => r.id === compareRoleA)?.name ?? 'Role A'}
              </div>
              {comparisonData.perms.map(perm => (
                <div key={perm.id} className="pm-comparison-perm-row">
                  <span className="pm-comparison-perm-name">{perm.name}</span>
                  <span className={`pm-comparison-perm-status ${perm.aHas ? 'pm-comparison-perm-status-granted' : 'pm-comparison-perm-status-denied'}`}>
                    {perm.aHas ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>

            {/* Diff Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 60 }}>
              <div style={{ height: 41 }} />
              {comparisonData.perms.map(perm => (
                <div key={perm.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--vl-space-2) 0', borderBottom: '1px solid var(--vl-border-subtle)' }}>
                  <span className={`pm-comparison-diff ${perm.diff === 'only-a' ? 'pm-comparison-diff-only-left' : perm.diff === 'only-b' ? 'pm-comparison-diff-only-right' : 'pm-comparison-diff-same'}`}>
                    {perm.diff === 'same' ? '=' : perm.diff === 'only-a' ? '←' : '→'}
                  </span>
                </div>
              ))}
            </div>

            {/* Role B Column */}
            <div className="pm-comparison-col">
              <div className="pm-comparison-header" style={{ borderBottom: `2px solid ${roles.find(r => r.id === compareRoleB)?.color ?? '#ccc'}` }}>
                {roles.find(r => r.id === compareRoleB)?.name ?? 'Role B'}
              </div>
              {comparisonData.perms.map(perm => (
                <div key={perm.id} className="pm-comparison-perm-row">
                  <span className="pm-comparison-perm-name">{perm.name}</span>
                  <span className={`pm-comparison-perm-status ${perm.bHas ? 'pm-comparison-perm-status-granted' : 'pm-comparison-perm-status-denied'}`}>
                    {perm.bHas ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'audit' && (
        <div>
          <p style={{ fontSize: 'var(--vl-text-sm)', color: 'var(--vl-text-muted)', marginBottom: 'var(--vl-space-5)' }}>
            Recent permission changes and system events.
          </p>
          <div className="tm-activity-feed" style={{ maxHeight: 600 }}>
            {auditLog.map(entry => (
              <div key={entry.id} className="pm-audit-entry">
                <div className="pm-audit-icon" style={{
                  background: entry.changeType === 'granted' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: entry.changeType === 'granted' ? '#10b981' : '#ef4444',
                }}>
                  {entry.changeType === 'granted' ? <ShieldCheck style={{ width: 14, height: 14 }} /> : <ShieldX style={{ width: 14, height: 14 }} />}
                </div>
                <div className="pm-audit-content">
                  <div className="pm-audit-text">
                    <strong>{entry.actor}</strong> — {entry.description}
                  </div>
                  <div className="pm-audit-time">
                    <Clock style={{ width: 10, height: 10, marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
                    {formatAuditTime(entry.timestamp)}
                  </div>
                </div>
                <span className={`pm-audit-badge ${entry.changeType === 'granted' ? 'pm-audit-badge-granted' : 'pm-audit-badge-revoked'}`}>
                  {entry.changeType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicts Warning */}
      {conflicts.length > 0 && activeTab === 'matrix' && (
        <div style={{
          marginTop: 'var(--vl-space-5)',
          padding: 'var(--vl-space-4)',
          borderRadius: 'var(--vl-radius-md)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--vl-space-2)', marginBottom: 'var(--vl-space-3)' }}>
            <AlertTriangle style={{ width: 16, height: 16, color: '#f59e0b' }} />
            <span style={{ fontSize: 'var(--vl-text-sm)', fontWeight: 600, color: '#b45309' }}>
              {conflicts.length} Permission Conflict{conflicts.length !== 1 ? 's' : ''} Detected
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 'var(--vl-text-xs)', color: '#92400e', lineHeight: 1.8 }}>
            {conflicts.map((c, i) => (
              <li key={i}>{c.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
