import { useState, useRef } from 'react'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface ImageStudioProps {
  userId: string
  onBack: () => void
}

const IMAGE_MODELS = [
  { id: 'flux', name: 'Flux', desc: 'Best quality, detailed' },
  { id: 'turbo', name: 'Turbo', desc: 'Fast generation' },
  { id: 'flux-realism', name: 'Flux Realism', desc: 'Photorealistic' },
  { id: 'flux-anime', name: 'Flux Anime', desc: 'Anime style' },
]

const PROMPT_SUGGESTIONS = [
  "A futuristic cyberpunk city at night, neon lights, rain, ultra detailed",
  "Beautiful mountain landscape at sunset, oil painting style",
  "Cute robot playing guitar in a garden, 3D render",
  "Astronaut riding a horse on Mars, cinematic lighting",
  "Ancient Indian temple in a magical forest, golden light",
  "A dragon flying over a crystal lake, fantasy art, 8k",
  "Portrait of a samurai warrior, dramatic lighting, photorealistic",
  "Underwater city with bioluminescent creatures, concept art",
]

export default function ImageStudio({ userId, onBack }: ImageStudioProps) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState(IMAGE_MODELS[0].id)
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; model: string }>>([])
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'generate' | 'remove-bg'>('generate')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [removingBg, setRemovingBg] = useState(false)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateImage = useAction(api.creative.generateImage)
  const removeBackground = useAction(api.creative.removeBackground)
  const saveCreation = useMutation(api.creative.saveCreation)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setError('')
    try {
      const result = await generateImage({
        prompt: prompt.trim(),
        model: selectedModel,
        negativePrompt: negativePrompt || undefined,
      })
      if (result.success && result.imageBase64) {
        const newImage = { url: result.imageBase64, prompt: prompt, model: selectedModel }
        setGeneratedImages(prev => [newImage, ...prev])
        // Save to gallery
        await saveCreation({
          userId: userId as any,
          type: 'image',
          prompt: prompt,
          model: selectedModel,
          dataUrl: result.imageBase64,
        })
      } else {
        setError((result as any).error || 'Generation failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate image')
    }
    setGenerating(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveBg = async () => {
    if (!uploadedImage) return
    setRemovingBg(true)
    setError('')
    try {
      const result = await removeBackground({ imageBase64: uploadedImage })
      if (result.success && result.imageBase64) {
        setProcessedImage(result.imageBase64)
      } else {
        setError((result as any).error || 'Background removal failed')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove background')
    }
    setRemovingBg(false)
  }

  const downloadImage = async (dataUrl: string, filename: string) => {
    try {
      // For URLs (not base64), fetch and convert to blob for proper download
      if (dataUrl.startsWith('http')) {
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        link.click()
        URL.revokeObjectURL(blobUrl)
      } else {
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = filename
        link.click()
      }
    } catch {
      // Fallback: open in new tab
      window.open(dataUrl, '_blank')
    }
  }

  const btnStyle = (active: boolean) => ({
    padding: '10px 20px',
    borderRadius: '10px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500 as const,
    fontSize: '14px',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    background: active ? 'linear-gradient(135deg, #f97316, #ec4899)' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  })

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="is-topbar" style={{
        padding: '16px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)',
          border: 'none',
          color: '#fff',
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#fff' }}>AI Image Studio</h2>
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Powered by Pollinations AI - 100% Free & Unlimited</p>
        </div>

        {/* Tabs */}
        <div className="is-tabs" style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button className="is-tab-btn" onClick={() => setActiveTab('generate')} style={btnStyle(activeTab === 'generate')}>
            Text to Image
          </button>
          <button className="is-tab-btn" onClick={() => setActiveTab('remove-bg')} style={btnStyle(activeTab === 'remove-bg')}>
            Remove Background
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="is-content" style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {activeTab === 'generate' ? (
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* Prompt Input */}
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: '20px',
            }}>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create... (e.g., 'A magical forest with glowing mushrooms')"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                  padding: '14px 16px',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleGenerate()
                  }
                }}
              />

              {/* Advanced Options */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '8px 0',
                  fontFamily: 'inherit',
                }}
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              </button>

              {showAdvanced && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>
                    Negative Prompt (what to avoid)
                  </label>
                  <input
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, bad quality, distorted..."
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Model Selection */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px' }}>
                  AI Model
                </label>
                <div className="is-model-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {IMAGE_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: selectedModel === model.id
                          ? '1px solid rgba(249,115,22,0.5)'
                          : '1px solid rgba(255,255,255,0.08)',
                        background: selectedModel === model.id
                          ? 'rgba(249,115,22,0.15)'
                          : 'rgba(255,255,255,0.03)',
                        color: selectedModel === model.id ? '#f97316' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontFamily: 'inherit',
                      }}
                    >
                      <div style={{ fontWeight: 500 }}>{model.name}</div>
                      <div style={{ fontSize: '10px', opacity: 0.6 }}>{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: generating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f97316, #ec4899)',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: generating ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {generating ? (
                  <>
                    <div style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                    Generating... (20-40 seconds)
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    Generate Image
                  </>
                )}
              </button>
            </div>

            {/* Prompt Suggestions */}
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Try these prompts:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PROMPT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                      color: 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(249,115,22,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                fontSize: '13px',
                marginBottom: '20px',
              }}>
                {error}
              </div>
            )}

            {/* Generated Images Grid */}
            {generatedImages.length > 0 && (
              <div>
                <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '16px' }}>
                  Generated Images ({generatedImages.length})
                </h3>
                <div className="is-image-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}>
                  {generatedImages.map((img, i) => (
                    <div key={i} style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.08)',
                      background: 'rgba(255,255,255,0.03)',
                    }}>
                      <img src={img.url} alt={img.prompt} style={{ width: '100%', display: 'block' }} />
                      <div style={{ padding: '12px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                          {img.prompt}
                        </p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => downloadImage(img.url, `ai-image-${i}.png`)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid rgba(255,255,255,0.1)',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#fff',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                            }}
                          >
                            Download
                          </button>
                          <button
                            onClick={() => setPrompt(img.prompt)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '8px',
                              border: '1px solid rgba(249,115,22,0.2)',
                              background: 'rgba(249,115,22,0.1)',
                              color: '#f97316',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontFamily: 'inherit',
                            }}
                          >
                            Regenerate
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Remove Background Tab */
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />

              {!uploadedImage ? (
                <div
                  className="is-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed rgba(255,255,255,0.15)',
                    borderRadius: '12px',
                    padding: '60px 20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
                    e.currentTarget.style.background = 'rgba(249,115,22,0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>Click to upload image</p>
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Supports JPG, PNG, WEBP</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' }}>Original</p>
                      <img src={uploadedImage} alt="Original" style={{
                        maxWidth: '300px', maxHeight: '300px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      }} />
                    </div>
                    {processedImage && (
                      <div>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' }}>Background Removed</p>
                        <img src={processedImage} alt="Processed" style={{
                          maxWidth: '300px', maxHeight: '300px', borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.1)', background: 'repeating-conic-gradient(#333 0% 25%, #444 0% 50%) 50% / 20px 20px',
                        }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                    <button
                      onClick={handleRemoveBg}
                      disabled={removingBg}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '10px',
                        border: 'none',
                        background: removingBg ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f97316, #ec4899)',
                        color: '#fff',
                        cursor: removingBg ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        fontFamily: 'inherit',
                      }}
                    >
                      {removingBg ? 'Removing...' : 'Remove Background'}
                    </button>
                    <button
                      onClick={() => { setUploadedImage(null); setProcessedImage(null) }}
                      style={{
                        padding: '12px 24px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                        fontSize: '14px', fontFamily: 'inherit',
                      }}
                    >
                      Upload New
                    </button>
                    {processedImage && (
                      <button
                        onClick={() => downloadImage(processedImage, 'no-bg.png')}
                        style={{
                          padding: '12px 24px', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)',
                          background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer',
                          fontSize: '14px', fontFamily: 'inherit',
                        }}
                      >
                        Download
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px', marginTop: '16px',
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .is-topbar {
            padding: 12px 16px !important;
            flex-wrap: wrap !important;
            gap: 10px !important;
          }
          .is-tabs {
            margin-left: 0 !important;
            width: 100% !important;
            order: 3 !important;
          }
          .is-tab-btn {
            flex: 1 !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            text-align: center !important;
          }
          .is-content {
            padding: 16px !important;
          }
          .is-model-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          .is-model-grid button {
            width: 100% !important;
            padding: 6px 10px !important;
            font-size: 11px !important;
          }
          .is-image-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .is-upload-area {
            padding: 30px 16px !important;
          }
        }
      `}</style>
    </div>
  )
}
