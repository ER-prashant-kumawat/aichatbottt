import { useState, useRef, useCallback, useMemo } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface PaperFormatterProps {
  userId: string
  onBack: () => void
}

type PaperFormat = 'IEEE' | 'APA' | 'ACM'
type ViewMode = 'edit' | 'split' | 'preview'
type AIMode = 'write_section' | 'improve' | 'abstract' | 'introduction' | 'literature_review' | 'methodology' | 'conclusion' | 'references' | 'research_topic'

const FORMAT_STYLES: Record<PaperFormat, {
  fontFamily: string; fontSize: string; titleSize: string; titleAlign: string; titleWeight: string;
  h1Style: string; h2Style: string; columnCount: number; lineHeight: string;
  abstractLabel: string; abstractStyle: string; refStyle: string; authorStyle: string;
}> = {
  IEEE: {
    fontFamily: "'Times New Roman', 'Noto Serif', Georgia, serif",
    fontSize: '10pt', titleSize: '24px', titleAlign: 'center', titleWeight: '700',
    h1Style: 'uppercase', h2Style: 'italic', columnCount: 2, lineHeight: '1.4',
    abstractLabel: 'Abstract', abstractStyle: 'italic',
    refStyle: 'numbered', authorStyle: 'center',
  },
  APA: {
    fontFamily: "'Times New Roman', 'Noto Serif', Georgia, serif",
    fontSize: '12pt', titleSize: '22px', titleAlign: 'center', titleWeight: '700',
    h1Style: 'bold-center', h2Style: 'bold-left', columnCount: 1, lineHeight: '2',
    abstractLabel: 'Abstract', abstractStyle: 'normal',
    refStyle: 'hanging', authorStyle: 'center',
  },
  ACM: {
    fontFamily: "'Linux Libertine', 'Times New Roman', Georgia, serif",
    fontSize: '10pt', titleSize: '22px', titleAlign: 'left', titleWeight: '700',
    h1Style: 'bold-upper', h2Style: 'bold', columnCount: 2, lineHeight: '1.3',
    abstractLabel: 'ABSTRACT', abstractStyle: 'normal',
    refStyle: 'numbered', authorStyle: 'left',
  },
}

const AI_SECTIONS: { mode: AIMode; label: string; icon: string; desc: string; color: string }[] = [
  { mode: 'abstract', label: 'Generate Abstract', icon: 'A', desc: 'AI writes your abstract', color: '#19c37d' },
  { mode: 'introduction', label: 'Write Introduction', icon: 'I', desc: 'Background & motivation', color: '#06b6d4' },
  { mode: 'literature_review', label: 'Literature Review', icon: 'L', desc: 'Related work section', color: '#a855f7' },
  { mode: 'methodology', label: 'Methodology', icon: 'M', desc: 'Research methods', color: '#f97316' },
  { mode: 'conclusion', label: 'Write Conclusion', icon: 'C', desc: 'Summary & future work', color: '#ef4444' },
  { mode: 'references', label: 'Generate References', icon: 'R', desc: 'Auto-generate citations', color: '#8b5cf6' },
  { mode: 'improve', label: 'Improve Writing', icon: 'E', desc: 'Polish selected text', color: '#ec4899' },
  { mode: 'research_topic', label: 'Research Topic', icon: 'T', desc: 'Deep topic research', color: '#f59e0b' },
]

// Font size options
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72']
const FONT_FAMILIES = [
  'Times New Roman', 'Arial', 'Georgia', 'Verdana', 'Courier New',
  'Helvetica', 'Palatino', 'Garamond', 'Cambria', 'Calibri',
]
const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#e6194b', '#f58231', '#ffe119', '#bfef45', '#3cb44b', '#42d4f4',
  '#4363d8', '#911eb4', '#f032e6', '#a9a9a9', '#800000', '#9a6324',
  '#808000', '#469990', '#000075', '#e6beff',
]
const HIGHLIGHT_COLORS = [
  'transparent', '#ffff00', '#00ff00', '#00ffff', '#ff69b4', '#ffa500',
  '#ff6347', '#dda0dd', '#87ceeb', '#98fb98', '#f0e68c', '#e6e6fa',
]

// Paper section definitions for full generation
// For papers >= 15 pages, extra sections are added automatically
const PAPER_SECTIONS_BASE = [
  { key: 'abstract', heading: 'Abstract', prompt: 'Write a comprehensive abstract summarizing the entire paper. Include background, objective, methodology, key findings, and conclusion.', pctOfTotal: 0.03 },
  { key: 'introduction', heading: 'Introduction', prompt: 'Write a detailed Introduction section. Include: comprehensive background context, clear problem statement, strong motivation, specific research objectives, contributions of this work, and a brief overview of the paper structure.', pctOfTotal: 0.12 },
  { key: 'literature_review', heading: 'Literature Review', prompt: 'Write an extensive Literature Review / Related Work section. Discuss all relevant prior work in detail, organize by sub-topics, identify specific research gaps, compare and contrast approaches, and clearly position the current work within the existing body of knowledge. Cite general findings from the field.', pctOfTotal: 0.15 },
  { key: 'methodology', heading: 'Methodology', prompt: 'Write a thorough Methodology / Proposed Approach section. Describe the research design, theoretical framework, data collection methods, analysis techniques, algorithms or models used, experimental setup, parameters, and implementation details. Be very specific and detailed for reproducibility. Include subsections if needed.', pctOfTotal: 0.18 },
  { key: 'results', heading: 'Results and Analysis', prompt: 'Write a detailed Results and Analysis section. Present findings systematically, discuss quantitative and qualitative results, compare with baseline approaches, analyze performance metrics, discuss trends and patterns, and provide thorough interpretation of the results. Include discussion of tables/figures that would be present.', pctOfTotal: 0.18 },
  { key: 'discussion', heading: 'Discussion', prompt: 'Write a comprehensive Discussion section. Interpret the results in context of the research questions, compare findings with existing literature, discuss implications (theoretical and practical), address unexpected findings, discuss strengths of the approach, and provide critical analysis.', pctOfTotal: 0.14 },
  { key: 'conclusion', heading: 'Conclusion and Future Work', prompt: 'Write a thorough Conclusion section. Summarize all key findings, restate contributions, discuss limitations of the study in detail, and provide specific and actionable future research directions. Discuss broader impact and significance of the work.', pctOfTotal: 0.10 },
  { key: 'references', heading: 'References', prompt: 'Generate a comprehensive list of realistic, properly formatted academic references related to this research topic. Include journal articles, conference papers, books, and technical reports. Each reference should have realistic author names, titles, venues, years, and page numbers.', pctOfTotal: 0.10 },
]

// Extra sections for longer papers (15+ pages)
const EXTRA_SECTIONS_FOR_LONG_PAPERS = [
  { key: 'background', heading: 'Background and Preliminaries', prompt: 'Write a detailed Background and Preliminaries section. Define key terms, explain foundational concepts, describe the theoretical framework, present mathematical formulations if applicable, and provide the necessary context for understanding the methodology. Include definitions, theorems, and formal problem statements.', pctOfTotal: 0.10, insertAfter: 'introduction' },
  { key: 'implementation', heading: 'Implementation Details', prompt: 'Write a thorough Implementation Details section. Describe the system architecture, tools and frameworks used, hardware and software setup, data preprocessing steps, hyperparameter tuning process, and any engineering challenges faced. Include specific version numbers, configurations, and optimization techniques.', pctOfTotal: 0.08, insertAfter: 'methodology' },
  { key: 'evaluation', heading: 'Evaluation and Comparison', prompt: 'Write a detailed Evaluation and Comparison section. Compare the proposed approach with state-of-the-art methods, perform ablation studies, analyze computational complexity, discuss scalability, and provide statistical significance tests. Include comparative analysis tables and performance benchmarks.', pctOfTotal: 0.08, insertAfter: 'results' },
  { key: 'limitations', heading: 'Limitations and Threats to Validity', prompt: 'Write a detailed Limitations and Threats to Validity section. Discuss internal and external validity threats, limitations of the dataset, methodology constraints, potential biases, generalizability concerns, and areas where the approach may not perform well. Be honest and thorough in self-assessment.', pctOfTotal: 0.06, insertAfter: 'discussion' },
]

