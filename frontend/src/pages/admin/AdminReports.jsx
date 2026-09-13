import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { PageSpinner } from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const REASON_LABELS = {
  inappropriate_behavior: 'Inappropriate Behavior',
  harassment: 'Harassment',
  spam: 'Spam',
  fake_profile: 'Fake Profile',
  no_show: 'No-show',
  other: 'Other',
}

export default function AdminReports() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [reviewModal, setReviewModal] = useState({ open: false, report: null })
  const [form, setForm] = useState({ status: 'reviewed', admin_notes: '' })
  const [saving, setSaving] = useState(false)

  const fetchReports = async (status) => {
    setLoading(true)
    try {
      const res = await adminAPI.getReports(status ? { status } : {})
      setReports(res.data.reports || [])
    } catch { toast.error('Failed to fetch reports.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports(filter) }, [filter])

  const openReview = (report) => {
    setReviewModal({ open: true, report })
    setForm({ status: 'reviewed', admin_notes: report.admin_notes || '' })
  }

  const submitReview = async () => {
    setSaving(true)
    try {
      await adminAPI.updateReport(reviewModal.report.id, form)
      toast.success('Report updated.')
      setReviewModal({ open: false, report: null })
      fetchReports(filter)
    } catch { toast.error('Failed to update.') }
    finally { setSaving(false) }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Reports</h1>

      <div className="flex gap-2 flex-wrap">
        {['pending','reviewed','resolved','dismissed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-colors
              ${filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {s}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No {filter} reports.</div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900">{r.reported_name}</span>
                    <span className="text-slate-400">reported by</span>
                    <span className="text-slate-700">{r.reporter_name}</span>
                    <span className={`badge ${r.status === 'pending' ? 'badge-pending' : r.status === 'resolved' ? 'badge-completed' : 'badge-cancelled'}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-600 font-medium">{REASON_LABELS[r.reason] || r.reason}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{format(new Date(r.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  {r.description && <p className="text-sm text-slate-600 mt-2 italic">"{r.description}"</p>}
                  {r.admin_notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded-lg">Admin note: {r.admin_notes}</p>}
                </div>
                {r.status === 'pending' && (
                  <button onClick={() => openReview(r)} className="text-sm px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={reviewModal.open} onClose={() => setReviewModal({ open: false, report: null })}
        title="Review Report">
        {reviewModal.report && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl text-sm">
              <p><strong>{reviewModal.report.reporter_name}</strong> reported <strong>{reviewModal.report.reported_name}</strong></p>
              <p className="text-slate-500 mt-1">Reason: {REASON_LABELS[reviewModal.report.reason]}</p>
              {reviewModal.report.description && <p className="text-slate-600 italic mt-1">"{reviewModal.report.description}"</p>}
            </div>
            <div>
              <label className="label">Update Status</label>
              <select className="border border-slate-200 rounded-xl px-4 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="reviewed">Reviewed</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
            <div>
              <label className="label">Admin Notes</label>
              <textarea className="border border-slate-200 rounded-xl px-4 py-2.5 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
                placeholder="Internal notes…"
                value={form.admin_notes} onChange={e => setForm(p => ({ ...p, admin_notes: e.target.value }))} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal({ open: false, report: null })} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={submitReview} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
