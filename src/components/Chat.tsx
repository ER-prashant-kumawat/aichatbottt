import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { useConvex } from 'convex/react'
import { api } from '../../convex/_generated/api'
import AnimatedLogo from './AnimatedLogo'

interface ChatProps {
  threadId: string
  userId: string
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
}

// ===========================
// PROMPT TEMPLATES
// ===========================
const PROMPT_TEMPLATES = [
  { icon: '💻', label: 'Code Help', prompt: 'Help me write code for: ' },
  { icon: '✍️', label: 'Write Email', prompt: 'Write a professional email about: ' },
  { icon: '📝', label: 'Essay Writer', prompt: 'Write a detailed essay on: ' },
  { icon: '🌐', label: 'Translate', prompt: 'Translate the following to English: ' },
  { icon: '📊', label: 'Explain', prompt: 'Explain in simple terms: ' },
  { icon: '🐛', label: 'Debug Code', prompt: 'Find and fix bugs in this code:\n```\n' },
  { icon: '📋', label: 'Summarize', prompt: 'Summarize the following text:\n' },
  { icon: '💡', label: 'Brainstorm', prompt: 'Give me 10 creative ideas for: ' },
]

// ===========================
// CODE SYNTAX HIGHLIGHTING
// ===========================
function renderMessageContent(content: string) {
  // Split content into code blocks and text
  const parts: { type: 'text' | 'code'; content: string; lang?: string }[] = []
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'code', content: match[2].trim(), lang: match[1] || 'code' })
    lastIndex = match.index + match[0].length
  }
  // Remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content })
  }

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return (
            <div key={i} style={{ margin: '12px 0', position: 'relative' }}>
              {/* Code header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 14px', background: '#1e1e2e', borderRadius: '10px 10px 0 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                  {part.lang || 'code'}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(part.content)}
                  style={{
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', padding: '2px 8px',
                    borderRadius: '4px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#19c37d'; e.currentTarget.style.background = 'rgba(25,195,125,0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'none' }}
                >
                  Copy
                </button>
              </div>
              {/* Code content with syntax coloring */}
              <pre style={{
                margin: 0, padding: '14px 16px', background: '#0d1117',
                borderRadius: '0 0 10px 10px', overflowX: 'auto', fontSize: '13px',
                lineHeight: 1.6, fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                color: '#e6edf3', tabSize: 2,
              }}>
                <code>{highlightSyntax(part.content, part.lang)}</code>
              </pre>
            </div>
          )
        }
        // Text content with inline formatting
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{renderInlineMarkdown(part.content)}</span>
      })}
    </div>
  )
}

// Basic syntax highlighting (no external dependency)
function highlightSyntax(code: string, lang?: string): JSX.Element[] {
  const lines = code.split('\n')
  return lines.map((line, i) => {
    // Colorize keywords, strings, comments, numbers
    const colored = line
      // Comments
      .replace(/(\/\/.*$|#.*$)/gm, '___COMMENT_START___$1___COMMENT_END___')
      // Strings
      .replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, '___STRING_START___$1___STRING_END___')
      // Keywords
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|new|this|def|print|self|True|False|None|int|str|float|public|private|static|void|extends|implements)\b/g, '___KEYWORD_START___$1___KEYWORD_END___')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '___NUMBER_START___$1___NUMBER_END___')

    // Convert markers to JSX
    const parts: JSX.Element[] = []
    let remaining = colored
    let partIdx = 0

    const markers = [
      { start: '___COMMENT_START___', end: '___COMMENT_END___', color: '#6a9955' },
      { start: '___STRING_START___', end: '___STRING_END___', color: '#ce9178' },
      { start: '___KEYWORD_START___', end: '___KEYWORD_END___', color: '#569cd6' },
      { start: '___NUMBER_START___', end: '___NUMBER_END___', color: '#b5cea8' },
    ]

    // Simple replacement approach
    let result = remaining
    for (const m of markers) {
      result = result.split(m.start).join(`<SPAN style="color:${m.color}">`)
      result = result.split(m.end).join('</SPAN>')
    }

    // Parse to JSX
    const spanRegex = /<SPAN style="color:([^"]+)">([^<]*)<\/SPAN>/g
    const elements: JSX.Element[] = []
    let lastIdx = 0
    let spanMatch

    while ((spanMatch = spanRegex.exec(result)) !== null) {
      if (spanMatch.index > lastIdx) {
        elements.push(<span key={`t${lastIdx}`}>{result.slice(lastIdx, spanMatch.index)}</span>)
      }
      elements.push(<span key={`s${spanMatch.index}`} style={{ color: spanMatch[1] }}>{spanMatch[2]}</span>)
      lastIdx = spanMatch.index + spanMatch[0].length
    }
    if (lastIdx < result.length) {
      elements.push(<span key={`e${lastIdx}`}>{result.slice(lastIdx)}</span>)
    }

    return (
      <div key={i} style={{ minHeight: '1.6em' }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', display: 'inline-block', width: '30px', textAlign: 'right', marginRight: '16px', userSelect: 'none', fontSize: '12px' }}>{i + 1}</span>
        {elements.length > 0 ? elements : <span>{line}</span>}
      </div>
    )
  })
}

