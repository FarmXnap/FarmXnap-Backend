import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLogo from '../component/AppLogo'
import Webcam from 'react-webcam'
import { Camera, Upload, X } from 'lucide-react'
import { useScanStore } from '../store'
import { diagnoseCrop } from '../services/api'

export default function Scan() {
  const navigate  = useNavigate()
  const webcamRef = useRef(null)
  const fileRef   = useRef(null)
  const { setCapturedImage, setDiagnosis, setLoading, loading } = useScanStore()
  const [capturedFile, setCapturedFile] = useState(null)
  const [preview,      setPreview]      = useState(null)
  const [cameraError,  setCameraError]  = useState(false)
  const [diagError,    setDiagError]    = useState('')

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
      setCapturedFile(file)
    }
    reader.readAsDataURL(file)
  }

  const handleDiagnose = async () => {
    if (!preview) return
    setDiagError('')
    setLoading(true)
    try {
      const imageToSend = capturedFile || preview
      const res = await diagnoseCrop(imageToSend)
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

      {/* Camera viewport */}
      <div className="flex-1 min-h-0 px-6 pt-4 pb-0 flex flex-col relative z-10">
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