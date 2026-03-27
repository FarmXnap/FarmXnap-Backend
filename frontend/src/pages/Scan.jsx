import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import Webcam from 'react-webcam'
import { Camera, Upload, X, ChevronDown } from 'lucide-react'
import { useScanStore } from '../store'
import { diagnoseCrop } from '../services/api'

const CROPS = ['Cassava', 'Maize', 'Tomato', 'Yam', 'Rice', 'Other']
const EMOJI = { Cassava: '🌿', Maize: '🌽', Tomato: '🍅', Yam: '🥔', Rice: '🌾', Other: '🌱' }

export default function Scan() {
  const navigate  = useNavigate()
  const webcamRef = useRef(null)
  const fileRef   = useRef(null)
  const { setCapturedImage, cropType, setCropType, setDiagnosis, setLoading, loading } = useScanStore()
  const [capturedFile, setCapturedFile] = useState(null)
  const [preview,     setPreview]     = useState(null)
  const [cameraError, setCameraError] = useState(false)
  const [showCrops,   setShowCrops]   = useState(false)
  const [customCrop,  setCustomCrop]  = useState('')
  const [diagError,   setDiagError]   = useState('')

  const capture = useCallback(() => {
    const img = webcamRef.current?.getScreenshot()
    if (img) { setPreview(img); setCapturedImage(img) }
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result)
      setCapturedImage(reader.result)
      // Also store the raw File for real API upload
      setCapturedFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleDiagnose = async () => {
    if (!preview) return
    setDiagError('')
    setLoading(true)
    try {
      const activeCrop  = cropType === 'Other' ? (customCrop.trim() || 'Other') : cropType
      const imageToSend = capturedFile || preview
      const res = await diagnoseCrop(imageToSend, activeCrop)
      setDiagnosis(res)
      navigate('/results')
    } catch (e) {
      setDiagError(e.message || 'Diagnosis failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div className="page-shell grain">
      <div className="orb orb-1" />

      {/* Nav */}
      <nav className="app-nav">
        <AppLogo />
        <span className="text-(--tx-sub) text-xs font-medium tracking-widest uppercase">Scan</span>
        <button className="nav-close" onClick={() => navigate('/dashboard')}>
          <X size={16} />
        </button>
      </nav>

      {/* Crop selector */}
      <div className="relative z-10 px-6 pt-4 flex-shrink-0">
        <button
          onClick={() => setShowCrops(!showCrops)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm transition-all"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-br)' }}
        >
          <span className="text-lg">{EMOJI[cropType]}</span>
          <span className="flex-1 text-left text-(--tx) font-medium font-dm">
            {cropType === 'Other' && customCrop.trim() ? customCrop.trim() : cropType}
          </span>
          <ChevronDown size={14} className="text-(--tx-sub)" />
        </button>

        {showCrops && (
          <div className="mt-2 anim-1">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {CROPS.map(c => (
                <button key={c}
                  className={`crop-btn ${cropType === c ? 'on' : ''}`}
                  onClick={() => { setCropType(c); if (c !== 'Other') setShowCrops(false) }}>
                  {EMOJI[c]} {c}
                </button>
              ))}
            </div>
            {/* Custom crop input — shown when Other is selected */}
            {cropType === 'Other' && (
              <div className="rounded-2xl overflow-hidden anim-1"
                style={{ background: 'var(--input-bg)', border: '1.5px solid rgba(29,158,117,0.4)' }}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-lg flex-shrink-0">🌱</span>
                  <input
                    className="flex-1 bg-transparent outline-none text-sm text-(--tx) font-dm placeholder-[var(--tx-dim)]"
                    placeholder="Type your crop name…"
                    value={customCrop}
                    autoFocus
                    onChange={e => setCustomCrop(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customCrop.trim()) setShowCrops(false) }}
                    style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
                  />
                  {customCrop.trim() && (
                    <button
                      className="flex-shrink-0 text-xs font-syne font-bold px-3 py-1.5 rounded-xl text-white bg-brand-green active:scale-95 transition-all"
                      onClick={() => setShowCrops(false)}>
                      Done
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera viewport */}
      <div className="flex-1 min-h-0 px-6 pt-3 pb-0 flex flex-col relative z-10">
        <div className="scan-viewport">
          {preview ? (
            <>
              <img src={preview} alt="Captured" className="w-full h-full object-cover" />
              <button
                onClick={() => { setPreview(null); setCapturedFile(null) }}
                className="absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center text-(--tx)"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <X size={15} />
              </button>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <span className="text-xs font-semibold px-4 py-1.5 rounded-full text-brand-green"
                  style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}>
                  ✓ Ready to diagnose
                </span>
              </div>
            </>
          ) : cameraError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              <span className="text-4xl">📷</span>
              <p className="text-(--tx-sub) text-sm text-center leading-relaxed">
                Camera not available.<br />Upload a photo instead.
              </p>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                onUserMediaError={() => setCameraError(true)}
                className="w-full h-full object-cover"
              />
              {/* Scan frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-48 h-48 scan-frame-box">
                  <div className="scan-corner-tl" />
                  <div className="scan-corner-tr" />
                  <div className="scan-corner-bl" />
                  <div className="scan-corner-br" />
                </div>
              </div>
              {/* Beam */}
              <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                <div className="scan-beam" />
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-(--tx-sub) font-medium">
                Point at the affected leaf
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="page-cta">
        {diagError && (
          <div className="err-banner mb-3 anim-1">
            <span>⚠</span> {diagError}
          </div>
        )}
        {preview ? (
          <button className="btn-main" onClick={handleDiagnose} disabled={loading}>
            {loading
              ? <><span className="spinner" /> Analysing with AI…</>
              : <><span>🔬</span> Diagnose this crop →</>
            }
          </button>
        ) : (
          <button className="btn-main" onClick={capture}>
            <Camera size={18} /> Snap photo
          </button>
        )}
        <button className="btn-sub" onClick={() => fileRef.current?.click()}>
          <Upload size={15} className="inline mr-1.5" /> Upload from gallery
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  )
}