// Render inline markdown (bold, inline code)
function renderInlineMarkdown(text: string): JSX.Element[] {
  const parts: JSX.Element[] = []
  // Split by bold and inline code
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIdx = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={lastIdx}>{text.slice(lastIdx, match.index)}</span>)
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index} style={{ color: '#fff', fontWeight: 600 }}>{match[0].slice(2, -2)}</strong>)
    } else if (match[0].startsWith('`')) {
      parts.push(<code key={match.index} style={{
        background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px',
        fontSize: '13px', fontFamily: "'Fira Code', monospace", color: '#e6edf3',
      }}>{match[0].slice(1, -1)}</code>)
    }
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < text.length) {
    parts.push(<span key={lastIdx}>{text.slice(lastIdx)}</span>)
  }
  return parts.length > 0 ? parts : [<span key="0">{text}</span>]
}

// ===========================
// STREAMING TEXT HOOK
// ===========================
function useStreamingText(text: string, isNew: boolean, speed: number = 12) {
  const [displayed, setDisplayed] = useState(text)
  const [isStreaming, setIsStreaming] = useState(false)
  const indexRef = useRef(0)

  useEffect(() => {
    if (!isNew || !text) {
      setDisplayed(text)
      return
    }

    setIsStreaming(true)
    setDisplayed('')
    indexRef.current = 0

    const interval = setInterval(() => {
      indexRef.current += Math.floor(Math.random() * 3) + 1 // 1-3 chars at a time for natural feel
      if (indexRef.current >= text.length) {
        indexRef.current = text.length
        setIsStreaming(false)
        clearInterval(interval)
      }
      setDisplayed(text.slice(0, indexRef.current))
    }, speed)

    return () => clearInterval(interval)
  }, [text, isNew, speed])

  return { displayed, isStreaming }
}

// Streaming message wrapper
function StreamingMessage({ content, isNew }: { content: string; isNew: boolean }) {
  const { displayed, isStreaming } = useStreamingText(content, isNew)

  return (
    <div>
      {renderMessageContent(displayed)}
      {isStreaming && (
        <span style={{
          display: 'inline-block', width: '6px', height: '16px',
          background: '#19c37d', marginLeft: '2px', borderRadius: '1px',
          animation: 'blink 0.8s infinite',
          verticalAlign: 'text-bottom',
        }} />
      )}
    </div>
  )
}

