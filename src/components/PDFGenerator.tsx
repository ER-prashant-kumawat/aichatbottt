import { useState, useRef } from 'react'
import { useMutation, useQuery, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import jsPDF from 'jspdf'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

// PDF.js worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

interface PDFGeneratorProps {
  userId: string
  onBack: () => void
}

interface UploadedImage {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
}

type PDFStyle = 'professional' | 'academic' | 'creative' | 'minimal'

const STYLES: { id: PDFStyle; label: string; color: string; desc: string }[] = [
  { id: 'professional', label: 'Professional', color: '#3b82f6', desc: 'Clean, business-ready format' },
  { id: 'academic', label: 'Academic', color: '#8b5cf6', desc: 'Research paper style with sections' },
  { id: 'creative', label: 'Creative', color: '#ec4899', desc: 'Engaging and visually appealing' },
  { id: 'minimal', label: 'Minimal', color: '#14b8a6', desc: 'Simple, clean, no-frills' },
]

const FONT_SIZES = {
  professional: { title: 24, heading: 16, body: 11, subtitle: 13 },
  academic: { title: 22, heading: 15, body: 11, subtitle: 12 },
  creative: { title: 28, heading: 18, body: 12, subtitle: 14 },
  minimal: { title: 20, heading: 14, body: 11, subtitle: 12 },
}

const COLORS: Record<PDFStyle, { primary: [number, number, number]; accent: [number, number, number]; text: [number, number, number]; light: [number, number, number] }> = {
  professional: { primary: [37, 99, 235], accent: [59, 130, 246], text: [30, 30, 30], light: [240, 245, 255] },
  academic: { primary: [109, 40, 217], accent: [139, 92, 246], text: [25, 25, 25], light: [245, 240, 255] },
  creative: { primary: [219, 39, 119], accent: [236, 72, 153], text: [35, 35, 35], light: [255, 240, 248] },
  minimal: { primary: [60, 60, 60], accent: [100, 100, 100], text: [40, 40, 40], light: [248, 248, 248] },
}

export default function PDFGenerator({ userId, onBack }: PDFGeneratorProps) {
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [style, setStyle] = useState<PDFStyle>('professional')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [enhancing, setEnhancing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [extraInstructions, setExtraInstructions] = useState('')
  const [enhancedContent, setEnhancedContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')
  const [docUploading, setDocUploading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)

  const enhanceContent = useAction(api.pdfGenerator.enhanceContent)
  const generateTitle = useAction(api.pdfGenerator.generateTitle)
  const savePdfRecord = useMutation(api.pdfGenerator.savePdfRecord)
  const pdfHistory = useQuery(api.pdfGenerator.getPdfHistory, { userId: userId as any })
  const deletePdfRecord = useMutation(api.pdfGenerator.deletePdfRecord)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        const img = new Image()
        img.onload = () => {
          setImages(prev => [...prev, {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
            name: file.name,
            dataUrl,
            width: img.width,
            height: img.height,
          }])
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id))
  }

  // ===== PDF / DOC / DOCX / TXT File Upload & Parse =====
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDocUploading(true)
    setUploadedFileName(file.name)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase()

      if (ext === 'pdf') {
        // Parse PDF using pdf.js - preserve original formatting
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        let fullText = ''

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const textContent = await page.getTextContent()
          const items = textContent.items as any[]

          if (items.length === 0) continue

          // Sort items by Y position (top to bottom), then X (left to right)
          // PDF Y-axis is bottom-up, so we reverse it
          const sorted = [...items].filter(item => item.str !== undefined).sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5] // reverse Y
            if (Math.abs(yDiff) > 3) return yDiff // different line (3pt tolerance)
            return a.transform[4] - b.transform[4] // same line, sort by X
          })

          let pageText = ''
          let lastY: number | null = null
          let lastX: number | null = null
          let lastWidth: number | null = null
          let lastFontSize: number | null = null

          for (const item of sorted) {
            const currentY = Math.round(item.transform[5])
            const currentX = item.transform[4]
            const fontSize = Math.abs(item.transform[0]) || 12
            const text = item.str as string

            if (text === '') continue

            if (lastY === null) {
              // First item
              pageText += text
            } else {
              const yGap = Math.abs(currentY - lastY)

              if (yGap > 3) {
                // New line detected
                const lineGap = yGap / (lastFontSize || 12)
                if (lineGap > 1.8) {
                  // Paragraph break (big gap between lines)
                  pageText += '\n\n'
                } else {
                  // Normal line break
                  pageText += '\n'
                }
                pageText += text
              } else {
                // Same line - check spacing
                const expectedX = (lastX || 0) + (lastWidth || 0)
                const gap = currentX - expectedX
                if (gap > 5) {
                  pageText += '  ' + text // Tab-like space
                } else if (gap > 1) {
                  pageText += ' ' + text
                } else {
                  pageText += text
                }
              }
            }

            lastY = currentY
            lastX = currentX
            lastWidth = item.width || 0
            lastFontSize = fontSize
          }

          fullText += pageText.trim() + '\n\n'
        }

        const extracted = fullText.replace(/\n{3,}/g, '\n\n').trim()
        if (extracted) {
          // Put extracted content as-is, no modifications
          setContent(prev => prev ? prev + '\n\n' + extracted : extracted)
          // Auto-detect title from first non-empty line
          if (!title.trim()) {
            const firstLine = extracted.split('\n').find(l => l.trim().length > 3)
            if (firstLine && firstLine.trim().length < 100) {
              setTitle(firstLine.trim())
            }
          }
        } else {
          alert('Could not extract text from this PDF. It may be scanned/image-based.')
        }

      } else if (ext === 'docx' || ext === 'doc') {
        // Parse DOCX using mammoth
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.convertToHtml({ arrayBuffer })
        // Convert HTML to clean text with markdown-ish formatting
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = result.value
        let mdText = ''
        const processNode = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            mdText += node.textContent
            return
          }
          const el = node as HTMLElement
          const tag = el.tagName?.toLowerCase()
          if (tag === 'h1') { mdText += '\n# '; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'h2') { mdText += '\n## '; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'h3') { mdText += '\n### '; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'h4' || tag === 'h5' || tag === 'h6') { mdText += '\n### '; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'p') { el.childNodes.forEach(processNode); mdText += '\n\n' }
          else if (tag === 'br') { mdText += '\n' }
          else if (tag === 'li') { mdText += '- '; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'ul' || tag === 'ol') { mdText += '\n'; el.childNodes.forEach(processNode); mdText += '\n' }
          else if (tag === 'strong' || tag === 'b') { mdText += '**'; el.childNodes.forEach(processNode); mdText += '**' }
          else if (tag === 'em' || tag === 'i') { mdText += '*'; el.childNodes.forEach(processNode); mdText += '*' }
          else if (tag === 'table') {
            // Extract table content as text
            const rows = el.querySelectorAll('tr')
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th')
              const cellTexts: string[] = []
              cells.forEach(cell => cellTexts.push((cell.textContent || '').trim()))
              mdText += '| ' + cellTexts.join(' | ') + ' |\n'
            })
            mdText += '\n'
          }
          else { el.childNodes.forEach(processNode) }
        }
        tempDiv.childNodes.forEach(processNode)
        const extracted = mdText.replace(/\n{3,}/g, '\n\n').trim()
        if (extracted) {
          setContent(prev => prev ? prev + '\n\n' + extracted : extracted)
          if (!title.trim()) {
            const firstHeading = extracted.match(/^#\s+(.+)/m)
            if (firstHeading) {
              setTitle(firstHeading[1].trim())
            } else {
              const firstLine = extracted.split('\n').find(l => l.trim().length > 3)
              if (firstLine && firstLine.trim().length < 100) {
                setTitle(firstLine.trim().replace(/^#+\s*/, ''))
              }
            }
          }
        } else {
          alert('Could not extract content from this document.')
        }

      } else if (ext === 'txt') {
        // Plain text
        const text = await file.text()
        setContent(prev => prev ? prev + '\n\n' + text : text)
        if (!title.trim()) {
          const firstLine = text.split('\n').find(l => l.trim().length > 3)
          if (firstLine && firstLine.trim().length < 100) {
            setTitle(firstLine.trim())
          }
        }

      } else {
        alert('Unsupported file type. Please upload PDF, DOCX, DOC, or TXT files.')
      }
    } catch (err) {
      console.error('File parsing failed:', err)
      alert('Failed to parse file. Please try a different file.')
    }

    setDocUploading(false)
    if (docInputRef.current) docInputRef.current.value = ''
  }

  const handleEnhance = async () => {
    if (!content.trim()) return
    setEnhancing(true)
    try {
      const enhanced = await enhanceContent({
        content: content.trim(),
        style,
        instructions: extraInstructions || undefined,
      })
      setEnhancedContent(enhanced)
      if (!title.trim()) {
        const aiTitle = await generateTitle({ content: content.trim() })
        setTitle(aiTitle)
      }
    } catch (err) {
      console.error('Enhancement failed:', err)
      setEnhancedContent(content)
    }
    setEnhancing(false)
  }

  const buildPDF = async () => {
    const textToUse = enhancedContent || content
    if (!textToUse.trim()) return

    setGenerating(true)
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - margin * 2
      const colors = COLORS[style]
      const fonts = FONT_SIZES[style]
      let y = margin

      const addNewPageIfNeeded = (needed: number) => {
        if (y + needed > pageHeight - margin) {
          doc.addPage()
          y = margin
          // Add page header line
          doc.setDrawColor(...colors.accent)
          doc.setLineWidth(0.3)
          doc.line(margin, y - 5, pageWidth - margin, y - 5)
          y += 2
        }
      }

      // ===== COVER / HEADER =====
      if (style === 'professional') {
        // Top accent bar
        doc.setFillColor(...colors.primary)
        doc.rect(0, 0, pageWidth, 8, 'F')
        // Title area
        y = 35
        doc.setFontSize(fonts.title)
        doc.setTextColor(...colors.primary)
        doc.setFont('helvetica', 'bold')
        const titleText = title || 'Untitled Document'
        const titleLines = doc.splitTextToSize(titleText, contentWidth)
        doc.text(titleLines, margin, y)
        y += titleLines.length * 10 + 5
        // Subtitle line
        doc.setDrawColor(...colors.accent)
        doc.setLineWidth(0.8)
        doc.line(margin, y, margin + 50, y)
        y += 8
        doc.setFontSize(9)
        doc.setTextColor(130, 130, 130)
        doc.setFont('helvetica', 'normal')
        doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, y)
        y += 15
      } else if (style === 'academic') {
        // Academic header
        y = 30
        doc.setFontSize(fonts.title)
        doc.setTextColor(...colors.primary)
        doc.setFont('helvetica', 'bold')
        const titleText = title || 'Untitled Paper'
        const titleLines = doc.splitTextToSize(titleText, contentWidth)
        doc.text(titleLines, pageWidth / 2, y, { align: 'center' })
        y += titleLines.length * 9 + 5
        doc.setDrawColor(...colors.accent)
        doc.setLineWidth(0.5)
        doc.line(margin + 30, y, pageWidth - margin - 30, y)
        y += 6
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'italic')
        doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, y, { align: 'center' })
        y += 15
      } else if (style === 'creative') {
        // Creative gradient-like header
        doc.setFillColor(...colors.primary)
        doc.rect(0, 0, pageWidth, 55, 'F')
        doc.setFillColor(colors.primary[0] + 30, colors.primary[1] + 20, colors.primary[2] + 20)
        doc.rect(0, 45, pageWidth, 15, 'F')
        y = 30
        doc.setFontSize(fonts.title)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        const titleText = title || 'Untitled'
        const titleLines = doc.splitTextToSize(titleText, contentWidth - 10)
        doc.text(titleLines, pageWidth / 2, y, { align: 'center' })
        y = 70
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, y, { align: 'center' })
        y += 12
      } else {
        // Minimal
        y = 25
        doc.setFontSize(fonts.title)
        doc.setTextColor(...colors.text)
        doc.setFont('helvetica', 'bold')
        const titleText = title || 'Untitled'
        doc.text(titleText, margin, y)
        y += 8
        doc.setFontSize(9)
        doc.setTextColor(160, 160, 160)
        doc.setFont('helvetica', 'normal')
        doc.text(new Date().toLocaleDateString(), margin, y)
        y += 15
      }

      // ===== BODY CONTENT =====
      const lines = textToUse.split('\n')
      doc.setFontSize(fonts.body)
      doc.setTextColor(...colors.text)
      doc.setFont('helvetica', 'normal')

      for (const line of lines) {
        const trimmed = line.trim()

        if (!trimmed) {
          y += 4
          continue
        }

        // Markdown headings
        if (trimmed.startsWith('## ')) {
          addNewPageIfNeeded(14)
          y += 6
          doc.setFontSize(fonts.heading)
          doc.setTextColor(...colors.primary)
          doc.setFont('helvetica', 'bold')
          const headingText = trimmed.replace(/^##\s*/, '')
          const headingLines = doc.splitTextToSize(headingText, contentWidth)
          doc.text(headingLines, margin, y)
          y += headingLines.length * 7 + 2
          // Underline for heading
          doc.setDrawColor(...colors.accent)
          doc.setLineWidth(0.4)
          doc.line(margin, y, margin + Math.min(doc.getTextWidth(headingText), contentWidth), y)
          y += 5
          doc.setFontSize(fonts.body)
          doc.setTextColor(...colors.text)
          doc.setFont('helvetica', 'normal')
          continue
        }

        if (trimmed.startsWith('### ')) {
          addNewPageIfNeeded(12)
          y += 4
          doc.setFontSize(fonts.subtitle)
          doc.setTextColor(...colors.accent)
          doc.setFont('helvetica', 'bold')
          const subText = trimmed.replace(/^###\s*/, '')
          const subLines = doc.splitTextToSize(subText, contentWidth)
          doc.text(subLines, margin, y)
          y += subLines.length * 6 + 4
          doc.setFontSize(fonts.body)
          doc.setTextColor(...colors.text)
          doc.setFont('helvetica', 'normal')
          continue
        }

        if (trimmed.startsWith('# ')) {
          addNewPageIfNeeded(16)
          y += 8
          doc.setFontSize(fonts.heading + 2)
          doc.setTextColor(...colors.primary)
          doc.setFont('helvetica', 'bold')
          const h1Text = trimmed.replace(/^#\s*/, '')
          const h1Lines = doc.splitTextToSize(h1Text, contentWidth)
          doc.text(h1Lines, margin, y)
          y += h1Lines.length * 8 + 4
          doc.setFontSize(fonts.body)
          doc.setTextColor(...colors.text)
          doc.setFont('helvetica', 'normal')
          continue
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.match(/^\d+\.\s/)) {
          const bulletText = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '')
          const wrappedLines = doc.splitTextToSize(bulletText, contentWidth - 10)
          addNewPageIfNeeded(wrappedLines.length * 5 + 2)
          doc.setFillColor(...colors.accent)
          doc.circle(margin + 2, y - 1.2, 1, 'F')
          doc.text(wrappedLines, margin + 7, y)
          y += wrappedLines.length * 5 + 2
          continue
        }

        // Bold text (simple: **text**)
        const cleanLine = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1')

        // Regular paragraph
        const wrappedLines = doc.splitTextToSize(cleanLine, contentWidth)
        addNewPageIfNeeded(wrappedLines.length * 5 + 2)
        doc.text(wrappedLines, margin, y)
        y += wrappedLines.length * 5 + 2
      }

      // ===== IMAGES =====
      if (images.length > 0) {
        addNewPageIfNeeded(20)
        y += 10
        doc.setFontSize(fonts.heading)
        doc.setTextColor(...colors.primary)
        doc.setFont('helvetica', 'bold')
        doc.text('Images', margin, y)
        y += 3
        doc.setDrawColor(...colors.accent)
        doc.setLineWidth(0.4)
        doc.line(margin, y, margin + 30, y)
        y += 8

        for (const img of images) {
          const maxImgWidth = contentWidth
          const maxImgHeight = 100
          let imgW = img.width
          let imgH = img.height
          // Scale down
          if (imgW > maxImgWidth) {
            const ratio = maxImgWidth / imgW
            imgW = maxImgWidth
            imgH = imgH * ratio
          }
          if (imgH > maxImgHeight) {
            const ratio = maxImgHeight / imgH
            imgH = maxImgHeight
            imgW = imgW * ratio
          }

          addNewPageIfNeeded(imgH + 12)

          // Image border
          doc.setDrawColor(220, 220, 220)
          doc.setLineWidth(0.3)
          doc.roundedRect(margin - 1, y - 1, imgW + 2, imgH + 2, 2, 2, 'S')

          doc.addImage(img.dataUrl, 'JPEG', margin, y, imgW, imgH)
          y += imgH + 4

          // Image caption
          doc.setFontSize(8)
          doc.setTextColor(140, 140, 140)
          doc.setFont('helvetica', 'italic')
          doc.text(img.name, margin, y)
          y += 8
          doc.setFontSize(fonts.body)
          doc.setTextColor(...colors.text)
          doc.setFont('helvetica', 'normal')
        }
      }

      // ===== FOOTER on each page =====
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 180)
        doc.setFont('helvetica', 'normal')
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
        // Bottom accent line
        doc.setDrawColor(...colors.accent)
        doc.setLineWidth(0.2)
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)
      }

      // Save
      const fileName = (title || 'document').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
      doc.save(`${fileName}.pdf`)

      // Save record
      await savePdfRecord({
        userId: userId as any,
        title: title || 'Untitled Document',
        content: (enhancedContent || content).substring(0, 5000),
        style,
        pageCount: totalPages,
        hasImages: images.length > 0,
      })

    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('PDF generation failed. Please try again.')
    }
    setGenerating(false)
  }

  const handleDeleteHistory = async (id: string) => {
    try {
      await deletePdfRecord({ id: id as any, userId: userId as any })
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      backgroundColor: '#1a1a1a', color: '#ececec', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex',
          alignItems: 'center', transition: 'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ececec' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>AI PDF Generator</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Create beautiful PDFs with AI enhancement</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px' }}>
          {(['write', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.2s',
              backgroundColor: activeTab === tab ? 'rgba(245,158,11,0.15)' : 'transparent',
              color: activeTab === tab ? '#f59e0b' : 'rgba(255,255,255,0.5)',
            }}>
              {tab === 'write' ? 'Create PDF' : 'History'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'write' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', gap: '24px' }}>
          {/* Left: Input */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            {/* Upload Document */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Upload PDF / DOCX / TXT (auto-extract content)
              </label>
              <div
                onClick={() => !docUploading && docInputRef.current?.click()}
                style={{
                  padding: '16px', backgroundColor: 'rgba(245,158,11,0.04)',
                  border: '2px dashed rgba(245,158,11,0.25)', borderRadius: '12px',
                  cursor: docUploading ? 'wait' : 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '14px',
                }}
                onMouseEnter={e => { if (!docUploading) { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.08)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.04)' }}
              >
                <div style={{
                  width: '42px', height: '42px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {docUploading ? (
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '20px', height: '20px', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%' }} />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ececec', marginBottom: '2px' }}>
                    {docUploading ? 'Extracting content...' : uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Click to upload a document'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {docUploading ? 'Please wait, reading your file...' : 'Supports PDF, DOCX, DOC, TXT - Title, headings & content auto-extracted'}
                  </div>
                </div>
                {uploadedFileName && !docUploading && (
                  <div style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                    backgroundColor: 'rgba(25,195,125,0.1)', color: '#19c37d',
                  }}>
                    Loaded
                  </div>
                )}
              </div>
              <input
                ref={docInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleDocUpload}
                style={{ display: 'none' }}
              />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>CONTENT WILL APPEAR BELOW - EDIT OR ADD MORE</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* Title */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Document Title (or AI will generate one)
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Quarterly Report, Research Paper..."
                style={{
                  width: '100%', padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ececec',
                  fontSize: '14px', fontFamily: 'inherit', outline: 'none', transition: 'border 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Your Content (edit freely - stays as-is until you click Enhance)
              </label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Upload a PDF/DOCX above or type content here. Content stays exactly as-is. AI only modifies when you click 'Enhance with AI'. Use ## for headings, - for bullets."
                style={{
                  flex: 1, minHeight: '200px', padding: '14px', backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ececec',
                  fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                  lineHeight: '1.6', transition: 'border 0.2s', boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Extra instructions */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Extra Instructions for AI (optional)
              </label>
              <input
                value={extraInstructions}
                onChange={e => setExtraInstructions(e.target.value)}
                placeholder="e.g., Add a conclusion section, make it more formal, include summary..."
                style={{
                  width: '100%', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#ececec',
                  fontSize: '13px', fontFamily: 'inherit', outline: 'none', transition: 'border 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#f59e0b'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Images Upload */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', display: 'block', fontWeight: 500 }}>
                Upload Images
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', display: 'flex',
                  alignItems: 'center', gap: '8px', transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#f59e0b'; e.currentTarget.style.color = '#f59e0b' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Add Images
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ display: 'none' }} />

                {images.map(img => (
                  <div key={img.id} style={{
                    position: 'relative', width: '70px', height: '70px', borderRadius: '8px',
                    overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => removeImage(img.id)} style={{
                      position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.7)',
                      border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '50%',
                      width: '20px', height: '20px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: '14px', padding: 0,
                    }}>
                      x
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Options & Actions */}
          <div style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Style Selection */}
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', display: 'block', fontWeight: 500 }}>
                PDF Style
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {STYLES.map(s => (
                  <button key={s.id} onClick={() => setStyle(s.id)} style={{
                    padding: '12px 14px', backgroundColor: style === s.id ? `${s.color}15` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${style === s.id ? s.color + '40' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    fontFamily: 'inherit',
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: style === s.id ? s.color : '#ececec' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                      {s.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <button onClick={handleEnhance} disabled={!content.trim() || enhancing} style={{
                padding: '14px', borderRadius: '10px', border: 'none', cursor: content.trim() && !enhancing ? 'pointer' : 'not-allowed',
                background: content.trim() && !enhancing ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.08)',
                color: content.trim() && !enhancing ? '#fff' : 'rgba(255,255,255,0.3)',
                fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {enhancing ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                    AI Enhancing...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Enhance with AI
                  </>
                )}
              </button>

              <button onClick={buildPDF} disabled={(!content.trim() && !enhancedContent.trim()) || generating} style={{
                padding: '14px', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)',
                cursor: (content.trim() || enhancedContent.trim()) && !generating ? 'pointer' : 'not-allowed',
                background: 'transparent',
                color: (content.trim() || enhancedContent.trim()) && !generating ? '#f59e0b' : 'rgba(255,255,255,0.3)',
                fontSize: '14px', fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}>
                {generating ? (
                  <>
                    <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', width: '16px', height: '16px', border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%' }} />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>

              {enhancedContent && (
                <button onClick={() => setShowPreview(!showPreview)} style={{
                  padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  fontSize: '13px', fontFamily: 'inherit', transition: 'all 0.2s',
                }}>
                  {showPreview ? 'Hide' : 'Show'} Enhanced Preview
                </button>
              )}
            </div>

            {/* Stats */}
            <div style={{
              padding: '14px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontWeight: 500 }}>Document Stats</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Words</span>
                  <span style={{ color: '#ececec' }}>{(enhancedContent || content).split(/\s+/).filter(Boolean).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Characters</span>
                  <span style={{ color: '#ececec' }}>{(enhancedContent || content).length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Images</span>
                  <span style={{ color: '#ececec' }}>{images.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>Style</span>
                  <span style={{ color: STYLES.find(s => s.id === style)?.color }}>{STYLES.find(s => s.id === style)?.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>AI Enhanced</span>
                  <span style={{ color: enhancedContent ? '#19c37d' : 'rgba(255,255,255,0.3)' }}>{enhancedContent ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {!pdfHistory || pdfHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: '16px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <p style={{ fontSize: '15px', marginBottom: '4px' }}>No PDFs generated yet</p>
              <p style={{ fontSize: '13px' }}>Create your first PDF to see it here</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {pdfHistory.map((pdf: any) => (
                <div key={pdf._id} style={{
                  padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#ececec', lineHeight: 1.3 }}>
                      {pdf.title}
                    </h3>
                    <button onClick={() => handleDeleteHistory(pdf._id)} style={{
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                      padding: '4px', borderRadius: '4px', flexShrink: 0,
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                      backgroundColor: `${STYLES.find(s => s.id === pdf.style)?.color || '#666'}15`,
                      color: STYLES.find(s => s.id === pdf.style)?.color || '#666',
                    }}>
                      {pdf.style}
                    </span>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                      backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                    }}>
                      {pdf.pageCount} page{pdf.pageCount !== 1 ? 's' : ''}
                    </span>
                    {pdf.hasImages && (
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                        backgroundColor: 'rgba(236,72,153,0.1)', color: '#ec4899',
                      }}>
                        Has images
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                    {new Date(pdf.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Preview Modal */}
      {showPreview && enhancedContent && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowPreview(false)}>
          <div style={{
            width: '600px', maxHeight: '80vh', backgroundColor: '#1e1e1e',
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'auto', padding: '24px',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#f59e0b' }}>AI Enhanced Preview</h3>
              <button onClick={() => setShowPreview(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                fontSize: '18px', padding: '4px 8px',
              }}>x</button>
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '13px',
              lineHeight: '1.7', color: 'rgba(255,255,255,0.8)', fontFamily: 'inherit',
              margin: 0,
            }}>
              {enhancedContent}
            </pre>
            <button onClick={() => {
              setContent(enhancedContent)
              setShowPreview(false)
            }} style={{
              marginTop: '16px', padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit',
            }}>
              Use Enhanced Content
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
