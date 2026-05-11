/**
 * @page AdminIntegrationsPage
 * @description Third-party integration settings — Paystack, OPay, Google Maps, FCM.
 * @route /admin/settings/integrations
 */
'use client'

export default function AdminSettingsIntegrationsPage() {
  return (
    <div className="min-h-screen bg-surface">
      <header className="w-full border-b border-outline-variant/20 bg-surface flex justify-between items-center px-8 py-4 sticky top-0 z-40">
        <div>
          <h1 className="font-headline font-extrabold text-2xl text-primary">Integrations</h1>
          <p className="text-xs text-on-surface-variant">Service Architecture</p>
        </div>
        <button className="px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Connect New Service
        </button>
      </header>

      <div className="p-8 space-y-8 max-w-7xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Payment gateways */}
          <div className="col-span-8 space-y-6">
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-secondary-container">account_balance</span>
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-xl text-on-surface">Payment Gateways</h3>
                    <p className="text-xs text-on-surface-variant">Financial settlement & transaction processing</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">2 Active</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-lg text-on-surface">Stripe</span>
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-[10px] font-bold uppercase">Operational</span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">Handles all international courier payments and local disbursements.</p>
                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                    <span className="text-[10px] font-mono text-on-surface-variant/60">ID: strp_9242...</span>
                    <button className="text-primary text-xs font-bold hover:underline">Configure</button>
                  </div>
                </div>
                <div className="bg-surface-container-low rounded-xl p-5 border border-outline-variant/10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-lg text-on-surface italic text-blue-900">PayPal</span>
                    <div className="flex items-center gap-1.5 text-error">
                      <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                      <span className="text-[10px] font-bold uppercase">Action Required</span>
                    </div>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-4">Backup gateway. API credentials expiring soon.</p>
                  <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20">
                    <span className="text-[10px] font-mono text-on-surface-variant/60">ID: payp_0081...</span>
                    <button className="text-error text-xs font-bold hover:underline">Renew Auth</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Maps & logistics */}
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-primary">map</span>
                </div>
                <div>
                  <h3 className="font-headline font-bold text-xl text-on-surface">Logistics & Mapping</h3>
                  <p className="text-xs text-on-surface-variant">Real-time routing and spatial intelligence</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { name: 'Google Maps API', sub: 'Active Traffic Layer • Autocomplete', usage: '₦1,240.82', icon: 'map', iconBg: 'bg-blue-50 text-blue-500' },
                  { name: 'Mapbox Studio', sub: 'Custom Cartography • WebGL Render', usage: '₦412.00', icon: 'pentagon', iconBg: 'bg-black text-white' },
                ].map(svc => (
                  <div key={svc.name} className="flex items-center justify-between p-4 rounded-lg bg-surface hover:bg-surface-container-low transition-colors border border-outline-variant/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${svc.iconBg}`}>
                        <span className="material-symbols-outlined">{svc.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-on-surface">{svc.name}</p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{svc.sub}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-on-surface-variant">Usage this month</p>
                        <p className="text-sm font-mono font-bold text-on-surface">{svc.usage}</p>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant/40">chevron_right</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-4 space-y-6">
            {/* System health */}
            <div className="bg-primary text-on-primary rounded-xl p-6 relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-headline font-bold text-lg mb-2">Network Integrity</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-headline font-extrabold text-4xl">99.98%</span>
                  <span className="text-xs opacity-70">Uptime</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
                    <span>API Latency</span>
                    <span>42ms</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary-fixed h-full w-[85%] rounded-full" />
                  </div>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-primary-container rounded-full opacity-50 blur-3xl" />
            </div>

            {/* Communication */}
            <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-widest mb-6">Communication</h3>
              <div className="space-y-6">
                {[
                  { name: 'Twilio SMS', sub: 'Transactional delivery alerts', usage: '1.2M sent/mo', iconBg: 'bg-red-50 text-red-600', icon: 'sms', status: 'ACTIVE' },
                  { name: 'SendGrid Email', sub: 'Invoices & system reports', usage: '450k sent/mo', iconBg: 'bg-blue-50 text-blue-600', icon: 'mail', status: 'ACTIVE' },
                  { name: 'Firebase Cloud', sub: 'Mobile app push services', usage: '', iconBg: 'bg-amber-50 text-amber-600', icon: 'notifications_active', status: 'IDLE' },
                ].map(svc => (
                  <div key={svc.name} className="flex gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${svc.iconBg}`}>
                      <span className="material-symbols-outlined">{svc.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-bold text-on-surface">{svc.name}</span>
                        <span className={`text-[10px] font-bold ${svc.status === 'ACTIVE' ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}>{svc.status}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">{svc.sub}</p>
                      {svc.usage && <span className="text-[10px] font-mono bg-surface-container-low px-2 py-0.5 rounded mt-1 inline-block">{svc.usage}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook logs */}
            <div className="bg-surface-container-low rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-on-surface">Latest Webhooks</h3>
                <span className="material-symbols-outlined text-on-surface-variant text-sm cursor-pointer hover:text-primary">refresh</span>
              </div>
              <div className="space-y-3">
                {[
                  { code: 'POST 200', event: 'stripe.checkout.success', ok: true },
                  { code: 'POST 200', event: 'twilio.delivery_receipt', ok: true },
                  { code: 'POST 500', event: 'maps.route_update', ok: false },
                ].map((log, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px]">
                    <span className={`font-mono px-1 rounded ${log.ok ? 'text-primary bg-primary-fixed/30' : 'text-error bg-error-container/50'}`}>{log.code}</span>
                    <span className="text-on-surface-variant">{log.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="col-span-12 bg-surface-container-low rounded-xl p-8 flex items-center justify-between gap-6 border-t-4 border-primary">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg shrink-0">
                <span className="material-symbols-outlined text-primary text-3xl">security</span>
              </div>
              <div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Vault Security Protocols</h3>
                <p className="text-sm text-on-surface-variant">All API keys and secrets are encrypted with AES-256 and stored in an isolated environment.</p>
              </div>
            </div>
            <div className="flex gap-4 shrink-0">
              <button className="px-6 py-2 bg-white text-on-surface font-bold rounded-lg hover:bg-surface-container-high transition-colors">Rotate Keys</button>
              <button className="px-6 py-2 bg-primary text-on-primary font-bold rounded-lg shadow-md">View Audit Log</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
