import { useState, useRef, useEffect } from 'react'
import { useMutation, useAction, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface AIHumanizerProps {
  userId: string
  onBack: () => void
}

const MODES = [
  { id: 'standard', label: 'Standard', desc: 'Balanced human tone', icon: '🎯', color: '#06b6d4' },
  { id: 'academic', label: 'Academic', desc: 'Scholarly & natural', icon: '🎓', color: '#8b5cf6' },
  { id: 'casual', label: 'Casual', desc: 'Friendly & relaxed', icon: '💬', color: '#f97316' },
  { id: 'professional', label: 'Professional', desc: 'Business ready', icon: '💼', color: '#19c37d' },
  { id: 'creative', label: 'Creative', desc: 'Vivid & engaging', icon: '🎨', color: '#ec4899' },
  { id: 'storyteller', label: 'Storyteller', desc: 'Narrative style', icon: '📖', color: '#eab308' },
]

const INTENSITY_LEVELS = [
  { level: 1, label: 'Light', desc: 'Minimal changes, remove AI patterns' },
  { level: 2, label: 'Medium', desc: 'Restructure & reword throughout' },
  { level: 3, label: 'Heavy', desc: 'Complete rewrite, fully human' },
]

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Fast' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B' },
]

export default function AIHumanizer({ userId, onBack }: AIHumanizerProps) {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [selectedMode, setSelectedMode] = useState('standard')
  const [intensity, setIntensity] = useState(2)
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [activeTab, setActiveTab] = useState<'humanize' | 'detect' | 'history'>('humanize')
  const outputRef = useRef<HTMLTextAreaElement>(null)

  // Detection states
  const [detectText, setDetectText] = useState('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<any>(null)
  const [detectError, setDetectError] = useState('')

  const humanize = useAction(api.humanizer.humanizeText)
  const detectAI = useAction(api.humanizer.detectAI)
  const saveHumanized = useMutation(api.humanizer.saveHumanized)
  const history = useQuery(api.humanizer.getHistory, { userId: userId as any })
  const deleteEntry = useMutation(api.humanizer.deleteEntry)

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = (text: string) => text.length

  const handleHumanize = async () => {
    if (!inputText.trim()) return
    setIsProcessing(true)
    setError('')
    setOutputText('')

    try {
      const result = await humanize({
        text: inputText.trim(),
        mode: selectedMode,
        intensity,
        model: selectedModel,
      })

      if (result.success && result.result) {
        setOutputText(result.result)
        // Auto-save to history
        await saveHumanized({
          userId: userId as any,
          originalText: inputText.trim(),
          humanizedText: result.result,
          mode: selectedMode,
          intensity,
          model: result.model || selectedModel,
        })
      } else {
        setError(result.error || 'Failed to humanize text')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCopy = async () => {
    if (!outputText) return
    try {
      await navigator.clipboard.writeText(outputText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = outputText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClear = () => {
    setInputText('')
    setOutputText('')
    setError('')
  }

  // AI Detection handler
  const handleDetect = async () => {
    if (!detectText.trim()) return
    setIsDetecting(true)
    setDetectError('')
    setDetectionResult(null)

    try {
      const result = await detectAI({
        text: detectText.trim(),
        model: selectedModel,
      })

      if (result.success) {
        setDetectionResult(result)
      } else {
        setDetectError(result.error || 'Detection failed')
      }
    } catch (err: any) {
      setDetectError(err.message || 'Something went wrong')
    } finally {
      setIsDetecting(false)
    }
  }

  // Send detected AI text to humanizer
  const sendToHumanize = () => {
    setInputText(detectText)
    setOutputText('')
    setActiveTab('humanize')
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score <= 20) return '#19c37d'  // Green - Human
    if (score <= 40) return '#22d3ee'  // Cyan - Likely Human
    if (score <= 60) return '#f59e0b'  // Amber - Mixed
    if (score <= 80) return '#f97316'  // Orange - Likely AI
    return '#ef4444'  // Red - AI Generated
  }

  // Get verdict emoji
  const getVerdictEmoji = (verdict: string) => {
    if (verdict.includes('Human Written')) return '✅'
    if (verdict.includes('Likely Human')) return '🟢'
    if (verdict.includes('Mixed') || verdict.includes('Uncertain')) return '🟡'
    if (verdict.includes('Likely AI')) return '🟠'
    return '🔴'
  }

  const loadFromHistory = (original: string, humanized: string) => {
    setInputText(original)
    setOutputText(humanized)
    setActiveTab('humanize')
  }

  const currentMode = MODES.find(m => m.id === selectedMode) || MODES[0]

  return (
    <div className="ah-root" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#212121',
      color: '#ececec',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div className="ah-header" style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div className="ah-header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex',
              alignItems: 'center', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ececec'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 style={{
              margin: 0, fontSize: '20px', fontWeight: 600,
              background: 'linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AI Humanizer
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              Transform AI text into natural human writing
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="ah-tabs" style={{
          display: 'flex', gap: '4px', backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '10px', padding: '3px',
        }}>
          {(['humanize', 'detect', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 16px', border: 'none', borderRadius: '8px',
                backgroundColor: activeTab === tab ? (tab === 'detect' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)') : 'transparent',
                color: activeTab === tab ? (tab === 'detect' ? '#f87171' : '#ececec') : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              {tab === 'humanize' ? 'Humanize' : tab === 'detect' ? 'AI Detect' : 'History'}
              {tab === 'history' && history && history.length > 0 && (
                <span style={{
                  marginLeft: '6px', backgroundColor: 'rgba(139,92,246,0.3)',
                  color: '#a78bfa', padding: '1px 6px', borderRadius: '10px',
                  fontSize: '11px',
                }}>{history.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'detect' ? (
        /* ========== AI DETECTION TAB ========== */
        <div className="ah-content" style={{
          flex: 1, overflow: 'auto', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {/* Detection Header */}
          <div className="ah-detect-header" style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(249,115,22,0.08))',
            border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #ef4444, #f97316)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#ececec' }}>AI Content Detector</h3>
                <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  Paste any text, code, essay - detect if AI generated
                </p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            flex: detectionResult ? undefined : 1,
            minHeight: '180px',
          }}>
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                Paste Text to Analyze
              </span>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                <span>{wordCount(detectText)} words</span>
                <span>{charCount(detectText)} chars</span>
              </div>
            </div>
            <textarea
              value={detectText}
              onChange={e => setDetectText(e.target.value)}
              placeholder={"Paste any content here to check if it's AI-generated...\n\nWorks with:\n  - Essays & articles\n  - Code (any language)\n  - Academic papers\n  - Blog posts\n  - Social media content\n  - Any text content"}
              style={{
                flex: 1, padding: '14px',
                backgroundColor: 'transparent',
                border: 'none', color: '#ececec',
                fontSize: '14px', lineHeight: '1.6',
                resize: 'none', outline: 'none',
                fontFamily: 'inherit', minHeight: '140px',
              }}
            />
          </div>

          {/* Detect Button */}
          <div className="ah-detect-buttons" style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleDetect}
              disabled={!detectText.trim() || isDetecting}
              style={{
                flex: 1, padding: '14px',
                background: isDetecting ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #ef4444, #f97316)',
                border: 'none', borderRadius: '10px',
                color: isDetecting ? 'rgba(255,255,255,0.4)' : '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: isDetecting || !detectText.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.3s',
                opacity: !detectText.trim() ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isDetecting ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'rgba(255,255,255,0.6)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Analyzing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Detect AI Content
                </>
              )}
            </button>
            {detectionResult && (
              <button
                onClick={sendToHumanize}
                style={{
                  padding: '14px 20px',
                  backgroundColor: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  borderRadius: '10px', cursor: 'pointer',
                  color: '#06b6d4', fontSize: '13px', fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(6,182,212,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(6,182,212,0.1)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Humanize This
              </button>
            )}
            <button
              onClick={() => { setDetectText(''); setDetectionResult(null); setDetectError('') }}
              style={{
                padding: '14px 20px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontWeight: 500,
                fontFamily: 'inherit',
              }}
            >
              Clear
            </button>
          </div>

          {/* Error */}
          {detectError && (
            <div style={{
              padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
              color: '#f87171', fontSize: '13px',
            }}>
              {detectError}
            </div>
          )}

          {/* ========== DETECTION RESULTS ========== */}
          {detectionResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Main Score Card */}
              <div className="ah-score-card" style={{
                padding: '24px',
                background: `linear-gradient(135deg, ${getScoreColor(detectionResult.aiScore)}10, ${getScoreColor(detectionResult.aiScore)}05)`,
                border: `1px solid ${getScoreColor(detectionResult.aiScore)}25`,
                borderRadius: '14px',
                textAlign: 'center',
              }}>
                {/* Circular Score */}
                <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 16px' }}>
                  <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={getScoreColor(detectionResult.aiScore)}
                      strokeWidth="10"
                      strokeDasharray={`${(detectionResult.aiScore / 100) * 314} 314`}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)', textAlign: 'center',
                  }}>
                    <div style={{
                      fontSize: '28px', fontWeight: 700,
                      color: getScoreColor(detectionResult.aiScore),
                    }}>
                      {detectionResult.aiScore}%
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                      AI Score
                    </div>
                  </div>
                </div>

                {/* Verdict */}
                <div style={{
                  fontSize: '22px', fontWeight: 700,
                  color: getScoreColor(detectionResult.aiScore),
                  marginBottom: '6px',
                }}>
                  {getVerdictEmoji(detectionResult.verdict)} {detectionResult.verdict}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                  Confidence: {detectionResult.confidence}% | Method: {detectionResult.method === 'hybrid' ? 'AI + Pattern Analysis' : 'Pattern Analysis'}
                </div>

                {/* Summary */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  fontSize: '13px', color: 'rgba(255,255,255,0.65)',
                  lineHeight: '1.6', textAlign: 'left',
                }}>
                  {detectionResult.summary}
                </div>
              </div>

              {/* Detailed Breakdown */}
              {detectionResult.breakdown && (
                <div className="ah-breakdown-card" style={{
                  padding: '16px 20px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    margin: '0 0 14px', fontSize: '14px', fontWeight: 600,
                    color: '#ececec', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Detailed Analysis
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(detectionResult.breakdown).map(([key, val]: [string, any]) => (
                      <div key={key}>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          alignItems: 'center', marginBottom: '4px',
                        }}>
                          <span style={{
                            fontSize: '12px', fontWeight: 600,
                            color: 'rgba(255,255,255,0.7)',
                            textTransform: 'capitalize',
                          }}>
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span style={{
                            fontSize: '12px', fontWeight: 700,
                            color: getScoreColor(val.score),
                          }}>
                            {val.score}%
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div style={{
                          height: '6px', borderRadius: '3px',
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden', marginBottom: '4px',
                        }}>
                          <div style={{
                            height: '100%', borderRadius: '3px',
                            backgroundColor: getScoreColor(val.score),
                            width: `${val.score}%`,
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                          {val.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Phrases Found */}
              {detectionResult.aiPhrasesFound && detectionResult.aiPhrasesFound.length > 0 && (
                <div style={{
                  padding: '16px 20px',
                  backgroundColor: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.12)',
                  borderRadius: '12px',
                }}>
                  <h4 style={{
                    margin: '0 0 10px', fontSize: '14px', fontWeight: 600,
                    color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    AI-Typical Phrases Detected ({detectionResult.aiPhrasesFound.length})
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {detectionResult.aiPhrasesFound.map((phrase: string, i: number) => (
                      <span key={i} style={{
                        padding: '4px 10px',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.15)',
                        borderRadius: '6px',
                        fontSize: '11px', color: '#fca5a5',
                        fontFamily: 'inherit',
                      }}>
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Score Breakdown Bar */}
              {detectionResult.method === 'hybrid' && (
                <div className="ah-score-bar" style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', justifyContent: 'space-around',
                  fontSize: '12px',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>AI Model Score</div>
                    <div style={{ color: getScoreColor(detectionResult.aiModelScore || 0), fontWeight: 600 }}>
                      {detectionResult.aiModelScore || 0}%
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Pattern Score</div>
                    <div style={{ color: getScoreColor(detectionResult.localScore || 0), fontWeight: 600 }}>
                      {detectionResult.localScore || 0}%
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Combined</div>
                    <div style={{ color: getScoreColor(detectionResult.aiScore), fontWeight: 700, fontSize: '14px' }}>
                      {detectionResult.aiScore}%
                    </div>
                  </div>
                  <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Words</div>
                    <div style={{ color: '#ececec', fontWeight: 600 }}>
                      {wordCount(detectText)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === 'humanize' ? (
        <div className="ah-content" style={{
          flex: 1, overflow: 'auto', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}>
          {/* Mode Selection */}
          <div>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
              Humanization Mode
            </label>
            <div className="ah-mode-grid" style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px',
            }}>
              {MODES.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedMode === mode.id ? `${mode.color}15` : 'rgba(255,255,255,0.03)',
                    border: selectedMode === mode.id ? `1px solid ${mode.color}40` : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    if (selectedMode !== mode.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'
                  }}
                  onMouseLeave={e => {
                    if (selectedMode !== mode.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '16px' }}>{mode.icon}</span>
                    <span style={{
                      fontSize: '13px', fontWeight: 600,
                      color: selectedMode === mode.id ? mode.color : '#ececec',
                    }}>{mode.label}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{mode.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Intensity & Model Row */}
          <div className="ah-intensity-model-row" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {/* Intensity Slider */}
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
                Intensity: <span style={{ color: currentMode.color, fontWeight: 600 }}>
                  {INTENSITY_LEVELS[intensity - 1].label}
                </span>
              </label>
              <div style={{
                display: 'flex', gap: '6px',
              }}>
                {INTENSITY_LEVELS.map(lvl => (
                  <button
                    key={lvl.level}
                    onClick={() => setIntensity(lvl.level)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      backgroundColor: intensity === lvl.level ? `${currentMode.color}20` : 'rgba(255,255,255,0.03)',
                      border: intensity === lvl.level ? `1px solid ${currentMode.color}40` : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px', cursor: 'pointer',
                      fontFamily: 'inherit', transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{
                      fontSize: '13px', fontWeight: 600,
                      color: intensity === lvl.level ? currentMode.color : 'rgba(255,255,255,0.7)',
                    }}>{lvl.label}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{lvl.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div style={{ minWidth: '200px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
                AI Model
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px', color: '#ececec',
                  fontSize: '13px', fontFamily: 'inherit',
                  cursor: 'pointer', outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                }}
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id} style={{ backgroundColor: '#2d2d2d' }}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Input / Output Panels */}
          <div className="ah-io-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '16px', flex: 1, minHeight: '300px',
          }}>
            {/* Input Panel */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
                  Input Text (AI Generated)
                </span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  <span>{wordCount(inputText)} words</span>
                  <span>{charCount(inputText)} chars</span>
                </div>
              </div>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Paste your AI-generated text here...&#10;&#10;The AI Humanizer will rewrite it to sound natural and bypass AI detection."
                style={{
                  flex: 1, padding: '14px',
                  backgroundColor: 'transparent',
                  border: 'none', color: '#ececec',
                  fontSize: '14px', lineHeight: '1.6',
                  resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Output Panel */}
            <div style={{
              display: 'flex', flexDirection: 'column',
              backgroundColor: outputText ? `${currentMode.color}08` : 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: outputText ? `1px solid ${currentMode.color}20` : '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden',
              transition: 'all 0.3s',
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: outputText ? currentMode.color : 'rgba(255,255,255,0.7)' }}>
                  Humanized Output
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {outputText && (
                    <>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                        {wordCount(outputText)} words
                      </span>
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: '4px 10px', backgroundColor: copied ? 'rgba(25,195,125,0.2)' : 'rgba(255,255,255,0.08)',
                          border: 'none', borderRadius: '6px', cursor: 'pointer',
                          color: copied ? '#19c37d' : 'rgba(255,255,255,0.6)',
                          fontSize: '12px', fontFamily: 'inherit', fontWeight: 500,
                          transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        {copied ? (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <textarea
                ref={outputRef}
                value={isProcessing ? '' : outputText}
                readOnly
                placeholder={isProcessing ? '' : 'Humanized text will appear here...'}
                style={{
                  flex: 1, padding: '14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: outputText ? '#ececec' : 'rgba(255,255,255,0.3)',
                  fontSize: '14px', lineHeight: '1.6',
                  resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              {isProcessing && (
                <div style={{
                  position: 'absolute', top: '50%', left: '75%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '12px',
                }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    border: `3px solid ${currentMode.color}30`,
                    borderTopColor: currentMode.color,
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    Humanizing...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', backgroundColor: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px',
              color: '#f87171', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="ah-action-buttons" style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={handleHumanize}
              disabled={!inputText.trim() || isProcessing}
              style={{
                flex: 1, padding: '14px',
                background: isProcessing
                  ? 'rgba(255,255,255,0.05)'
                  : `linear-gradient(135deg, ${currentMode.color}, ${currentMode.color}cc)`,
                border: 'none', borderRadius: '10px',
                color: isProcessing ? 'rgba(255,255,255,0.4)' : '#fff',
                fontSize: '15px', fontWeight: 600,
                cursor: isProcessing || !inputText.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.3s',
                opacity: !inputText.trim() ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {isProcessing ? (
                <>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'rgba(255,255,255,0.6)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Humanizing...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Humanize Text
                </>
              )}
            </button>

            {outputText && (
              <button
                onClick={() => {
                  setInputText(outputText)
                  setOutputText('')
                }}
                title="Re-humanize the output"
                style={{
                  padding: '14px 20px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', cursor: 'pointer',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px', fontWeight: 500,
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Re-humanize
              </button>
            )}

            <button
              onClick={handleClear}
              style={{
                padding: '14px 20px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '13px', fontWeight: 500,
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
            >
              Clear
            </button>
          </div>

          {/* Word Count Comparison */}
          {outputText && (
            <div className="ah-word-comparison" style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', justifyContent: 'space-around',
              fontSize: '12px',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Original</div>
                <div style={{ color: '#ececec', fontWeight: 600 }}>{wordCount(inputText)} words</div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Humanized</div>
                <div style={{ color: currentMode.color, fontWeight: 600 }}>{wordCount(outputText)} words</div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Change</div>
                <div style={{ color: '#19c37d', fontWeight: 600 }}>
                  {wordCount(outputText) > 0
                    ? `${wordCount(outputText) >= wordCount(inputText) ? '+' : ''}${wordCount(outputText) - wordCount(inputText)} words`
                    : '-'
                  }
                </div>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Mode</div>
                <div style={{ color: currentMode.color, fontWeight: 600 }}>{currentMode.label}</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div style={{
          flex: 1, overflow: 'auto', padding: '20px 24px',
        }}>
          {!history || history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px',
              color: 'rgba(255,255,255,0.3)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No history yet</p>
              <p style={{ fontSize: '13px' }}>Your humanized texts will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((item: any) => {
                const mode = MODES.find(m => m.id === item.mode) || MODES[0]
                return (
                  <div
                    key={item._id}
                    className="ah-history-item"
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '10px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div className="ah-history-meta" style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', marginBottom: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '3px 8px', backgroundColor: `${mode.color}20`,
                          color: mode.color, borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                        }}>
                          {mode.icon} {mode.label}
                        </span>
                        <span style={{
                          padding: '3px 8px', backgroundColor: 'rgba(255,255,255,0.05)',
                          borderRadius: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                        }}>
                          Intensity {item.intensity}/3
                        </span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                          {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => loadFromHistory(item.originalText, item.humanizedText)}
                          style={{
                            padding: '4px 10px', backgroundColor: 'rgba(255,255,255,0.05)',
                            border: 'none', borderRadius: '6px', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ececec' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteEntry({ id: item._id, userId: userId as any })}
                          style={{
                            padding: '4px 8px', backgroundColor: 'transparent',
                            border: 'none', cursor: 'pointer',
                            color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontFamily: 'inherit',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#f87171' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="ah-history-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Original
                        </div>
                        <div style={{
                          fontSize: '12px', color: 'rgba(255,255,255,0.6)',
                          lineHeight: '1.5',
                          maxHeight: '60px', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.originalText.slice(0, 200)}{item.originalText.length > 200 ? '...' : ''}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: mode.color, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600, opacity: 0.7 }}>
                          Humanized
                        </div>
                        <div style={{
                          fontSize: '12px', color: 'rgba(255,255,255,0.8)',
                          lineHeight: '1.5',
                          maxHeight: '60px', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.humanizedText.slice(0, 200)}{item.humanizedText.length > 200 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Spin animation + Mobile responsive */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 768px) {
          .ah-root {
            overflow-y: auto !important;
          }
          .ah-header {
            padding: 10px 12px !important;
            flex-direction: column !important;
            gap: 10px !important;
          }
          .ah-header-left {
            gap: 10px !important;
          }
          .ah-header-left h1 {
            font-size: 17px !important;
          }
          .ah-tabs {
            width: 100% !important;
            justify-content: center !important;
          }
          .ah-tabs button {
            padding: 6px 10px !important;
            font-size: 12px !important;
          }
          .ah-content {
            padding: 12px !important;
            gap: 12px !important;
          }
          .ah-detect-header {
            padding: 12px !important;
          }
          .ah-detect-header h3 {
            font-size: 14px !important;
          }
          .ah-detect-buttons {
            flex-direction: column !important;
          }
          .ah-detect-buttons button {
            width: 100% !important;
          }
          .ah-mode-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .ah-mode-grid button {
            padding: 10px !important;
          }
          .ah-intensity-model-row {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .ah-intensity-model-row > div {
            min-width: 0 !important;
            width: 100% !important;
          }
          .ah-io-grid {
            grid-template-columns: 1fr !important;
            min-height: 200px !important;
          }
          .ah-io-grid textarea {
            min-height: 120px !important;
          }
          .ah-action-buttons {
            flex-direction: column !important;
          }
          .ah-action-buttons button {
            width: 100% !important;
          }
          .ah-word-comparison {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .ah-word-comparison > div[style*="width: 1px"] {
            display: none !important;
          }
          .ah-breakdown-card {
            padding: 12px !important;
          }
          .ah-score-card {
            padding: 16px !important;
          }
          .ah-score-bar {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .ah-score-bar > div[style*="width: 1px"] {
            display: none !important;
          }
          .ah-history-item {
            padding: 10px 12px !important;
          }
          .ah-history-meta {
            flex-direction: column !important;
            gap: 6px !important;
          }
          .ah-history-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