function buildSectionsForPages(pages: number) {
  const sections = [...PAPER_SECTIONS_BASE]
  if (pages >= 15) {
    // Insert extra sections at appropriate positions for longer papers
    for (const extra of EXTRA_SECTIONS_FOR_LONG_PAPERS) {
      const insertIdx = sections.findIndex(s => s.key === extra.insertAfter)
      if (insertIdx !== -1) {
        sections.splice(insertIdx + 1, 0, { key: extra.key, heading: extra.heading, prompt: extra.prompt, pctOfTotal: extra.pctOfTotal })
      }
    }
    // Renormalize percentages to sum to 1.0
    const totalPct = sections.reduce((sum, s) => sum + s.pctOfTotal, 0)
    sections.forEach(s => s.pctOfTotal = s.pctOfTotal / totalPct)
  }
  return sections
}

export default function PaperFormatter({ userId, onBack }: PaperFormatterProps) {
  const [format, setFormat] = useState<PaperFormat>('IEEE')
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [paperTitle, setPaperTitle] = useState('Untitled Paper')
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedAiMode, setSelectedAiMode] = useState<AIMode>('write_section')
  const [showFormatDropdown, setShowFormatDropdown] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const [uploadDragging, setUploadDragging] = useState(false)
  const [showResearchPanel, setShowResearchPanel] = useState(false)
  const [researchQuery, setResearchQuery] = useState('')
  const [researchResult, setResearchResult] = useState('')
  const [researchLoading, setResearchLoading] = useState(false)
  const [researchMode, setResearchMode] = useState('quick')
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false)
  const [showFontFamilyDropdown, setShowFontFamilyDropdown] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [currentFontSize, setCurrentFontSize] = useState('12')
  const [currentFontFamily, setCurrentFontFamily] = useState('Times New Roman')
  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  // Full paper generation states
  const [generateTopic, setGenerateTopic] = useState('')
  const [generatePages, setGeneratePages] = useState(10)
  const [generateAuthor, setGenerateAuthor] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState(0)
  const [genCurrentSection, setGenCurrentSection] = useState('')
  const [genSectionsComplete, setGenSectionsComplete] = useState(0)
  const [genTotalSections, setGenTotalSections] = useState(0)
  const [genWordCount, setGenWordCount] = useState(0)
  const [showGeneratePanel, setShowGeneratePanel] = useState(false)
  const [currentPreviewPage, setCurrentPreviewPage] = useState(1)

  const editorContentRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aiPaperAssist = useAction(api.papers.aiPaperAssist)
  const doResearch = useAction(api.research.doResearch)
  const generateSection = useAction(api.papers.generatePaperSection)

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setShowFontSizeDropdown(false)
    setShowFontFamilyDropdown(false)
    setShowTextColorPicker(false)
    setShowHighlightPicker(false)
    setShowTableDialog(false)
    setShowFormatDropdown(false)
  }

  // execCommand wrapper
  const execCmd = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorContentRef.current?.focus()
  }, [])

  // Save undo state
  const saveUndoState = () => {
    const content = editorContentRef.current?.innerHTML || ''
    setUndoStack(prev => [...prev.slice(-30), content])
    setRedoStack([])
  }

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return
    const current = editorContentRef.current?.innerHTML || ''
    setRedoStack(prev => [...prev, current])
    const prev = undoStack[undoStack.length - 1]
    setUndoStack(s => s.slice(0, -1))
    if (editorContentRef.current) editorContentRef.current.innerHTML = prev
  }

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return
    const current = editorContentRef.current?.innerHTML || ''
    setUndoStack(prev => [...prev, current])
    const next = redoStack[redoStack.length - 1]
    setRedoStack(s => s.slice(0, -1))
    if (editorContentRef.current) editorContentRef.current.innerHTML = next
  }

  // Insert table
  const insertTable = (rows: number, cols: number) => {
    let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:12px 0;">'
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>'
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? 'th' : 'td'
        tableHtml += `<${tag} style="border:1px solid #555;padding:8px 12px;text-align:left;${r === 0 ? 'background:rgba(255,255,255,0.06);font-weight:600;' : ''}">${r === 0 ? `Header ${c + 1}` : ''}</${tag}>`
      }
      tableHtml += '</tr>'
    }
    tableHtml += '</table><p><br></p>'
    execCmd('insertHTML', tableHtml)
    setShowTableDialog(false)
  }

  // Insert horizontal rule
  const insertHR = () => {
    execCmd('insertHTML', '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:16px 0;"><p><br></p>')
  }

  // Insert blockquote
  const insertBlockquote = () => {
    execCmd('insertHTML', '<blockquote style="border-left:3px solid #a855f7;padding:8px 16px;margin:12px 0;color:rgba(255,255,255,0.7);font-style:italic;">Quote text here</blockquote><p><br></p>')
  }

  // Insert code block
  const insertCodeBlock = () => {
    execCmd('insertHTML', '<pre style="background:rgba(255,255,255,0.05);padding:12px 16px;border-radius:8px;font-family:\'Courier New\',monospace;font-size:13px;margin:12px 0;overflow-x:auto;"><code>// code here</code></pre><p><br></p>')
  }

  // Insert image placeholder
  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      execCmd('insertHTML', `<img src="${url}" style="max-width:100%;height:auto;border-radius:4px;margin:12px 0;" alt="image"><p><br></p>`)
    }
  }

  // Insert link
  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      const sel = window.getSelection()
      const text = sel?.toString() || url
      execCmd('insertHTML', `<a href="${url}" style="color:#3b82f6;text-decoration:underline;" target="_blank">${text}</a>`)
    }
  }

  // Clear formatting
  const clearFormatting = () => {
    execCmd('removeFormat')
  }

  // Get selected text for AI improve
  const getSelectedText = () => {
    const sel = window.getSelection()
    return sel?.toString() || ''
  }

  // AI Generate
  const handleAIGenerate = async (mode: AIMode, prompt: string) => {
    if (!prompt.trim()) return
    setAiLoading(true)
    setAiResult('')
    try {
      const titleEl = editorContentRef.current?.querySelector('h1')
      const topicContext = titleEl?.textContent || paperTitle
      const fullPrompt = mode === 'improve' ? prompt
        : mode === 'references' ? `Topic: ${topicContext}\n\nGenerate references in ${format} format.`
        : `Topic: ${topicContext}\n\n${prompt}`
      const result = await aiPaperAssist({ content: fullPrompt, mode, format })
      if (result.success && result.result) setAiResult(result.result)
      else setAiResult('AI generation failed. Please try again.')
    } catch { setAiResult('Error connecting to AI. Please try again.') }
    setAiLoading(false)
  }

  // Insert AI result
  const insertAIResult = () => {
    if (!aiResult || !editorContentRef.current) return
    saveUndoState()
    const paragraphs = aiResult.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')
    editorContentRef.current.innerHTML += paragraphs
    setAiResult('')
    setShowAIPanel(false)
  }

  // ========== FULL PAPER GENERATION ==========
  const generateFullPaper = async () => {
    if (!generateTopic.trim() || isGenerating) return
    setIsGenerating(true)
    setGenProgress(0)
    setGenSectionsComplete(0)
    setGenWordCount(0)
    setShowLanding(false)

    const totalWords = generatePages * 400 // ~400 words per page for academic papers
    const sections = buildSectionsForPages(generatePages)
    setGenTotalSections(sections.length)

    // Build the editor HTML progressively
    let fullHtml = `<h1 style="text-align:center;">${generateTopic}</h1>\n`
    if (generateAuthor.trim()) {
      fullHtml += `<p style="text-align:center;font-style:italic;color:rgba(255,255,255,0.5);">${generateAuthor}</p>\n`
    }
    fullHtml += `<p><br></p>\n`
    setCurrentPreviewPage(1)

    let previousSummary = ''
    let totalWordsGenerated = 0

    for (let i = 0; i < sections.length; i++) {
      const sec = sections[i]
      const wordTarget = Math.max(100, Math.round(totalWords * sec.pctOfTotal))

      setGenCurrentSection(sec.heading)
      setGenProgress(Math.round(((i) / sections.length) * 100))

      try {
        const result = await generateSection({
          topic: generateTopic,
          sectionName: sec.heading,
          sectionPrompt: sec.prompt,
          format,
          wordTarget,
          previousSections: previousSummary || undefined,
        })

        if (result.success && result.result) {
          const sectionText = result.result
          totalWordsGenerated += result.wordCount || sectionText.split(/\s+/).length

          // Add page break before each section (except abstract which follows title)
          if (i > 0) {
            fullHtml += `<div class="pf-page-break" data-section="${sec.key}"></div>\n`
          }

          // Add section heading
          if (sec.key === 'references') {
            fullHtml += `<h2>References</h2>\n`
            fullHtml += `<div style="font-size:12px;line-height:1.8;">${sectionText.split('\n').filter((l: string) => l.trim()).map((l: string) => `<p style="text-indent:0;padding-left:24px;text-indent:-24px;">${l}</p>`).join('\n')}</div>\n`
          } else {
            const sectionNum = format === 'IEEE' ? `${i}. ` : ''
            fullHtml += `<h2>${sectionNum}${sec.heading}</h2>\n`
            // Split into paragraphs
            const paragraphs = sectionText.split('\n').filter((l: string) => l.trim())
            paragraphs.forEach((p: string) => {
              if (p.startsWith('#')) {
                fullHtml += `<h3>${p.replace(/^#+\s*/, '')}</h3>\n`
              } else if (p.startsWith('- ') || p.startsWith('* ')) {
                fullHtml += `<li>${p.replace(/^[-*]\s*/, '')}</li>\n`
              } else {
                fullHtml += `<p>${p}</p>\n`
              }
            })
            fullHtml += `<p><br></p>\n`
          }

          // Update editor in real-time
          if (editorContentRef.current) {
            editorContentRef.current.innerHTML = fullHtml
          }

          // Build context summary for next sections
          previousSummary += `\n${sec.heading}: ${sectionText.substring(0, 300)}...`
          if (previousSummary.length > 2000) {
            previousSummary = previousSummary.substring(previousSummary.length - 2000)
          }
        }
      } catch (err) {
        console.error(`Failed to generate ${sec.heading}:`, err)
        fullHtml += `<h2>${sec.heading}</h2>\n<p style="color:#ef4444;">[Generation failed for this section. You can use AI Writer to regenerate.]</p>\n`
        if (editorContentRef.current) {
          editorContentRef.current.innerHTML = fullHtml
        }
      }

      setGenSectionsComplete(i + 1)
      setGenWordCount(totalWordsGenerated)
    }

    setPaperTitle(generateTopic)
    setGenProgress(100)
    setGenCurrentSection('Complete!')
    setIsGenerating(false)
  }

  // AI Research
  const handleResearch = async () => {
    if (!researchQuery.trim()) return
    setResearchLoading(true)
    setResearchResult('')
    try {
      const result = await doResearch({ query: researchQuery, mode: researchMode })
      if (result.success && result.result) setResearchResult(result.result)
      else setResearchResult('Research failed. Please try again.')
    } catch { setResearchResult('Error. Please try again.') }
    setResearchLoading(false)
  }

  // File upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      if (text && editorContentRef.current) {
        const lines = text.split('\n')
        let html = ''
        lines.forEach(line => {
          const trimmed = line.trim()
          if (!trimmed) { html += '<p><br></p>'; return }
          if (trimmed.startsWith('# ')) html += `<h1>${trimmed.slice(2)}</h1>`
          else if (trimmed.startsWith('## ')) html += `<h2>${trimmed.slice(3)}</h2>`
          else if (trimmed.startsWith('### ')) html += `<h3>${trimmed.slice(4)}</h3>`
          else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) html += `<li>${trimmed.slice(2)}</li>`
          else html += `<p>${trimmed}</p>`
        })
        editorContentRef.current.innerHTML = html
        setPaperTitle(lines[0]?.replace(/^#+\s*/, '') || 'Uploaded Paper')
        setShowLanding(false)
      }
    }
    reader.readAsText(file)
  }

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setUploadDragging(true) }
  const handleDragLeave = () => setUploadDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setUploadDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        if (text && editorContentRef.current) {
          editorContentRef.current.innerHTML = `<h1>${file.name.replace(/\.[^/.]+$/, '')}</h1><p>${text.replace(/\n/g, '</p><p>')}</p>`
          setPaperTitle(file.name.replace(/\.[^/.]+$/, ''))
          setShowLanding(false)
        }
      }
      reader.readAsText(file)
    }
  }

  // Export
  const exportPaper = () => {
    const fmtStyle = FORMAT_STYLES[format]
    const content = editorContentRef.current?.innerHTML || ''
    // Replace page-break divs with proper CSS page breaks
    const exportContent = content.replace(/<div class="pf-page-break"[^>]*><\/div>/g,
      '<div style="page-break-before:always;break-before:always;height:0;margin:0;padding:0;"></div>')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${paperTitle}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');
  @page { size: letter; margin: 1in 0.75in; }
  body { font-family: ${fmtStyle.fontFamily}; font-size: ${fmtStyle.fontSize}; line-height: ${fmtStyle.lineHeight}; max-width: 8.5in; margin: 0 auto; padding: 1in 0.75in; color: #000; }
  h1 { font-size: ${fmtStyle.titleSize}; text-align: ${fmtStyle.titleAlign}; font-weight: ${fmtStyle.titleWeight}; margin-bottom: 8px; }
  h2 { font-size: 14px; margin-top: 16px; ${fmtStyle.h1Style === 'uppercase' ? 'text-transform: uppercase;' : ''} }
  h3 { font-size: 12px; margin-top: 12px; }
  p { text-align: justify; margin: 6px 0; text-indent: 0.25in; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
  th { background: #f0f0f0; font-weight: 600; }
  blockquote { border-left: 3px solid #666; padding: 8px 16px; margin: 12px 0; font-style: italic; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 10pt; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid #999; margin: 16px 0; }
  @media print {
    body { margin: 0; padding: 0; }
    .pf-page-break { page-break-before: always; break-before: always; }
  }
</style></head><body>${exportContent}</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${paperTitle.replace(/\s+/g, '_')}_${format}.html`; a.click()
    URL.revokeObjectURL(url)
  }

  // Default editor content
  const defaultContent = `<h1 style="text-align:center;">Title</h1>
<p style="text-align:center;font-style:italic;color:rgba(255,255,255,0.5);">Author Name</p>
<p><br></p>
<h2>Abstract</h2>
<p>Start writing your abstract here...</p>
<p><br></p>
<h2>I. Introduction</h2>
<p>Start writing your paper here...</p>`

  // Split content into pages for preview
  const splitIntoPages = useCallback((html: string): string[] => {
    if (!html || !html.trim()) return ['']
    // Split by page-break markers
    const parts = html.split(/<div class="pf-page-break"[^>]*><\/div>/)
    if (parts.length > 1) return parts.filter(p => p.trim())
    // No page breaks - return as single page
    return [html]
  }, [])

  // Get pages for preview
  const previewPages = useMemo(() => {
    const html = editorContentRef.current?.innerHTML || defaultContent
    return splitIntoPages(html)
  }, [editorContentRef.current?.innerHTML, splitIntoPages, viewMode, genSectionsComplete, defaultContent])

  const totalPages = Math.max(1, previewPages.length)

  // Insert manual page break
  const insertPageBreak = () => {
    saveUndoState()
    execCmd('insertHTML', '<div class="pf-page-break" data-section="manual"></div><p><br></p>')
  }

  // ============= TOOLBAR BUTTON COMPONENT =============
  const ToolBtn = ({ onClick, active, title, children, style: extraStyle }: {
    onClick: () => void; active?: boolean; title: string; children: React.ReactNode; style?: React.CSSProperties
  }) => (
    <button onClick={() => { onClick(); closeAllDropdowns() }} title={title}
      className={`pf-tb ${active ? 'pf-tb-active' : ''}`} style={extraStyle}>
      {children}
    </button>
  )

  // Separator
  const Sep = () => <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.08)', margin: '0 3px', flexShrink: 0 }} />

  // ============= LANDING PAGE =============
  if (showLanding && !isGenerating) {
    return (
      <div className="pf-landing-container" style={{ height: '100%', overflowY: 'auto', background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a2e 100%)', padding: '40px 20px' }}>
        <style>{`
          @keyframes pfGlow { 0%, 100% { text-shadow: 0 0 20px rgba(139,92,246,0.3); } 50% { text-shadow: 0 0 40px rgba(139,92,246,0.6), 0 0 60px rgba(59,130,246,0.3); } }
          .upload-zone { transition: all 0.3s; cursor: pointer; }
          .upload-zone:hover { border-color: rgba(59,130,246,0.5) !important; background: rgba(59,130,246,0.05) !important; transform: translateY(-2px); }
          @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          @media (max-width: 768px) {
            .pf-landing-container { padding: 20px 12px !important; }
            .pf-landing-inner { max-width: 100% !important; }
            .pf-landing-inner > h1 { font-size: 24px !important; }
            .pf-generate-panel { padding: 16px !important; }
            .pf-author-pages-row { flex-direction: column !important; }
            .pf-author-pages-row > div { width: 100% !important; }
            .pf-upload-options { flex-direction: column !important; gap: 12px !important; }
            .pf-back-btn { top: 10px !important; left: 10px !important; padding: 6px 12px !important; }
          }
        `}</style>

        <div className="pf-landing-inner" style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '12px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontStyle: 'italic', animation: 'pfGlow 3s infinite' }}>
            Research Paper Formatter
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', textAlign: 'center', maxWidth: '500px', marginBottom: '32px', lineHeight: '1.6' }}>
            Generate complete research papers with AI, upload documents, or start from scratch. IEEE, APA, ACM formats.
          </p>

          {/* ====== AI GENERATE FULL PAPER - MAIN FEATURE ====== */}
          <div className="pf-generate-panel" style={{
            width: '100%', padding: '28px', borderRadius: '20px', marginBottom: '28px',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))',
            border: '1px solid rgba(139,92,246,0.2)', position: 'relative', overflow: 'hidden',
          }}>
            {/* Shimmer effect */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, #a855f7, #3b82f6, transparent)', backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #a855f7, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1h-2v-1a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1H4v-1a3 3 0 0 1 3-3h3V9.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /><circle cx="12" cy="19" r="2" /></svg>
              </div>
              <div>
                <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>AI Generate Full Paper</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: 0 }}>Enter topic & pages - AI writes the complete paper</p>
              </div>
            </div>

            {/* Topic Input */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Research Topic / Paper Title</label>
              <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)}
                placeholder="e.g., Machine Learning Applications in Healthcare Diagnostics"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />
            </div>

            {/* Author & Pages Row */}
            <div className="pf-author-pages-row" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Author Name(s)</label>
                <input value={generateAuthor} onChange={e => setGenerateAuthor(e.target.value)}
                  placeholder="e.g., Prashant Kumawat"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
              </div>
              <div style={{ width: '140px' }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Pages</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button onClick={() => setGeneratePages(p => Math.max(2, p - 1))} style={{ width: '32px', height: '38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>-</button>
                  <input type="number" value={generatePages} onChange={e => setGeneratePages(Math.max(2, Math.min(50, parseInt(e.target.value) || 5)))}
                    style={{ width: '50px', padding: '10px 6px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '15px', textAlign: 'center', outline: 'none', fontFamily: 'inherit', fontWeight: 600 }} />
                  <button onClick={() => setGeneratePages(p => Math.min(50, p + 1))} style={{ width: '32px', height: '38px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
              </div>
              <div style={{ width: '140px' }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '5px' }}>Format</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {(['IEEE', 'APA', 'ACM'] as PaperFormat[]).map(f => (
                    <button key={f} onClick={() => setFormat(f)} style={{
                      flex: 1, padding: '10px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: format === f ? 600 : 400, fontFamily: 'inherit',
                      background: format === f ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)',
                      color: format === f ? '#a855f7' : 'rgba(255,255,255,0.4)',
                      border: format === f ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}>{f}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Preview */}
            <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px 0' }}>Sections to be generated (~{generatePages * 400} words)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {buildSectionsForPages(generatePages).map((sec: { key: string; heading: string }, i: number) => (
                  <span key={sec.key} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {i + 1}. {sec.heading}
                  </span>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button onClick={generateFullPaper} disabled={!generateTopic.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: generateTopic.trim() ? 'pointer' : 'not-allowed',
                background: generateTopic.trim() ? 'linear-gradient(135deg, #a855f7, #3b82f6)' : 'rgba(255,255,255,0.06)',
                color: '#fff', fontSize: '16px', fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: generateTopic.trim() ? 1 : 0.5, transition: 'all 0.3s',
                boxShadow: generateTopic.trim() ? '0 4px 20px rgba(139,92,246,0.3)' : 'none',
              }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              Generate {generatePages}-Page Research Paper
            </button>
          </div>

          {/* ====== OR DIVIDER ====== */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', fontWeight: 500 }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* ====== UPLOAD / SCRATCH OPTIONS ====== */}
          <div className="pf-upload-options" style={{ display: 'flex', gap: '20px', marginBottom: '24px', width: '100%' }}>
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              style={{ flex: 1, padding: '28px 20px', borderRadius: '16px', textAlign: 'center', background: uploadDragging ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)', border: `2px dashed ${uploadDragging ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              </div>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>Upload Document</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>TXT or MD files</p>
            </div>
            <div className="upload-zone" onClick={() => { setShowLanding(false) }}
              style={{ flex: 1, padding: '28px 20px', borderRadius: '16px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', margin: '0 auto 12px', background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(168,85,247,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
              </div>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0' }}>Start from Scratch</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', margin: 0 }}>Write manually</p>
            </div>
          </div>
        </div>

        <button className="pf-back-btn" onClick={onBack} style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> Back
        </button>
        <input ref={fileInputRef} type="file" accept=".txt,.md,.tex" style={{ display: 'none' }} onChange={handleFileUpload} />
      </div>
    )
  }

  const fmtStyle = FORMAT_STYLES[format]

  // ============= MAIN EDITOR =============
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d0d0d', overflow: 'hidden' }}
      onClick={() => closeAllDropdowns()}>
      <style>{`
        .pf-tb { background: none; border: none; color: rgba(255,255,255,0.55); padding: 5px 7px; border-radius: 5px; cursor: pointer; font-size: 13px; transition: all 0.12s; font-family: inherit; display: flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; }
        .pf-tb:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .pf-tb-active { background: rgba(139,92,246,0.18) !important; color: #c084fc !important; }
        .pf-editor { outline: none; min-height: 100%; padding: 32px 40px; font-size: 14px; line-height: 1.7; color: rgba(255,255,255,0.88); caret-color: #a855f7; }
        .pf-editor h1 { font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #fff; }
        .pf-editor h2 { font-size: 18px; font-weight: 600; margin: 20px 0 8px 0; color: rgba(255,255,255,0.95); }
        .pf-editor h3 { font-size: 15px; font-weight: 600; margin: 16px 0 6px 0; color: rgba(255,255,255,0.9); }
        .pf-editor p { margin: 6px 0; }
        .pf-editor ul, .pf-editor ol { margin: 6px 0; padding-left: 24px; }
        .pf-editor li { margin: 3px 0; }
        .pf-editor table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .pf-editor th, .pf-editor td { border: 1px solid rgba(255,255,255,0.15); padding: 8px 12px; text-align: left; }
        .pf-editor th { background: rgba(255,255,255,0.05); font-weight: 600; }
        .pf-editor blockquote { border-left: 3px solid #a855f7; padding: 8px 16px; margin: 12px 0; color: rgba(255,255,255,0.6); font-style: italic; }
        .pf-editor pre { background: rgba(255,255,255,0.04); padding: 12px 16px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 13px; margin: 12px 0; overflow-x: auto; }
        .pf-editor hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 16px 0; }
        .pf-editor img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
        .pf-editor a { color: #3b82f6; text-decoration: underline; }
        .pf-editor *::selection { background: rgba(139,92,246,0.3); }
        .pf-page-break { page-break-before: always; break-before: always; height: 0; margin: 0; padding: 0; border: none; }
        .pf-editor .pf-page-break { display: block; height: 2px; margin: 24px 0; background: repeating-linear-gradient(90deg, rgba(139,92,246,0.3) 0px, rgba(139,92,246,0.3) 8px, transparent 8px, transparent 16px); position: relative; }
        .pf-editor .pf-page-break::after { content: 'Page Break'; position: absolute; left: 50%; top: -10px; transform: translateX(-50%); background: #111; color: rgba(139,92,246,0.5); font-size: 9px; padding: 0 8px; text-transform: uppercase; letter-spacing: 1px; }
        .pf-preview-page { background: #fff; color: #000; padding: 48px 56px; min-height: 11in; position: relative; }
        .pf-preview-page h1 { margin-bottom: 8px; }
        .pf-preview-page h2 { font-size: 14px; margin-top: 16px; font-weight: 700; }
        .pf-preview-page h3 { font-size: 12px; margin-top: 12px; }
        .pf-preview-page p { text-align: justify; margin: 6px 0; text-indent: 0.25in; }
        .pf-preview-page table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        .pf-preview-page th, .pf-preview-page td { border: 1px solid #333; padding: 6px 10px; }
        .pf-preview-page th { background: #f0f0f0; font-weight: 600; }
        .pf-preview-page blockquote { border-left: 3px solid #666; padding: 8px 16px; margin: 12px 0; font-style: italic; color: #555; }
        .pf-preview-page pre { background: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 10pt; }
        .pf-preview-page hr { border: none; border-top: 1px solid #ccc; margin: 16px 0; }
        .pf-dropdown { position: absolute; top: 100%; left: 0; margin-top: 4px; background: #1e1e2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 4px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,0.5); max-height: 260px; overflow-y: auto; }
        .pf-dropdown-item { display: block; width: 100%; padding: 6px 12px; border: none; border-radius: 5px; background: transparent; color: rgba(255,255,255,0.7); cursor: pointer; text-align: left; font-size: 13px; transition: all 0.1s; font-family: inherit; white-space: nowrap; }
        .pf-dropdown-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .pf-ai-card { transition: all 0.2s; cursor: pointer; }
        .pf-ai-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        @keyframes pfSpin { to { transform: rotate(360deg); } }
        .research-panel-enter { animation: slideInFromRight 0.3s ease-out; }
        @keyframes slideInFromRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .pf-color-btn { width: 20px; height: 20px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer; transition: transform 0.1s; }
        .pf-color-btn:hover { transform: scale(1.2); border-color: #fff; }

        @media (max-width: 768px) {
          .pf-landing-container {
            padding: 20px 12px !important;
          }
          .pf-landing-inner {
            max-width: 100% !important;
          }
          .pf-landing-inner h1 {
            font-size: 24px !important;
          }
          .pf-landing-inner p {
            font-size: 13px !important;
          }
          .pf-generate-panel {
            padding: 16px !important;
          }
          .pf-generate-panel h2 {
            font-size: 16px !important;
          }
          .pf-author-pages-row {
            flex-direction: column !important;
            gap: 10px !important;
          }
          .pf-author-pages-row > div {
            width: 100% !important;
          }
          .pf-upload-options {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .pf-topbar {
            flex-direction: column !important;
            gap: 8px !important;
            padding: 8px 10px !important;
          }
          .pf-topbar-left {
            width: 100% !important;
          }
          .pf-topbar-left input {
            width: 120px !important;
          }
          .pf-topbar-views {
            width: 100% !important;
            justify-content: center !important;
          }
          .pf-topbar-actions {
            width: 100% !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
          .pf-toolbar {
            padding: 6px 8px !important;
            overflow-x: auto !important;
            flex-wrap: nowrap !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .pf-editor {
            padding: 16px 12px !important;
            font-size: 13px !important;
          }
          .pf-editor h1 { font-size: 20px !important; }
          .pf-editor h2 { font-size: 16px !important; }
          .pf-editor h3 { font-size: 14px !important; }
          .pf-editor th, .pf-editor td {
            padding: 6px 8px !important;
          }
          .pf-preview-container {
            overflow-x: auto !important;
          }
          .pf-preview-page {
            padding: 24px 20px !important;
            min-height: auto !important;
          }
          .pf-preview-page h2 { font-size: 13px !important; }
          .pf-preview-page h3 { font-size: 11px !important; }
          .pf-preview-page th, .pf-preview-page td {
            padding: 4px 6px !important;
            font-size: 10px !important;
          }
          .pf-main-content {
            flex-direction: column !important;
          }
          .pf-ai-panel, .pf-research-panel {
            width: 100% !important;
            max-height: 50vh !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.06) !important;
          }
          .pf-page-nav {
            padding: 6px 8px !important;
            gap: 6px !important;
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
          .pf-page-nav button {
            padding: 3px 8px !important;
            font-size: 11px !important;
          }
          .pf-progress-bar {
            padding: 10px 12px !important;
          }
          .pf-progress-bar span {
            font-size: 11px !important;
          }
          .pf-section-tags {
            gap: 4px !important;
          }
          .pf-section-tags span {
            font-size: 8px !important;
            padding: 2px 6px !important;
          }
          .pf-back-btn {
            top: 10px !important;
            left: 10px !important;
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }
      `}</style>

      {/* ======= GENERATION PROGRESS BAR ======= */}
      {isGenerating && (
        <div className="pf-progress-bar" style={{ flexShrink: 0, padding: '12px 20px', background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(139,92,246,0.3)', borderTopColor: '#a855f7', borderRadius: '50%', animation: 'pfSpin 0.6s linear infinite' }} />
              <span style={{ color: '#a855f7', fontSize: '13px', fontWeight: 600 }}>Generating: {genCurrentSection}</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
              {genSectionsComplete}/{genTotalSections} sections | ~{genWordCount} words | {genProgress}%
            </span>
          </div>
          <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #a855f7, #3b82f6)', width: `${genProgress}%`, transition: 'width 0.5s ease' }} />
          </div>
          <div className="pf-section-tags" style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {buildSectionsForPages(generatePages).map((sec: { key: string; heading: string }, i: number) => (
              <span key={sec.key} style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 500,
                background: i < genSectionsComplete ? 'rgba(25,195,125,0.15)' : i === genSectionsComplete ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                color: i < genSectionsComplete ? '#19c37d' : i === genSectionsComplete ? '#a855f7' : 'rgba(255,255,255,0.25)',
                border: `1px solid ${i < genSectionsComplete ? 'rgba(25,195,125,0.2)' : i === genSectionsComplete ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.04)'}`,
              }}>
                {i < genSectionsComplete ? '\u2713 ' : ''}{sec.heading}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ======= TOP BAR ======= */}
      <div className="pf-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
        <div className="pf-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => { if (!isGenerating) setShowLanding(true) }} className="pf-tb" style={{ padding: '5px 6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <input value={paperTitle} onChange={e => setPaperTitle(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 600, outline: 'none', width: '180px', fontFamily: 'inherit' }} />
        </div>
        <div className="pf-topbar-views" style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '2px' }}>
          {([
            { mode: 'edit' as ViewMode, label: 'Edit', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg> },
            { mode: 'split' as ViewMode, label: 'Split', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="3" x2="12" y2="21" /></svg> },
            { mode: 'preview' as ViewMode, label: 'Preview', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg> },
          ]).map(v => (
            <button key={v.mode} onClick={() => setViewMode(v.mode)} className={`pf-tb ${viewMode === v.mode ? 'pf-tb-active' : ''}`} style={{ gap: '4px', padding: '5px 12px', fontSize: '11px' }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
        <div className="pf-topbar-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { closeAllDropdowns(); setShowFormatDropdown(!showFormatDropdown) }} className="pf-tb" style={{ gap: '4px', padding: '5px 12px', fontSize: '12px' }}>
              {format} <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showFormatDropdown && (
              <div className="pf-dropdown" style={{ right: 0, left: 'auto', minWidth: '120px' }}>
                {(['IEEE', 'APA', 'ACM'] as PaperFormat[]).map(f => (
                  <button key={f} onClick={() => { setFormat(f); setShowFormatDropdown(false) }} className="pf-dropdown-item" style={{ color: format === f ? '#a855f7' : undefined, fontWeight: format === f ? 600 : undefined }}>
                    {f} Format
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { setShowAIPanel(!showAIPanel); setShowResearchPanel(false) }} className={`pf-tb ${showAIPanel ? 'pf-tb-active' : ''}`} style={{ gap: '4px', padding: '5px 12px', fontSize: '12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1h-2v-1a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1H4v-1a3 3 0 0 1 3-3h3V9.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /><circle cx="12" cy="19" r="2" /></svg>
            AI
          </button>
          <button onClick={() => { setShowResearchPanel(!showResearchPanel); setShowAIPanel(false) }} className={`pf-tb ${showResearchPanel ? 'pf-tb-active' : ''}`} style={{ gap: '4px', padding: '5px 12px', fontSize: '12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            Research
          </button>
          <button onClick={exportPaper} style={{ padding: '5px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'inherit' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            Export
          </button>
        </div>
      </div>

      {/* ======= FORMATTING TOOLBAR ======= */}
      {(viewMode === 'edit' || viewMode === 'split') && (
        <div className="pf-toolbar" style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '6px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.015)', flexShrink: 0, flexWrap: 'wrap', position: 'relative' }}
          onClick={e => e.stopPropagation()}>

          {/* Undo / Redo */}
          <ToolBtn onClick={handleUndo} title="Undo (Ctrl+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>
          </ToolBtn>
          <ToolBtn onClick={handleRedo} title="Redo (Ctrl+Y)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" /></svg>
          </ToolBtn>

          <Sep />

          {/* Font Family Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllDropdowns(); setShowFontFamilyDropdown(!showFontFamilyDropdown) }} className="pf-tb"
              style={{ fontSize: '11px', padding: '4px 8px', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title="Font Family">
              {currentFontFamily}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px', flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showFontFamilyDropdown && (
              <div className="pf-dropdown" style={{ minWidth: '160px' }}>
                {FONT_FAMILIES.map(f => (
                  <button key={f} onClick={() => { execCmd('fontName', f); setCurrentFontFamily(f); setShowFontFamilyDropdown(false) }}
                    className="pf-dropdown-item" style={{ fontFamily: f }}>
                    {f}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Font Size Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllDropdowns(); setShowFontSizeDropdown(!showFontSizeDropdown) }} className="pf-tb"
              style={{ fontSize: '12px', padding: '4px 6px', minWidth: '36px' }} title="Font Size">
              {currentFontSize}
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '2px' }}><polyline points="6 9 12 15 18 9" /></svg>
            </button>
            {showFontSizeDropdown && (
              <div className="pf-dropdown" style={{ minWidth: '60px' }}>
                {FONT_SIZES.map(s => (
                  <button key={s} onClick={() => { execCmd('fontSize', '7'); const fontElements = editorContentRef.current?.querySelectorAll('font[size="7"]'); fontElements?.forEach(el => { (el as HTMLElement).removeAttribute('size'); (el as HTMLElement).style.fontSize = s + 'px' }); setCurrentFontSize(s); setShowFontSizeDropdown(false) }}
                    className="pf-dropdown-item" style={{ fontSize: parseInt(s) > 20 ? '16px' : `${s}px` }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Sep />

          {/* Bold */}
          <ToolBtn onClick={() => execCmd('bold')} title="Bold (Ctrl+B)">
            <strong style={{ fontSize: '14px' }}>B</strong>
          </ToolBtn>

          {/* Italic */}
          <ToolBtn onClick={() => execCmd('italic')} title="Italic (Ctrl+I)">
            <em style={{ fontSize: '14px', fontFamily: 'serif' }}>I</em>
          </ToolBtn>

          {/* Underline */}
          <ToolBtn onClick={() => execCmd('underline')} title="Underline (Ctrl+U)">
            <span style={{ fontSize: '14px', textDecoration: 'underline' }}>U</span>
          </ToolBtn>

          {/* Strikethrough */}
          <ToolBtn onClick={() => execCmd('strikeThrough')} title="Strikethrough">
            <span style={{ fontSize: '13px', textDecoration: 'line-through' }}>S</span>
          </ToolBtn>

          {/* Superscript */}
          <ToolBtn onClick={() => execCmd('superscript')} title="Superscript">
            <span style={{ fontSize: '13px' }}>X<sup style={{ fontSize: '9px' }}>2</sup></span>
          </ToolBtn>

          {/* Subscript */}
          <ToolBtn onClick={() => execCmd('subscript')} title="Subscript">
            <span style={{ fontSize: '13px' }}>X<sub style={{ fontSize: '9px' }}>2</sub></span>
          </ToolBtn>

          <Sep />

          {/* Text Color */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllDropdowns(); setShowTextColorPicker(!showTextColorPicker) }} className="pf-tb" title="Text Color" style={{ flexDirection: 'column', gap: '1px', padding: '3px 7px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>A</span>
              <div style={{ width: '14px', height: '3px', borderRadius: '1px', background: 'linear-gradient(90deg, #e6194b, #3b82f6, #19c37d)' }} />
            </button>
            {showTextColorPicker && (
              <div className="pf-dropdown" style={{ padding: '8px', width: '180px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', margin: '0 0 6px 0', fontWeight: 600 }}>TEXT COLOR</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                  {TEXT_COLORS.map(c => (
                    <button key={c} onClick={() => { execCmd('foreColor', c); setShowTextColorPicker(false) }}
                      className="pf-color-btn" style={{ background: c }} title={c} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllDropdowns(); setShowHighlightPicker(!showHighlightPicker) }} className="pf-tb" title="Highlight Color" style={{ padding: '4px 7px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            </button>
            {showHighlightPicker && (
              <div className="pf-dropdown" style={{ padding: '8px', width: '180px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', margin: '0 0 6px 0', fontWeight: 600 }}>HIGHLIGHT</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                  {HIGHLIGHT_COLORS.map(c => (
                    <button key={c} onClick={() => { execCmd('hiliteColor', c); setShowHighlightPicker(false) }}
                      className="pf-color-btn" style={{ background: c === 'transparent' ? 'repeating-conic-gradient(#555 0% 25%, #333 0% 50%) 50% / 8px 8px' : c }} title={c === 'transparent' ? 'None' : c} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <Sep />

          {/* Headings */}
          <ToolBtn onClick={() => execCmd('formatBlock', 'h1')} title="Heading 1">
            <span style={{ fontSize: '13px', fontWeight: 700 }}>H1</span>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('formatBlock', 'h2')} title="Heading 2">
            <span style={{ fontSize: '12px', fontWeight: 600 }}>H2</span>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('formatBlock', 'h3')} title="Heading 3">
            <span style={{ fontSize: '11px', fontWeight: 600 }}>H3</span>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('formatBlock', 'p')} title="Normal Text">
            <span style={{ fontSize: '11px' }}>P</span>
          </ToolBtn>

          <Sep />

          {/* Alignment */}
          <ToolBtn onClick={() => execCmd('justifyLeft')} title="Align Left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="17" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="17" y1="18" x2="3" y2="18" /></svg>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('justifyCenter')} title="Align Center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="10" x2="6" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="18" y1="18" x2="6" y2="18" /></svg>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('justifyRight')} title="Align Right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="7" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="7" y2="18" /></svg>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('justifyFull')} title="Justify">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="14" x2="3" y2="14" /><line x1="21" y1="18" x2="3" y2="18" /></svg>
          </ToolBtn>

          <Sep />

          {/* Lists */}
          <ToolBtn onClick={() => execCmd('insertUnorderedList')} title="Bullet List">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><circle cx="3.5" cy="6" r="1.5" fill="currentColor" /><circle cx="3.5" cy="12" r="1.5" fill="currentColor" /><circle cx="3.5" cy="18" r="1.5" fill="currentColor" /></svg>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('insertOrderedList')} title="Numbered List">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><text x="2" y="8" fontSize="8" fill="currentColor" fontWeight="600">1</text><text x="2" y="14" fontSize="8" fill="currentColor" fontWeight="600">2</text><text x="2" y="20" fontSize="8" fill="currentColor" fontWeight="600">3</text></svg>
          </ToolBtn>

          {/* Indent */}
          <ToolBtn onClick={() => execCmd('indent')} title="Increase Indent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><polyline points="3 10 7 14 3 18" /></svg>
          </ToolBtn>
          <ToolBtn onClick={() => execCmd('outdent')} title="Decrease Indent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="21" y1="6" x2="3" y2="6" /><line x1="21" y1="12" x2="11" y2="12" /><line x1="21" y1="18" x2="11" y2="18" /><polyline points="7 10 3 14 7 18" /></svg>
          </ToolBtn>

          <Sep />

          {/* Blockquote */}
          <ToolBtn onClick={insertBlockquote} title="Blockquote">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
          </ToolBtn>

          {/* Code Block */}
          <ToolBtn onClick={insertCodeBlock} title="Code Block">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
          </ToolBtn>

          {/* Horizontal Rule */}
          <ToolBtn onClick={insertHR} title="Horizontal Line">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="12" x2="22" y2="12" /></svg>
          </ToolBtn>

          {/* Page Break */}
          <ToolBtn onClick={insertPageBreak} title="Insert Page Break">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" />
              <path d="M2 15v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4" />
              <line x1="2" y1="12" x2="6" y2="12" /><line x1="10" y1="12" x2="14" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </ToolBtn>

          <Sep />

          {/* Table */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { closeAllDropdowns(); setShowTableDialog(!showTableDialog) }} className="pf-tb" title="Insert Table">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
            </button>
            {showTableDialog && (
              <div className="pf-dropdown" style={{ padding: '12px', width: '200px' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', margin: '0 0 8px 0', fontWeight: 600 }}>INSERT TABLE</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Rows:</label>
                  <input type="number" value={tableRows} onChange={e => setTableRows(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={20}
                    style={{ width: '48px', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                  <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Cols:</label>
                  <input type="number" value={tableCols} onChange={e => setTableCols(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={10}
                    style={{ width: '48px', padding: '4px 6px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
                <button onClick={() => insertTable(tableRows, tableCols)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  Insert Table
                </button>
              </div>
            )}
          </div>

          {/* Link */}
          <ToolBtn onClick={insertLink} title="Insert Link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
          </ToolBtn>

          {/* Image */}
          <ToolBtn onClick={insertImage} title="Insert Image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
          </ToolBtn>

          <Sep />

          {/* Clear Formatting */}
          <ToolBtn onClick={clearFormatting} title="Clear Formatting">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /><line x1="2" y1="2" x2="22" y2="22" strokeWidth="1.5" stroke="#ef4444" /></svg>
          </ToolBtn>
        </div>
      )}

      {/* ======= MAIN CONTENT ======= */}
      <div className="pf-main-content" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ======= EDITOR ======= */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div style={{ flex: 1, overflowY: 'auto', borderRight: viewMode === 'split' ? '1px solid rgba(255,255,255,0.06)' : 'none', background: '#111' }}>
            <div ref={editorContentRef} className="pf-editor" contentEditable suppressContentEditableWarning
              onInput={saveUndoState}
              onKeyDown={e => {
                if (e.ctrlKey && e.key === 'b') { e.preventDefault(); execCmd('bold') }
                if (e.ctrlKey && e.key === 'i') { e.preventDefault(); execCmd('italic') }
                if (e.ctrlKey && e.key === 'u') { e.preventDefault(); execCmd('underline') }
                if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo() }
                if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo() }
                if (e.key === 'Tab') { e.preventDefault(); execCmd('indent') }
              }}
              dangerouslySetInnerHTML={{ __html: defaultContent }}
            />
          </div>
        )}

        {/* ======= PREVIEW - PAGINATED ======= */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className="pf-preview-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#e8e8e8' }}>
            {/* Page Navigation Bar */}
            <div className="pf-page-nav" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
              padding: '8px 16px', background: '#d4d4d4', borderBottom: '1px solid #bbb',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setCurrentPreviewPage(p => Math.max(1, p - 1))}
                disabled={currentPreviewPage <= 1}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #aaa',
                  background: currentPreviewPage <= 1 ? '#ccc' : '#fff', cursor: currentPreviewPage <= 1 ? 'not-allowed' : 'pointer',
                  color: currentPreviewPage <= 1 ? '#999' : '#333', fontSize: '12px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                Prev
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {totalPages <= 15 ? (
                  // Show all page buttons
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPreviewPage(page)}
                      style={{
                        width: '30px', height: '30px', borderRadius: '6px',
                        border: currentPreviewPage === page ? '2px solid #6366f1' : '1px solid #aaa',
                        background: currentPreviewPage === page ? '#6366f1' : '#fff',
                        color: currentPreviewPage === page ? '#fff' : '#333',
                        cursor: 'pointer', fontSize: '12px', fontWeight: currentPreviewPage === page ? 700 : 400,
                        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      {page}
                    </button>
                  ))
                ) : (
                  // Show compact navigation for many pages
                  <>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#333' }}>
                      Page
                    </span>
                    <input
                      type="number"
                      value={currentPreviewPage}
                      onChange={e => {
                        const v = parseInt(e.target.value)
                        if (v >= 1 && v <= totalPages) setCurrentPreviewPage(v)
                      }}
                      min={1}
                      max={totalPages}
                      style={{
                        width: '48px', padding: '4px 6px', borderRadius: '6px',
                        border: '1px solid #aaa', background: '#fff', color: '#333',
                        fontSize: '13px', textAlign: 'center', outline: 'none', fontFamily: 'inherit', fontWeight: 600,
                      }}
                    />
                    <span style={{ fontSize: '13px', color: '#555' }}>
                      of {totalPages}
                    </span>
                  </>
                )}
              </div>

              <button
                onClick={() => setCurrentPreviewPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPreviewPage >= totalPages}
                style={{
                  padding: '4px 10px', borderRadius: '6px', border: '1px solid #aaa',
                  background: currentPreviewPage >= totalPages ? '#ccc' : '#fff',
                  cursor: currentPreviewPage >= totalPages ? 'not-allowed' : 'pointer',
                  color: currentPreviewPage >= totalPages ? '#999' : '#333', fontSize: '12px', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                Next
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              </button>

              {/* View All Pages toggle */}
              <div style={{ width: '1px', height: '20px', background: '#bbb', margin: '0 4px' }} />
              <span style={{
                fontSize: '11px', color: '#666', fontWeight: 500,
              }}>
                {totalPages} {totalPages === 1 ? 'page' : 'pages'} | ~{(editorContentRef.current?.innerText || '').split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            {/* Page Content - Shows current page */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{
                maxWidth: '8.5in', margin: '0 auto',
              }}>
                {/* Current Page */}
                <div
                  className="pf-preview-page"
                  style={{
                    fontFamily: fmtStyle.fontFamily, fontSize: fmtStyle.fontSize,
                    lineHeight: fmtStyle.lineHeight,
                    boxShadow: '0 2px 20px rgba(0,0,0,0.2)', borderRadius: '2px',
                    minHeight: '11in',
                  }}
                >
                  <div dangerouslySetInnerHTML={{
                    __html: previewPages[currentPreviewPage - 1] || '<p style="color:#999;">No content on this page</p>'
                  }} />
                  {/* Page number footer */}
                  <div style={{
                    position: 'absolute', bottom: '24px', left: 0, right: 0,
                    textAlign: 'center', fontSize: '10px', color: '#999',
                    fontFamily: fmtStyle.fontFamily,
                  }}>
                    {currentPreviewPage}
                  </div>
                </div>

                {/* Page indicator below */}
                <div style={{
                  textAlign: 'center', padding: '16px 0 8px',
                  fontSize: '12px', color: '#888',
                }}>
                  Page {currentPreviewPage} of {totalPages}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======= AI PANEL ======= */}
        {showAIPanel && (
          <div className="research-panel-enter pf-ai-panel" style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#111', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2"><path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h3a3 3 0 0 1 3 3v1h-2v-1a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1H4v-1a3 3 0 0 1 3-3h3V9.5C8.8 8.8 8 7.5 8 6a4 4 0 0 1 4-4z" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /><circle cx="12" cy="19" r="2" /></svg>
                AI Paper Writer
              </h3>
              <button onClick={() => setShowAIPanel(false)} className="pf-tb" style={{ padding: '3px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>Generate Sections</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '12px' }}>
                {AI_SECTIONS.map(sec => (
                  <div key={sec.mode} className="pf-ai-card" onClick={() => { setSelectedAiMode(sec.mode); setAiPrompt(sec.mode === 'improve' ? getSelectedText() : '') }}
                    style={{ padding: '8px', borderRadius: '8px', background: selectedAiMode === sec.mode ? `${sec.color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${selectedAiMode === sec.mode ? sec.color + '30' : 'rgba(255,255,255,0.04)'}` }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '5px', marginBottom: '4px', background: `${sec.color}20`, color: sec.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{sec.icon}</div>
                    <p style={{ color: '#fff', fontSize: '10px', fontWeight: 500, margin: '0 0 1px 0' }}>{sec.label}</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px', margin: 0 }}>{sec.desc}</p>
                  </div>
                ))}
              </div>
              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                placeholder={selectedAiMode === 'improve' ? 'Paste text to improve...' : 'Topic or instructions...'}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', resize: 'vertical', outline: 'none', minHeight: '60px', fontFamily: 'inherit', lineHeight: '1.5' }} />
              <button onClick={() => handleAIGenerate(selectedAiMode, aiPrompt)} disabled={aiLoading || !aiPrompt.trim()}
                style={{ width: '100%', padding: '8px', borderRadius: '7px', border: 'none', cursor: aiLoading ? 'wait' : 'pointer', background: aiLoading ? 'rgba(139,92,246,0.1)' : 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', fontSize: '12px', fontWeight: 600, marginTop: '6px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: !aiPrompt.trim() ? 0.5 : 1 }}>
                {aiLoading ? <><div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'pfSpin 0.6s linear infinite' }} />Generating...</> : 'Generate'}
              </button>
              {aiResult && (
                <div style={{ marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Result</p>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button onClick={insertAIResult} className="pf-tb" style={{ fontSize: '10px', padding: '2px 6px', color: '#19c37d' }}>Insert</button>
                      <button onClick={() => navigator.clipboard.writeText(aiResult)} className="pf-tb" style={{ fontSize: '10px', padding: '2px 6px' }}>Copy</button>
                    </div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '280px', overflowY: 'auto' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{aiResult}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======= RESEARCH PANEL ======= */}
        {showResearchPanel && (
          <div className="research-panel-enter pf-research-panel" style={{ width: '320px', flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#111', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                AI Research
              </h3>
              <button onClick={() => setShowResearchPanel(false)} className="pf-tb" style={{ padding: '3px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'quick', label: 'Quick', color: '#19c37d' }, { id: 'deep', label: 'Deep', color: '#a855f7' },
                  { id: 'explain', label: 'Explain', color: '#3b82f6' }, { id: 'summary', label: 'Summary', color: '#f59e0b' },
                  { id: 'compare', label: 'Compare', color: '#ef4444' }, { id: 'brainstorm', label: 'Ideas', color: '#ec4899' },
                ].map(m => (
                  <button key={m.id} onClick={() => setResearchMode(m.id)} style={{ padding: '3px 8px', borderRadius: '5px', border: 'none', cursor: 'pointer', background: researchMode === m.id ? `${m.color}20` : 'rgba(255,255,255,0.04)', color: researchMode === m.id ? m.color : 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 500, fontFamily: 'inherit' }}>{m.label}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <input value={researchQuery} onChange={e => setResearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleResearch()}
                  placeholder="Research any topic..." style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)', fontSize: '12px', outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleResearch} disabled={researchLoading || !researchQuery.trim()} className="pf-tb"
                  style={{ padding: '7px 10px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', borderRadius: '7px', opacity: !researchQuery.trim() ? 0.5 : 1 }}>
                  {researchLoading ? <div style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'pfSpin 0.6s linear infinite' }} />
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
                </button>
              </div>
              {!researchResult && (
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {['Machine Learning', 'Neural Networks', 'Quantum Computing', 'Blockchain', 'IoT', 'NLP'].map(t => (
                    <button key={t} onClick={() => setResearchQuery(t)} style={{ padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', fontSize: '9px', cursor: 'pointer', fontFamily: 'inherit' }}>{t}</button>
                  ))}
                </div>
              )}
              {researchResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>Results</p>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <button onClick={() => { if (editorContentRef.current) { saveUndoState(); editorContentRef.current.innerHTML += `<p>${researchResult.replace(/\n/g, '</p><p>')}</p>`; setShowResearchPanel(false) } }} className="pf-tb" style={{ fontSize: '10px', padding: '2px 6px', color: '#19c37d' }}>Insert</button>
                      <button onClick={() => navigator.clipboard.writeText(researchResult)} className="pf-tb" style={{ fontSize: '10px', padding: '2px 6px' }}>Copy</button>
                    </div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: '7px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', maxHeight: '450px', overflowY: 'auto' }}>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{researchResult}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.md,.tex" style={{ display: 'none' }} onChange={handleFileUpload} />
    </div>
  )
}
