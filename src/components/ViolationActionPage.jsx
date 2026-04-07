import { useMemo, useState } from 'react'

const initialRows = [
  {
    eventId: 1,
    cctvNo: 1,
    detectCode: '0:안전모',
    occurredAt: '2026년04월07일 13:01',
    processed: false,
    processedAt: '',
    createdAt: '2026년04월07일 03:01:01',
    updatedAt: '2026년04월07일 13:01:01',
  },
  {
    eventId: 2,
    cctvNo: 1,
    detectCode: '1:안전조끼',
    occurredAt: '2026년04월07일 07:01',
    processed: true,
    processedAt: '2026년04월07일 07:30',
    createdAt: '2026년04월07일 07:01:01',
    updatedAt: '2026년04월07일 07:30:01',
  },
  {
    eventId: 3,
    cctvNo: 3,
    detectCode: '1:안전조끼',
    occurredAt: '2026년04월06일 15:01',
    processed: true,
    processedAt: '2026년04월06일 15:20',
    createdAt: '2026년04월06일 15:01:01',
    updatedAt: '2026년04월06일 15:20:01',
  },
  {
    eventId: 4,
    cctvNo: 2,
    detectCode: '0:안전모',
    occurredAt: '2026년04월05일 15:01',
    processed: true,
    processedAt: '2026년04월05일 15:20',
    createdAt: '2026년04월05일 15:01:01',
    updatedAt: '2026년04월05일 15:20:01',
  },
]

export default function ViolationActionPage({ onBack }) {
  const [rows, setRows] = useState(initialRows)
  const [eventIdQuery, setEventIdQuery] = useState('')
  const [processedFilter, setProcessedFilter] = useState('all')
  const [notice, setNotice] = useState('')

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const idOk = eventIdQuery.trim() ? String(r.eventId).includes(eventIdQuery.trim()) : true
      const processedOk =
        processedFilter === 'all'
          ? true
          : processedFilter === 'yes'
            ? r.processed
            : !r.processed

      return idOk && processedOk
    })
  }, [rows, eventIdQuery, processedFilter])

  const toggleProcessed = (eventId, checked) => {
    setRows((prev) =>
      prev.map((r) =>
        r.eventId === eventId
          ? {
              ...r,
              processed: checked,
              processedAt: checked ? new Date().toLocaleString('ko-KR', { hour12: false }) : '',
              updatedAt: new Date().toLocaleString('ko-KR', { hour12: false }),
            }
          : r,
      ),
    )
  }

  const handleSearch = () => {
    setNotice(`조회 완료: ${filteredRows.length}건`)
    setTimeout(() => setNotice(''), 1600)
  }

  const handleSave = () => {
    setNotice('수정 사항 저장 완료 (Demo)')
    setTimeout(() => setNotice(''), 1800)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-[1600px] rounded-xl border border-slate-300 bg-white p-5 shadow">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="inline-block bg-lime-400 px-3 py-1 text-2xl font-bold">CCTV 안전 위반 조치</h2>
          <button onClick={onBack} className="rounded border border-slate-400 px-3 py-1 text-sm hover:bg-slate-100">대시보드로 돌아가기</button>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <label className="text-3xl leading-none">이벤트ID:</label>
            <input
              value={eventIdQuery}
              onChange={(e) => setEventIdQuery(e.target.value)}
              className="h-10 w-36 border-2 border-blue-800 px-2 text-xl"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-3xl leading-none">처리:</label>
            <select
              value={processedFilter}
              onChange={(e) => setProcessedFilter(e.target.value)}
              className="h-10 w-36 border-2 border-blue-800 px-2 text-2xl"
            >
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <button onClick={handleSearch} className="rounded border-2 border-blue-900 px-5 py-1.5 text-3xl hover:bg-blue-50">조회</button>
            <button onClick={handleSave} className="rounded border-2 border-blue-900 px-5 py-1.5 text-3xl hover:bg-blue-50">수정</button>
          </div>
        </div>

        <p className="mb-2 text-right text-2xl text-red-600">* 안전관리자 담당자만 조치 가능합니다.</p>
        {notice && <p className="mb-2 text-right text-lg text-emerald-700">{notice}</p>}

        <div className="overflow-auto rounded border border-slate-300">
          <table className="w-full min-w-[1200px] border-collapse text-2xl">
            <thead className="bg-blue-700 text-white">
              <tr>
                <th className="border border-slate-200 px-2 py-1">이벤트ID</th>
                <th className="border border-slate-200 px-2 py-1">CCTV번호</th>
                <th className="border border-slate-200 px-2 py-1">감지코드</th>
                <th className="border border-slate-200 px-2 py-1">발생일시</th>
                <th className="border border-slate-200 px-2 py-1">처리</th>
                <th className="border border-slate-200 px-2 py-1">처리일자</th>
                <th className="border border-slate-200 px-2 py-1">생성일자</th>
                <th className="border border-slate-200 px-2 py-1">수정일자</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.eventId} className="odd:bg-slate-200 even:bg-slate-300/80">
                  <td className="border border-slate-100 bg-blue-600 px-2 py-1 text-right font-bold text-white">{row.eventId}</td>
                  <td className="border border-slate-100 px-2 py-1 text-right">{row.cctvNo}</td>
                  <td className="border border-slate-100 px-2 py-1">{row.detectCode}</td>
                  <td className="border border-slate-100 px-2 py-1">{row.occurredAt}</td>
                  <td className="border border-slate-100 px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={row.processed}
                      onChange={(e) => toggleProcessed(row.eventId, e.target.checked)}
                      className="h-7 w-7 accent-blue-700"
                    />
                  </td>
                  <td className="border border-slate-100 px-2 py-1">{row.processedAt || '-'}</td>
                  <td className="border border-slate-100 px-2 py-1">{row.createdAt}</td>
                  <td className="border border-slate-100 px-2 py-1">{row.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