// ===========================
// CHAT EXPORT FUNCTIONS
// ===========================
function exportAsMarkdown(messages: any[]) {
  let md = `# Chat Export\n_Exported: ${new Date().toLocaleString()}_\n\n---\n\n`
  messages.forEach((msg: any) => {
    if (msg.content?.startsWith('___MULTI_MODEL___')) {
      try {
        const data = JSON.parse(msg.content.replace('___MULTI_MODEL___', ''))
        md += `### AI (Multiple Models)\n\n`
        data.forEach((m: any) => { md += `**${m.name}:**\n${m.response}\n\n` })
      } catch {}
    } else {
      md += msg.role === 'user' ? `### You\n${msg.content}\n\n` : `### AI\n${msg.content}\n\n`
    }
    md += `---\n\n`
  })
  return md
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ===========================
// STYLES
// ===========================
const chatStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fira+Code:wght@400;500&display=swap');

  * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes dotPulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes glowPulse { 0%, 100% { text-shadow: 0 0 4px rgba(25,195,125,0.3); } 50% { text-shadow: 0 0 8px rgba(25,195,125,0.5); } }

  div::-webkit-scrollbar { width: 6px; }
  div::-webkit-scrollbar-track { background: transparent; }
  div::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
  textarea::-webkit-scrollbar { width: 4px; }
  textarea::-webkit-scrollbar-track { background: transparent; }
  textarea::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`

// ===========================
// MAIN CHAT COMPONENT
// ===========================
export default function Chat({ threadId, userId, sidebarOpen, onToggleSidebar }: ChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile')
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)
  const [pickedResponses, setPickedResponses] = useState<Record<string, number>>({})
  const [reactions, setReactions] = useState<Record<string, 'like' | 'dislike'>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const convex = useConvex()

  const ALL_MODELS_ID = '__all__'

  // Category definitions for the dropdown headers
  const CATEGORIES = [
    { key: 'special', label: '✨ Special', color: '#e44baa' },
    { key: 'groq', label: '⚡ Groq Models', color: '#19c37d' },
    { key: 'neuroscience', label: '🧠 Neuroscience-Specific Models', color: '#a78bfa' },
    { key: 'biomed-nlp', label: '📄 Biomedical NLP Models', color: '#3b82f6' },
    { key: 'brain-imaging', label: '🔬 Brain Imaging / Neuroimaging', color: '#06b6d4' },
    { key: 'clinical', label: '🏥 Clinical Text Models', color: '#14b8a6' },
    { key: 'drug-discovery', label: '💊 Drug Discovery Models', color: '#f59e0b' },
    { key: 'mental-health', label: '💚 Mental Health Models', color: '#22c55e' },
    { key: 'eeg', label: '⚡ EEG / Brain Signal Models', color: '#eab308' },
    { key: 'medical-qa', label: '❓ Medical QA Models', color: '#ef4444' },
    { key: 'radiology', label: '📷 Radiology / Medical Imaging', color: '#ec4899' },
    { key: 'genomics', label: '🧬 Genomics / Proteomics Models', color: '#8b5cf6' },
  ]

  const models = [
    // Special
    { id: ALL_MODELS_ID, name: 'All Models', desc: 'Get answers from all models', category: 'special' },
    // Groq Models
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Most powerful & accurate', category: 'groq' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra fast responses', category: 'groq' },
    // 1. Neuroscience-Specific Models
    { id: 'neuro-brainlm-pro', name: 'BrainLM Pro', desc: 'Advanced neuroscience & fMRI research', category: 'neuroscience' },
    { id: 'neuro-neurochat', name: 'NeuroChat', desc: 'Brain basics & fundamentals', category: 'neuroscience' },
    // 2. Biomedical NLP Models
    { id: 'biomed-nlp-biomedbert', name: 'BiomedBERT Pro', desc: 'Biomedical text mining & NER', category: 'biomed-nlp' },
    { id: 'biomed-nlp-pubmed', name: 'PubMedScholar', desc: 'PubMed literature analysis', category: 'biomed-nlp' },
    // 3. Brain Imaging / Neuroimaging
    { id: 'brain-img-neuroimage', name: 'NeuroImage Pro', desc: 'MRI & brain scan analysis', category: 'brain-imaging' },
    { id: 'brain-img-fmri', name: 'fMRI Analyzer', desc: 'Functional brain imaging & BOLD signals', category: 'brain-imaging' },
    // 4. Clinical Text Models
    { id: 'clinical-clinicalbert', name: 'ClinicalBERT Pro', desc: 'Clinical notes & EHR analysis', category: 'clinical' },
    { id: 'clinical-gatortron', name: 'GatorTron Chat', desc: 'Clinical text understanding', category: 'clinical' },
    // 5. Drug Discovery Models
    { id: 'drug-chemberta', name: 'ChemBERTa Pro', desc: 'Molecular analysis & drug discovery', category: 'drug-discovery' },
    { id: 'drug-drugai', name: 'DrugDiscovery AI', desc: 'Pharmacology & drug mechanisms', category: 'drug-discovery' },
    // 6. Mental Health Models
    { id: 'mental-mentalbert', name: 'MentalBERT Pro', desc: 'Mental health science & research', category: 'mental-health' },
    { id: 'mental-psychai', name: 'PsychAI', desc: 'Psychology & behavioral science', category: 'mental-health' },
    // 7. EEG / Brain Signal Models
    { id: 'eeg-labram', name: 'LaBraM Analyst', desc: 'EEG analysis & brain signals', category: 'eeg' },
    { id: 'eeg-eegpt', name: 'EEGPT Chat', desc: 'BCI & brain-computer interfaces', category: 'eeg' },
    // 8. Medical QA Models
    { id: 'medqa-meditron', name: 'Meditron Pro', desc: 'Medical knowledge & clinical reasoning', category: 'medical-qa' },
    { id: 'medqa-openbiollm', name: 'OpenBioLLM', desc: 'Biomedical QA & exam prep', category: 'medical-qa' },
    // 9. Radiology / Medical Imaging
    { id: 'radio-biomedclip', name: 'BiomedCLIP Pro', desc: 'X-ray, CT, MRI interpretation', category: 'radiology' },
    { id: 'radio-radiologist', name: 'RadiologistAI', desc: 'Chest radiology & diagnostics', category: 'radiology' },
    // 10. Genomics / Proteomics
    { id: 'genomics-esm', name: 'ESM Protein AI', desc: 'Protein structure & folding', category: 'genomics' },
    { id: 'genomics-genomicsai', name: 'GenomicsAI', desc: 'DNA, genetics & neurogenetic disorders', category: 'genomics' },
  ]

  const queriedMessages = useQuery(api.messages.getByThread, { threadId })
  const hasMessages = queriedMessages && queriedMessages.length > 0

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [queriedMessages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  // Track which messages are "new" for streaming effect
  const prevMsgCount = useRef(0)
  useEffect(() => {
    if (queriedMessages && queriedMessages.length > prevMsgCount.current) {
      const newMsgs = queriedMessages.slice(prevMsgCount.current)
      const ids = new Set(newMsgs.filter((m: any) => m.role === 'assistant').map((m: any) => m._id))
      if (ids.size > 0) setNewMessageIds(ids)
      // Clear streaming flag after animation
      setTimeout(() => setNewMessageIds(new Set()), 30000)
    }
    prevMsgCount.current = queriedMessages?.length || 0
  }, [queriedMessages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input
    setInput('')
    setLoading(true)

    try {
      const chatHistory = (queriedMessages || []).map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))

      if (selectedModel === ALL_MODELS_ID) {
        // Multi-model: save user message first, then get all responses
        await convex.mutation(api.messages.createAndUpdate, {
          threadId, userId, role: "user" as const, content: userMessage,
          messageType: "text",
          title: userMessage.length > 50 ? userMessage.substring(0, 50) + "..." : userMessage,
        })

        const allModels = models.filter(m => m.id !== ALL_MODELS_ID)
        const results = await Promise.allSettled(
          allModels.map(model =>
            // @ts-ignore
            convex.action(api.chat.chat, { threadId, userId, message: userMessage, modelId: model.id, chatHistory })
          )
        )
        const modelResponses = allModels.map((model, i) => {
          const result = results[i]
          if (result.status === 'fulfilled' && result.value.success) return { name: model.name, response: result.value.response }
          return { name: model.name, response: 'Failed to respond.' }
        })
        await convex.mutation(api.messages.createAndUpdate, {
          threadId, userId, role: "assistant" as const,
          content: '___MULTI_MODEL___' + JSON.stringify(modelResponses),
          messageType: "multi_model",
        })
      } else {
        // Single model: chat action saves both user + AI messages automatically
        // @ts-ignore
        const result = await convex.action(api.chat.chat, {
          threadId, userId, message: userMessage,
          modelId: selectedModel, chatHistory,
        })
        if (!result.success) {
          // Error response is not auto-saved, save it manually
          await convex.mutation(api.messages.createAndUpdate, {
            threadId, userId, role: "assistant" as const,
            content: "Sorry, I couldn't process your message. Please try again.",
            messageType: "text",
          })
        }
        // Success: messages already saved by chat action, no need to save again
      }
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) }
  }

  const modelColors = ['#19c37d', '#5b5fc7', '#e44baa']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#212121' }}>
      <style>{chatStyles}</style>

      {/* Navbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', backgroundColor: '#171717',
        borderBottom: '1px solid rgba(255,255,255,0.06)', minHeight: '48px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!sidebarOpen && onToggleSidebar && (
            <button onClick={onToggleSidebar} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </button>
          )}
          <AnimatedLogo size={36} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Export Button */}
          {hasMessages && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowExportMenu(!showExportMenu)} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                padding: '7px 12px', fontSize: '12px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                Export
              </button>
              {showExportMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                  background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', padding: '4px', minWidth: '160px', zIndex: 100,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <button onClick={() => {
                    const md = exportAsMarkdown(queriedMessages || [])
                    downloadFile(md, `chat-${Date.now()}.md`, 'text/markdown')
                    setShowExportMenu(false)
                  }} style={{
                    width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    📄 Download Markdown
                  </button>
                  <button onClick={() => {
                    const text = (queriedMessages || []).map((m: any) => `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`).join('\n\n')
                    downloadFile(text, `chat-${Date.now()}.txt`, 'text/plain')
                    setShowExportMenu(false)
                  }} style={{
                    width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    📝 Download Text
                  </button>
                  <button onClick={() => {
                    const md = exportAsMarkdown(queriedMessages || [])
                    navigator.clipboard.writeText(md)
                    setShowExportMenu(false)
                  }} style={{
                    width: '100%', padding: '8px 12px', borderRadius: '6px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
                    fontSize: '12px', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    📋 Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Model Selector */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
              backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', color: '#ececec', cursor: 'pointer', fontSize: '13px',
              fontFamily: 'inherit', fontWeight: 500,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#19c37d" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4m0 14v4m-8.66-3.34l2.83-2.83m11.66-5.66l2.83-2.83M1 12h4m14 0h4M4.34 4.34l2.83 2.83m11.66 5.66l2.83 2.83" />
              </svg>
              {models.find(m => m.id === selectedModel)?.name || 'Select Model'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: modelDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {modelDropdownOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '6px',
                backgroundColor: '#2f2f2f', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', padding: '6px', minWidth: '280px', maxHeight: '420px', overflowY: 'auto', zIndex: 100,
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)', animation: 'fadeIn 0.15s ease-out',
              }}>
                {models.map((model, idx) => {
                  const catDef = CATEGORIES.find(c => c.key === model.category)
                  const catColor = catDef?.color || '#19c37d'
                  const isFirstInCategory = idx === 0 || models[idx - 1]?.category !== model.category
                  const isSelected = selectedModel === model.id
                  return (
                    <div key={model.id}>
                      {isFirstInCategory && model.category !== 'special' && (
                        <>
                          {idx > 0 && <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.06)', margin: '4px 8px' }} />}
                          <div style={{ padding: '8px 12px 2px', fontSize: '10px', fontWeight: 700, color: catColor, textTransform: 'uppercase' as const, letterSpacing: '0.8px', opacity: 0.8 }}>
                            {catDef?.label || model.category}
                          </div>
                        </>
                      )}
                      <button onClick={() => { setSelectedModel(model.id); setModelDropdownOpen(false) }} style={{
                        width: '100%', display: 'flex', flexDirection: 'column', gap: '2px', padding: '8px 12px',
                        backgroundColor: isSelected ? `${catColor}20` : 'transparent',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = `${catColor}10` }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? catColor : '#ececec' }}>
                            {model.name}
                          </span>
                          {isSelected && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={catColor} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{model.desc}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', ...(hasMessages ? {} : { justifyContent: 'center' }) }}>
        {!hasMessages ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px', marginBottom: '40px', gap: '24px' }}>
            <AnimatedLogo size={70} />
            <h1 style={{ color: '#ececec', fontSize: '28px', fontWeight: 600, margin: 0 }}>What can I help with?</h1>

            {/* Prompt Templates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxWidth: '600px', width: '100%' }}>
              {PROMPT_TEMPLATES.map((tmpl) => (
                <button key={tmpl.label} onClick={() => { setInput(tmpl.prompt); textareaRef.current?.focus() }} style={{
                  padding: '14px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  fontSize: '12px', fontFamily: 'inherit', textAlign: 'center', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,195,125,0.08)'; e.currentTarget.style.borderColor = 'rgba(25,195,125,0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                >
                  <span style={{ fontSize: '20px' }}>{tmpl.icon}</span>
                  <span>{tmpl.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {queriedMessages.map((msg: any) => {
              const isMultiModel = msg.role === 'assistant' && msg.content?.startsWith('___MULTI_MODEL___')
              let multiModelData: Array<{ name: string; response: string }> = []
              if (isMultiModel) { try { multiModelData = JSON.parse(msg.content.replace('___MULTI_MODEL___', '')) } catch {} }

              const isNewMsg = newMessageIds.has(msg._id)

              return msg.role === 'user' ? (
                <div key={msg._id} style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ backgroundColor: '#303030', color: '#ececec', padding: '12px 18px', borderRadius: '20px', maxWidth: '70%', fontSize: '15px', lineHeight: '1.6', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg._id} style={{ display: 'flex', gap: '12px', animation: 'fadeIn 0.3s ease-out', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, marginTop: '2px' }}><AnimatedLogo size={30} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isMultiModel ? (
                      pickedResponses[msg._id] !== undefined ? (
                        (() => {
                          const idx = pickedResponses[msg._id]; const item = multiModelData[idx]; const color = modelColors[idx]
                          return (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 800, color: 'white' }}>{idx + 1}</div>
                                <span style={{ fontSize: '13px', fontWeight: 600, color }}>{item.name}</span>
                                <button onClick={() => setPickedResponses(prev => { const n = {...prev}; delete n[msg._id]; return n })}
                                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto', padding: '4px 8px', borderRadius: '6px' }}>Show all</button>
                              </div>
                              <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.7' }}>
                                <StreamingMessage content={item.response} isNew={isNewMsg} />
                              </div>
                            </div>
                          )
                        })()
                      ) : (
                        <div>
                          <div style={{ textAlign: 'center', padding: '12px 0 10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ececec', marginBottom: '3px' }}>Compare AI Responses</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>Pick the best response</div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${multiModelData.length}, 1fr)`, gap: '12px' }}>
                            {multiModelData.map((item, idx) => (
                              <div key={idx} style={{
                                backgroundColor: '#2a2a2a', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: modelColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'white' }}>{idx + 1}</div>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#ececec' }}>{item.name}</span>
                                </div>
                                <div style={{ padding: '12px 14px', color: '#d1d5db', fontSize: '13px', lineHeight: '1.7', flex: 1, maxHeight: '300px', overflowY: 'auto' }}>
                                  {renderMessageContent(item.response)}
                                </div>
                                <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                  <button onClick={() => setPickedResponses(prev => ({ ...prev, [msg._id]: idx }))} style={{
                                    width: '100%', padding: '8px', backgroundColor: modelColors[idx] + '18',
                                    border: `1px solid ${modelColors[idx]}44`, borderRadius: '8px', color: modelColors[idx],
                                    cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                                  }}>Use this response</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.7', textAlign: 'left' }}>
                        <StreamingMessage content={msg.content} isNew={isNewMsg} />
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '2px', marginTop: '10px', alignItems: 'center' }}>
                      <button onClick={() => {
                        const text = isMultiModel ? multiModelData.map(m => `${m.name}:\n${m.response}`).join('\n\n') : msg.content
                        navigator.clipboard.writeText(text); setCopiedId(msg._id); setTimeout(() => setCopiedId(null), 2000)
                      }} title="Copy" style={{
                        background: 'none', border: 'none', color: copiedId === msg._id ? '#19c37d' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontFamily: 'inherit',
                      }}>
                        {copiedId === msg._id ? (
                          <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        )}
                      </button>
                      <button onClick={() => setReactions(prev => ({ ...prev, [msg._id]: prev[msg._id] === 'like' ? undefined as any : 'like' }))} style={{
                        background: 'none', border: 'none', color: reactions[msg._id] === 'like' ? '#19c37d' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={reactions[msg._id] === 'like' ? '#19c37d' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                      </button>
                      <button onClick={() => setReactions(prev => ({ ...prev, [msg._id]: prev[msg._id] === 'dislike' ? undefined as any : 'dislike' }))} style={{
                        background: 'none', border: 'none', color: reactions[msg._id] === 'dislike' ? '#ef4444' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center',
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={reactions[msg._id] === 'dislike' ? '#ef4444' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Loading */}
            {loading && (
              <div style={{ display: 'flex', gap: '16px', animation: 'fadeIn 0.3s ease-out', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, marginTop: '2px' }}><AnimatedLogo size={30} /></div>
                <div style={{ flex: 1, paddingTop: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ececec', marginBottom: '8px' }}>Thinking...</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[0, 1, 2].map(i => <span key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9ca3af', animation: `dotPulse 1.4s infinite`, animationDelay: `${i * 0.2}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: hasMessages ? '16px 16px 24px' : '0 16px 24px', display: 'flex', justifyContent: 'center' }}>
        <form onSubmit={handleSend} style={{ maxWidth: '768px', width: '100%', position: 'relative' }}>
          {/* Template selector above input when messages exist */}
          {hasMessages && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <button type="button" onClick={() => setShowTemplates(!showTemplates)} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
                padding: '5px 12px', fontSize: '11px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                <span style={{ fontSize: '13px' }}>⚡</span> Templates
              </button>
              {showTemplates && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 0, marginBottom: '4px',
                  background: '#2f2f2f', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px', padding: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px',
                  maxWidth: '500px', zIndex: 50, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {PROMPT_TEMPLATES.map(t => (
                    <button key={t.label} type="button" onClick={() => { setInput(t.prompt); setShowTemplates(false); textareaRef.current?.focus() }} style={{
                      padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                      background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                      fontSize: '11px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(25,195,125,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{
            display: 'flex', alignItems: 'flex-end', backgroundColor: '#2f2f2f',
            borderRadius: '26px', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 16px',
          }}>
            <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Ask anything" disabled={loading} rows={1} style={{
                flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', color: '#ececec',
                fontSize: '15px', lineHeight: '24px', resize: 'none', padding: '2px 0', fontFamily: 'inherit',
                height: '24px', maxHeight: '200px', opacity: loading ? 0.5 : 1,
              } as React.CSSProperties} />
            <button type="submit" disabled={loading || !input.trim()} style={{
              background: input.trim() && !loading ? 'white' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: '50%', width: '32px', height: '32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0, marginLeft: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: input.trim() && !loading ? '#212121' : '#6b7280' }}>
                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', margin: '10px 0 0 0' }}>
            AI can make mistakes. Consider checking important information.
          </p>
        </form>
      </div>
    </div>
  )
}
