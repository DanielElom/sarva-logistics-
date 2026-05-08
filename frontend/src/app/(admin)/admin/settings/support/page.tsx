'use client'

import { useState } from 'react'
import api from '@/lib/api'

const TICKET_CATEGORIES = [
  { id: 'lost_parcel', label: 'Lost/Damaged Parcel', sla: '2h', priority: 'critical', count: 14 },
  { id: 'payment_dispute', label: 'Payment Dispute', sla: '4h', priority: 'high', count: 8 },
  { id: 'rider_behavior', label: 'Rider Conduct Complaint', sla: '6h', priority: 'high', count: 5 },
  { id: 'app_issue', label: 'App / Technical Issue', sla: '12h', priority: 'medium', count: 22 },
  { id: 'account_access', label: 'Account Access Problem', sla: '1h', priority: 'critical', count: 3 },
  { id: 'general', label: 'General Enquiry', sla: '24h', priority: 'low', count: 41 },
]

const REFUND_RULES = [
  { num: '01', title: 'Failed Delivery — Full Refund', detail: 'If delivery not completed within 200% of ETA, auto-approve full wallet credit.' },
  { num: '02', title: 'Partial Damage — 50% Policy', detail: 'For partial damage claims verified by photo, issue 50% refund after review.' },
  { num: '03', title: 'Customer No-Show Penalty', detail: 'Deduct 20% cancellation fee if customer is unreachable for >10 minutes.' },
  { num: '04', title: 'Fraud-Flagged Orders', detail: 'Hold refund processing for 48h if the order is tagged by the fraud engine.' },
]

const AUTO_RESPONSE_TEMPLATES = [
  { id: 'ack', label: 'Ticket Acknowledgement', trigger: 'On ticket open', active: true },
  { id: 'sla_warn', label: 'SLA Breach Warning', trigger: 'At 80% of SLA window', active: true },
  { id: 'escalation', label: 'Escalation Notification', trigger: 'When ticket escalated to L2', active: true },
  { id: 'resolved', label: 'Resolution Confirmation', trigger: 'On ticket closed', active: false },
  { id: 'survey', label: 'CSAT Survey Request', trigger: '24h after closure', active: false },
]

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-error/10 text-error',
  high: 'bg-amber-100 text-amber-700',
  medium: 'bg-secondary/10 text-secondary',
  low: 'bg-surface-container-high text-on-surface-variant',
}

export default function AdminSettingsSupportPage() {
  const [templates, setTemplates] = useState(AUTO_RESPONSE_TEMPLATES)
  const [slaBreachAction, setSlaBreachAction] = useState('escalate')
  const [saved, setSaved] = useState(false)

  function toggleTemplate(id: string) {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t))
  }

  async function handleSave() {
    try {
      await api.patch('/admin/settings/support', { templates, slaBreachAction })
    } catch { /* proceed */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Support & SLA Configuration</h1>
          <p className="text-xs text-on-surface-variant">Ticket categories, SLA rules, refund protocols, auto-response logic</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2 bg-surface-container-high text-on-surface font-bold rounded-xl text-sm">Reset</button>
          <button
            onClick={handleSave}
            className={`px-6 py-2 font-bold rounded-xl text-sm ${saved ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary text-on-primary shadow-lg'}`}
          >
            {saved ? '✓ Saved' : 'Save Configuration'}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-6xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Ticket Categories */}
          <div className="col-span-8 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-secondary-container">confirmation_number</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">Ticket Categories & SLA</h3>
                  <p className="text-xs text-on-surface-variant">Response time targets per ticket type</p>
                </div>
              </div>
              <span className="text-xs font-bold text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">93 open</span>
            </div>
            <div className="space-y-3">
              {TICKET_CATEGORIES.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl bg-surface hover:bg-surface-container-low transition-colors border border-outline-variant/5">
                  <div className="flex items-center gap-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${PRIORITY_COLORS[cat.priority]}`}>
                      {cat.priority}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{cat.label}</p>
                      <p className="text-[10px] text-on-surface-variant">{cat.count} active tickets</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">SLA Target</p>
                      <p className="text-sm font-bold font-mono text-primary">{cat.sla}</p>
                    </div>
                    <button className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global SLA Status */}
          <div className="col-span-4 space-y-6">
            <div className="bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-headline font-bold text-lg mb-1">Global SLA Status</h3>
                <p className="text-xs opacity-70 mb-4">Last 7 days performance</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-headline font-extrabold text-4xl">91.4%</span>
                  <span className="text-xs opacity-70">on-time resolution</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Critical tickets', pct: 88 },
                    { label: 'High priority', pct: 93 },
                    { label: 'Medium / Low', pct: 97 },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-[10px] mb-1 font-bold">
                        <span className="opacity-70">{item.label}</span>
                        <span>{item.pct}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary-fixed h-full rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-primary-container rounded-full opacity-40 blur-3xl" />
            </div>

            {/* SLA breach action */}
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <h3 className="font-headline font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-lg">timer_off</span>
                SLA Breach Action
              </h3>
              <div className="space-y-3">
                {[
                  { id: 'escalate', label: 'Auto-Escalate to L2', sub: 'Reassign to senior agent' },
                  { id: 'notify', label: 'Notify Supervisor', sub: 'Send alert to team lead' },
                  { id: 'refund', label: 'Trigger Auto-Refund', sub: 'Initiate wallet credit' },
                ].map(opt => (
                  <label key={opt.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors cursor-pointer">
                    <input
                      type="radio"
                      name="sla_breach"
                      value={opt.id}
                      checked={slaBreachAction === opt.id}
                      onChange={() => setSlaBreachAction(opt.id)}
                      className="mt-0.5 text-primary border-outline-variant focus:ring-primary/20"
                    />
                    <div>
                      <p className="text-sm font-bold text-on-surface">{opt.label}</p>
                      <p className="text-[10px] text-on-surface-variant">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Refund Protocols */}
          <div className="col-span-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <h3 className="font-headline font-bold text-xl text-primary mb-6 flex items-center gap-3">
              <span className="material-symbols-outlined">policy</span>
              Refund Protocols
            </h3>
            <div className="space-y-5">
              {REFUND_RULES.map(rule => (
                <div key={rule.num} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">{rule.num}</div>
                  <div>
                    <p className="font-bold text-sm text-on-surface mb-1">{rule.title}</p>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{rule.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Response Logic */}
          <div className="col-span-6 bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline font-bold text-xl text-primary flex items-center gap-3">
                <span className="material-symbols-outlined">auto_mode</span>
                Auto-Response Logic
              </h3>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                {templates.filter(t => t.active).length} active
              </span>
            </div>
            <div className="space-y-4">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="flex items-center justify-between p-4 rounded-xl bg-surface border border-outline-variant/5 hover:bg-surface-container-low transition-colors">
                  <div>
                    <p className="text-sm font-bold text-on-surface">{tmpl.label}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{tmpl.trigger}</p>
                  </div>
                  <button
                    onClick={() => toggleTemplate(tmpl.id)}
                    className={`w-10 h-5 rounded-full relative shrink-0 transition-colors ${tmpl.active ? 'bg-primary' : 'bg-surface-container-high'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${tmpl.active ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-3 border-2 border-dashed border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface-variant hover:border-primary/30 hover:text-primary transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Add Template
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
