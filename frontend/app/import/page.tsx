'use client'

import { useRef, useState } from 'react'
import { Layout } from '@/components/Layout'
import { importCSV } from '@/lib/api'
import { useLang } from '@/lib/lang-context'

interface ParsedRow {
  [key: string]: string
}

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = (lines[0] ?? '').split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows: ParsedRow[] = []

  for (let i = 1; i < Math.min(lines.length, 11); i++) {
    const line = lines[i]
    if (!line) continue
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: ParsedRow = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

type UploadStatus = 'idle' | 'parsing' | 'ready' | 'uploading' | 'success' | 'error'

export default function ImportPage() {
  const { t, lang } = useLang()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function processFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setErrorMessage(t.import.csvOnlyError)
      setStatus('error')
      return
    }

    setFile(f)
    setStatus('parsing')
    setErrorMessage(null)
    setSuccessMessage(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setPreview(parsed)
      setStatus('ready')
    }
    reader.onerror = () => {
      setErrorMessage(t.import.readError)
      setStatus('error')
    }
    reader.readAsText(f)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleReset() {
    setFile(null)
    setPreview(null)
    setStatus('idle')
    setErrorMessage(null)
    setSuccessMessage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDownloadSample() {
    const a = document.createElement('a')
    a.href = '/sample_claims.csv'
    a.download = 'sample_claims.csv'
    a.click()
  }

  async function handleImport() {
    if (!file) return

    setStatus('uploading')
    setErrorMessage(null)

    try {
      const result = await importCSV(file)
      setSuccessMessage(t.import.importSuccess(result.rows_imported))
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : t.import.importError)
      setStatus('error')
    }
  }

  return (
    <Layout title={t.import.title} subtitle={t.import.subtitle}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Format info */}
        <div className="bg-[#1A2440]/5 border border-[#1A2440]/10 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-[#1A2440] mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-[#1A2440]">{t.import.formatTitle}</p>
                <button
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#1A2440] border border-[#1A2440]/20 rounded-lg px-3 py-1.5 hover:bg-[#1A2440]/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t.import.downloadSample}
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t.import.formatDesc}</p>
              <code className="text-xs bg-white border border-[#1A2440]/10 rounded px-3 py-1.5 text-[#1A2440] block">
                provider_name, member_id, month, year, category, amount
              </code>
              <p className="text-xs text-gray-500 mt-2">
                {t.import.categoryNote} <strong>category</strong> : Lunettes, Lentilles
              </p>
            </div>
          </div>
        </div>

        {/* Drop zone */}
        {(status === 'idle' || status === 'error') && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#1A2440] bg-[#1A2440]/5'
                : 'border-gray-200 hover:border-[#1A2440]/50 hover:bg-gray-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-[#1A2440]/10' : 'bg-gray-100'
                }`}
              >
                <svg
                  className={`w-8 h-8 transition-colors ${isDragging ? 'text-[#1A2440]' : 'text-gray-400'}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700">
                  {isDragging ? t.import.dropzoneActive : t.import.dropzone}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {lang === 'fr' ? 'ou' : 'or'}{' '}
                  <span className="text-[#1A2440] font-medium underline underline-offset-2">
                    {t.import.dropzoneClick}
                  </span>
                </p>
              </div>
              <p className="text-xs text-gray-300">{t.import.csvOnly}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && status === 'error' && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-[#D62839] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#D62839]">{t.import.errorTitle}</p>
              <p className="text-xs text-red-400 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success */}
        {status === 'success' && successMessage && (
          <div className="bg-green-50 border border-green-100 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#2A9D5C]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2A9D5C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#2A9D5C]">{successMessage}</p>
                <p className="text-xs text-green-500 mt-0.5">{t.import.successSubtitle}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-sm font-medium text-[#2A9D5C] underline underline-offset-2 hover:no-underline"
            >
              {t.import.importAnother}
            </button>
          </div>
        )}

        {/* Parsing state */}
        {status === 'parsing' && (
          <div className="flex items-center justify-center py-8 gap-3">
            <div className="w-5 h-5 border-2 border-gray-200 border-t-[#1A2440] rounded-full animate-spin" />
            <p className="text-sm text-gray-500">{t.import.parsing}</p>
          </div>
        )}

        {/* Preview */}
        {(status === 'ready' || status === 'uploading' || (status === 'error' && preview)) && preview && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  {t.import.previewTitle} — {file?.name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{t.import.previewSubtitle}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t.import.change}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {preview.headers.map((header) => (
                      <th
                        key={header}
                        className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      {preview.headers.map((header) => (
                        <td key={header} className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">{t.import.verifyNote}</p>
              <button
                onClick={handleImport}
                disabled={status === 'uploading'}
                className="flex items-center gap-2 bg-[#1A2440] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243255] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'uploading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t.import.importing}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {t.import.confirm}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
