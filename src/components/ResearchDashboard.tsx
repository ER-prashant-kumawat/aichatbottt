import { useState, useRef, useEffect } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

interface ResearchDashboardProps {
  userId: string
  onBack: () => void
}

type DashTab = 'search' | 'library' | 'notes' | 'ai-chat'

// ===========================
// PAPER SEARCH TAB
// ===========================
function PaperSearchTab({ userId }: { userId: string }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [wikiResults, setWikiResults] = useState<any[]>([])
  const [source, setSource] = useState<'arxiv' | 'wikipedia'>('arxiv')
  const [error, setError] = useState('')
  const [summarizing, setSummarizing] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [savedPaperUrls, setSavedPaperUrls] = useState<Set<string>>(new Set())

  const searchArxiv = useAction(api.papers.searchArxiv)
  const searchWikipedia = useAction(api.papers.searchWikipedia)
  const summarizePaper = useAction(api.papers.summarizePaper)
  const savePaper = useMutation(api.papers.savePaper)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    try {
      if (source === 'arxiv') {
        const res = await searchArxiv({ query: query.trim(), maxResults: 15 })
        if (res.success) setResults(res.papers || [])
        else setError(res.error || 'Search failed')
      } else {
        const res = await searchWikipedia({ query: query.trim(), maxResults: 10 })
        if (res.success) setWikiResults(res.results || [])
        else setError(res.error || 'Search failed')
      }
    } catch (err: any) {
      setError(err.message || 'Search failed')
    }
    setSearching(false)
  }

  const handleSummarize = async (paper: any) => {
    if (summaries[paper.title]) return
    setSummarizing(paper.title)
    try {
      const res = await summarizePaper({ title: paper.title, abstract: paper.abstract })
      if (res.success && res.summary) {
        setSummaries(prev => ({ ...prev, [paper.title]: res.summary! }))
      }
    } catch {}
    setSummarizing(null)
  }

  const handleSave = async (paper: any) => {
    try {
      await savePaper({
        userId: userId as any,
        title: paper.title,
        authors: paper.authors || '',
        abstract: paper.abstract || paper.snippet || '',
        url: paper.url,
        source: paper.source || source,
        publishedDate: paper.published,
        collection: 'General',
      })
      setSavedPaperUrls(prev => new Set([...prev, paper.url]))
    } catch {}
  }

  const SUGGESTIONS = [
    "machine learning transformers",
    "quantum computing algorithms",
    "climate change deep learning",
    "natural language processing",
    "reinforcement learning robotics",
    "computer vision medical imaging",
    "blockchain consensus mechanisms",
    "neural network optimization",
  ]

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Search Box */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
          padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '20px',
        }}>
          {/* Source Toggle */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
            {(['arxiv', 'wikipedia'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)} style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                background: source === s ? (s === 'arxiv' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)') : 'rgba(255,255,255,0.04)',
                color: source === s ? (s === 'arxiv' ? '#ef4444' : '#3b82f6') : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', fontWeight: 500,
              }}>
                {s === 'arxiv' ? '📄 Arxiv Papers' : '📖 Wikipedia'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={source === 'arxiv' ? "Search research papers... (e.g., 'transformer attention mechanism')" : "Search Wikipedia articles..."}
              style={{
                flex: 1, padding: '14px 18px', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#fff', fontSize: '15px', fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={handleSearch} disabled={searching || !query.trim()} style={{
              padding: '14px 24px', borderRadius: '12px', border: 'none',
              background: searching ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ef4444, #f97316)',
              color: '#fff', fontSize: '14px', fontWeight: 600, cursor: searching ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' as const,
            }}>
              {searching ? (
                <><div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> Searching...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Search</>
              )}
            </button>
          </div>

          {/* Suggestions */}
          {results.length === 0 && wikiResults.length === 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => { setQuery(s); }} style={{
                  padding: '5px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                >{s}</button>
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        {/* Arxiv Results */}
        {source === 'arxiv' && results.length > 0 && (
          <div>
            <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '12px' }}>Found {results.length} papers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {results.map((paper, i) => (
                <div key={i} style={{
                  padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)', transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: '0 0 6px 0', lineHeight: 1.4 }}>
                        {paper.title}
                      </h4>
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 6px 0' }}>
                        {paper.authors}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                        {paper.abstract?.substring(0, 250)}...
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                          {paper.published}
                        </span>
                        {paper.categories && (
                          <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                            {paper.categories}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => handleSummarize(paper)} disabled={summarizing === paper.title} style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.3)',
                        background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', cursor: 'pointer',
                        fontSize: '11px', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap' as const,
                      }}>
                        {summarizing === paper.title ? 'Summarizing...' : summaries[paper.title] ? 'View Summary' : 'AI Summary'}
                      </button>
                      <button onClick={() => handleSave(paper)} disabled={savedPaperUrls.has(paper.url)} style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)',
                        background: savedPaperUrls.has(paper.url) ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
                        color: '#10b981', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', fontWeight: 500,
                      }}>
                        {savedPaperUrls.has(paper.url) ? 'Saved ✓' : 'Save to Library'}
                      </button>
                      <a href={paper.url} target="_blank" rel="noreferrer" style={{
                        padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)',
                        fontSize: '11px', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none',
                      }}>
                        Open PDF
                      </a>
                    </div>
                  </div>
                  {/* AI Summary */}
                  {summaries[paper.title] && (
                    <div style={{
                      marginTop: '12px', padding: '14px', borderRadius: '10px',
                      background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)',
                    }}>
                      <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600, marginBottom: '6px' }}>AI Summary</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
                        {summaries[paper.title]}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wikipedia Results */}
        {source === 'wikipedia' && wikiResults.length > 0 && (
          <div>
            <h3 style={{ color: '#fff', fontSize: '15px', marginBottom: '12px' }}>Found {wikiResults.length} articles</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {wikiResults.map((item, i) => (
                <div key={i} style={{
                  padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255,255,255,0.02)',
                }}>
                  <h4 style={{ color: '#fff', fontSize: '14px', margin: '0 0 4px 0' }}>{item.title}</h4>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '0 0 8px 0', lineHeight: 1.5 }}>{item.snippet}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{item.wordcount} words</span>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{
                      padding: '4px 12px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)',
                      color: '#3b82f6', fontSize: '11px', textDecoration: 'none',
                    }}>Read on Wikipedia</a>
                    <button onClick={() => handleSave({ ...item, authors: 'Wikipedia', abstract: item.snippet, source: 'wikipedia' })} style={{
                      padding: '4px 12px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)',
                      color: '#10b981', fontSize: '11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}>Save</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ===========================
// LIBRARY TAB
// ===========================
function LibraryTab({ userId }: { userId: string }) {
  const papers = useQuery(api.papers.getPapers, { userId: userId as any })
  const deletePaper = useMutation(api.papers.deletePaper)
  const updateTags = useMutation(api.papers.updatePaperTags)
  const updateNotes = useMutation(api.papers.updatePaperNotes)
  const [selectedPaper, setSelectedPaper] = useState<any>(null)
  const [filterCollection, setFilterCollection] = useState('All')
  const [searchFilter, setSearchFilter] = useState('')
  const [editingNote, setEditingNote] = useState('')
  const [editingTags, setEditingTags] = useState('')

  const collections = ['All', ...new Set(papers?.map((p: any) => p.collection) || [])]
  const filtered = (papers || []).filter((p: any) => {
    if (filterCollection !== 'All' && p.collection !== filterCollection) return false
    if (searchFilter && !p.title.toLowerCase().includes(searchFilter.toLowerCase())) return false
    return true
  })

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Paper List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', borderRight: selectedPaper ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} placeholder="Search library..." style={{
            flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
          }} />
          {collections.map(c => (
            <button key={c} onClick={() => setFilterCollection(c)} style={{
              padding: '6px 14px', borderRadius: '16px', border: 'none', fontSize: '12px', fontFamily: 'inherit',
              background: filterCollection === c ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              color: filterCollection === c ? '#ef4444' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
            }}>{c}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.25)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
            <p style={{ fontSize: '15px', marginBottom: '6px' }}>Library is empty</p>
            <p style={{ fontSize: '12px' }}>Search for papers and save them here!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginBottom: '4px' }}>{filtered.length} papers</p>
            {filtered.map((paper: any) => (
              <div key={paper._id} onClick={() => { setSelectedPaper(paper); setEditingNote(paper.notes || ''); setEditingTags(paper.tags || '') }} style={{
                padding: '14px 16px', borderRadius: '10px',
                border: selectedPaper?._id === paper._id ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                background: selectedPaper?._id === paper._id ? 'rgba(239,68,68,0.05)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <h4 style={{ color: '#fff', fontSize: '13px', fontWeight: 500, margin: '0 0 4px 0', lineHeight: 1.4 }}>{paper.title}</h4>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', margin: '0 0 6px 0' }}>{paper.authors}</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>{paper.source}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{paper.collection}</span>
                  {paper.tags && paper.tags.split(',').map((t: string) => (
                    <span key={t} style={{ padding: '2px 8px', borderRadius: '8px', fontSize: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>{t.trim()}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paper Detail */}
      {selectedPaper && (
        <div style={{ width: '360px', minWidth: '360px', overflowY: 'auto', padding: '20px', background: 'rgba(255,255,255,0.01)' }}>
          <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 600, margin: '0 0 8px 0', lineHeight: 1.4 }}>{selectedPaper.title}</h3>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 12px 0' }}>{selectedPaper.authors}</p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12px', lineHeight: 1.6, margin: '0 0 16px 0' }}>{selectedPaper.abstract}</p>

          {/* Tags */}
          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '4px' }}>Tags (comma separated)</label>
          <input value={editingTags} onChange={(e) => setEditingTags(e.target.value)}
            onBlur={() => updateTags({ id: selectedPaper._id, tags: editingTags, userId: userId as any })}
            placeholder="AI, ML, NLP..." style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none', marginBottom: '12px',
            }} />

          {/* Notes */}
          <label style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '4px' }}>Personal Notes</label>
          <textarea value={editingNote} onChange={(e) => setEditingNote(e.target.value)}
            onBlur={() => updateNotes({ id: selectedPaper._id, notes: editingNote, userId: userId as any })}
            placeholder="Write your notes about this paper..." style={{
              width: '100%', minHeight: '120px', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '12px', fontFamily: 'inherit', outline: 'none', resize: 'vertical',
              marginBottom: '12px',
            }} />

          <div style={{ display: 'flex', gap: '6px' }}>
            <a href={selectedPaper.url} target="_blank" rel="noreferrer" style={{
              flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)',
              color: '#3b82f6', fontSize: '12px', textAlign: 'center', textDecoration: 'none',
            }}>Open Paper</a>
            <button onClick={() => { deletePaper({ id: selectedPaper._id, userId: userId as any }); setSelectedPaper(null) }} style={{
              padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'rgba(239,68,68,0.1)',
              color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            }}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ===========================
// NOTES TAB
// ===========================
function NotesTab({ userId }: { userId: string }) {
  const notes = useQuery(api.papers.getNotes, { userId: userId as any })
  const createNote = useMutation(api.papers.createNote)
  const updateNote = useMutation(api.papers.updateNote)
  const deleteNote = useMutation(api.papers.deleteNote)
  const [selectedNote, setSelectedNote] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [folder, setFolder] = useState('General')
  const [preview, setPreview] = useState(false)
  const saveTimeoutRef = useRef<any>(null)

  const folders = ['All', ...new Set(notes?.map((n: any) => n.folder) || [])]
  const [filterFolder, setFilterFolder] = useState('All')
  const filtered = (notes || []).filter((n: any) => filterFolder === 'All' || n.folder === filterFolder)

  const handleNew = async () => {
    const id = await createNote({
      userId: userId as any,
      title: 'Untitled Note',
      content: '',
      folder: 'General',
    })
    // Reload will happen via query
    setTitle('Untitled Note')
    setContent('')
    setFolder('General')
  }

  const selectNote = (note: any) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
    setFolder(note.folder)
    setPreview(false)
  }

  // Auto-save on content change
  const autoSave = (newTitle: string, newContent: string, newFolder: string) => {
    if (!selectedNote) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      updateNote({
        id: selectedNote._id,
        title: newTitle,
        content: newContent,
        folder: newFolder,
        userId: userId as any,
      })
    }, 800)
  }

  // Simple markdown to HTML
  const renderMd = (text: string) => {
    return text
      .replace(/^### (.+)$/gm, '<h3 style="color:#fff;font-size:16px;font-weight:600;margin:12px 0 6px">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 style="color:#fff;font-size:18px;font-weight:700;margin:16px 0 8px">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 style="color:#fff;font-size:22px;font-weight:700;margin:20px 0 10px">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff">$1</strong>')
      .replace(/^- (.+)$/gm, '<li style="margin-left:16px;color:rgba(255,255,255,0.7)">$1</li>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Notes List */}
      <div style={{ width: '280px', minWidth: '280px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px', overflowY: 'auto' }}>
        <button onClick={handleNew} style={{
          width: '100%', padding: '10px', borderRadius: '10px', border: '1px dashed rgba(255,255,255,0.15)',
          background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
          fontSize: '13px', fontFamily: 'inherit', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Note
        </button>

        {/* Folders */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
          {folders.map(f => (
            <button key={f} onClick={() => setFilterFolder(f)} style={{
              padding: '4px 10px', borderRadius: '12px', border: 'none', fontSize: '10px', fontFamily: 'inherit',
              background: filterFolder === f ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
              color: filterFolder === f ? '#f59e0b' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
            }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No notes yet</p>
          ) : filtered.map((note: any) => (
            <div key={note._id} onClick={() => selectNote(note)} style={{
              padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
              background: selectedNote?._id === note._id ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
              border: selectedNote?._id === note._id ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {note.pinned && <span style={{ color: '#f59e0b', fontSize: '10px' }}>📌</span>}
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{note.title}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                {note.folder} | {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedNote ? (
          <>
            {/* Editor Toolbar */}
            <div style={{
              padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <input value={title} onChange={(e) => { setTitle(e.target.value); autoSave(e.target.value, content, folder) }}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: '14px', fontWeight: 600,
                  fontFamily: 'inherit', outline: 'none',
                }} />
              <select value={folder} onChange={(e) => { setFolder(e.target.value); autoSave(title, content, e.target.value) }}
                style={{
                  padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '11px',
                  fontFamily: 'inherit', outline: 'none',
                }}>
                <option value="General">General</option>
                <option value="Research">Research</option>
                <option value="Ideas">Ideas</option>
                <option value="Papers">Papers</option>
                <option value="Notes">Notes</option>
              </select>
              <button onClick={() => setPreview(!preview)} style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '11px', fontFamily: 'inherit',
                background: preview ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                color: preview ? '#10b981' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}>{preview ? 'Edit' : 'Preview'}</button>
              <button onClick={() => updateNote({ id: selectedNote._id, pinned: !selectedNote.pinned, userId: userId as any })} style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '13px',
                background: 'rgba(255,255,255,0.04)', cursor: 'pointer',
                color: selectedNote.pinned ? '#f59e0b' : 'rgba(255,255,255,0.3)',
              }}>{selectedNote.pinned ? '📌' : '📍'}</button>
              <button onClick={() => { deleteNote({ id: selectedNote._id, userId: userId as any }); setSelectedNote(null) }} style={{
                padding: '6px 10px', borderRadius: '6px', border: 'none', fontSize: '11px',
                background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit',
              }}>Delete</button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {preview ? (
                <div style={{ padding: '20px 24px', fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: renderMd(content) }} />
              ) : (
                <textarea value={content} onChange={(e) => { setContent(e.target.value); autoSave(title, e.target.value, folder) }}
                  placeholder="Start writing your research notes here...&#10;&#10;Supports **bold**, ## headings, - lists&#10;&#10;Click 'Preview' to see formatted output."
                  style={{
                    width: '100%', height: '100%', padding: '20px 24px', border: 'none',
                    background: 'transparent', color: 'rgba(255,255,255,0.8)', fontSize: '14px',
                    fontFamily: "'Space Mono', monospace", lineHeight: 1.8, resize: 'none', outline: 'none',
                  }} />
              )}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: 'rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
            <p style={{ fontSize: '15px' }}>Select a note or create new one</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Markdown supported: **bold**, ## heading, - list</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===========================
// MAIN DASHBOARD COMPONENT
// ===========================
export default function ResearchDashboard({ userId, onBack }: ResearchDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashTab>('search')

  const TABS: { id: DashTab; label: string; icon: string; color: string }[] = [
    { id: 'search', label: 'Paper Search', icon: '🔍', color: '#ef4444' },
    { id: 'library', label: 'Smart Library', icon: '📚', color: '#3b82f6' },
    { id: 'notes', label: 'Research Notes', icon: '📝', color: '#f59e0b' },
    { id: 'ai-chat', label: 'AI Research', icon: '🤖', color: '#8b5cf6' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, background: '#171717',
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff',
          width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: '#fff' }}>Research Dashboard</h2>
          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Search papers, save to library, write notes - like Umbrella AI</p>
        </div>

        {/* Tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '8px 14px', borderRadius: '8px', border: 'none',
              background: activeTab === tab.id ? `${tab.color}20` : 'rgba(255,255,255,0.03)',
              color: activeTab === tab.id ? tab.color : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '14px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'search' && <PaperSearchTab userId={userId} />}
        {activeTab === 'library' && <LibraryTab userId={userId} />}
        {activeTab === 'notes' && <NotesTab userId={userId} />}
        {activeTab === 'ai-chat' && (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🤖</div>
              <p style={{ color: '#fff', fontSize: '16px', marginBottom: '6px' }}>AI Research is available</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginBottom: '16px' }}>Use the "AI Research" tab in the sidebar for deep analysis, comparison, and brainstorming</p>
              <button onClick={onBack} style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Go to AI Research</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
