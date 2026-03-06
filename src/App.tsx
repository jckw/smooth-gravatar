import { useCallback, useEffect, useRef, useState } from 'react'

type Palette = {
  bg: string
  fg: string
}

type Pattern = {
  grid: number[][]
  palette: Palette
  gridSize: number
}

type HistoryEntry = {
  seed: string
  palette: Palette
}

const PALETTES: Palette[] = [
  { bg: '#1a1a2e', fg: '#e94560' },
  { bg: '#f0e6d3', fg: '#c44536' },
  { bg: '#0d1b2a', fg: '#e0aaff' },
  { bg: '#fefae0', fg: '#606c38' },
  { bg: '#2b2d42', fg: '#ef233c' },
  { bg: '#edf2f4', fg: '#2b2d42' },
  { bg: '#0b132b', fg: '#3a86ff' },
  { bg: '#f8f9fa', fg: '#6c63ff' },
  { bg: '#10002b', fg: '#c77dff' },
  { bg: '#faf3dd', fg: '#5e503f' },
  { bg: '#000814', fg: '#ffd60a' },
  { bg: '#fff1e6', fg: '#f25c54' },
  { bg: '#1b1b1e', fg: '#44cf6c' },
  { bg: '#f7f7f7', fg: '#ff6b6b' },
  { bg: '#0a0a0a', fg: '#00f5d4' },
  { bg: '#e8e4e1', fg: '#b56576' },
  { bg: '#22223b', fg: '#f2e9e4' },
  { bg: '#fdf0d5', fg: '#003049' },
  { bg: '#d6ccc2', fg: '#3d405b' },
  { bg: '#161a1d', fg: '#ba181b' },
  { bg: '#0f0e17', fg: '#ff8906' },
  { bg: '#fffffe', fg: '#e53170' },
  { bg: '#232946', fg: '#eebbc3' },
  { bg: '#fec89a', fg: '#1d3557' },
  { bg: '#004e64', fg: '#f5ee9e' },
]

function generatePattern(seed: string): Pattern {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0

  const rand = () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b
    h = (h ^ (h >>> 16)) * 0x45d9f3b
    h = h ^ (h >>> 16)
    return (h >>> 0) / 4294967295
  }

  const palette = PALETTES[Math.floor(rand() * PALETTES.length)]
  const gridSize = 5
  const half = Math.ceil(gridSize / 2)
  const cells: number[][] = []

  for (let row = 0; row < gridSize; row++) {
    const r: number[] = []
    for (let col = 0; col < half; col++) r.push(rand() > 0.45 ? 1 : 0)
    cells.push(r)
  }

  const full = cells.map((row) => {
    const mirrored = [...row]
    for (let i = half - 2; i >= 0; i--) mirrored.push(row[i])
    return mirrored
  })

  return { grid: full, palette, gridSize }
}

function drawToCanvas(canvas: HTMLCanvasElement, pattern: Pattern, size: number): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = size
  canvas.height = size

  const { grid, palette, gridSize } = pattern
  const pad = Math.round(size * 0.12)
  const inner = size - pad * 2
  const cell = inner / gridSize
  const cornerRadius = cell * 0.42

  const on = (r: number, c: number) =>
    r >= 0 && r < gridSize && c >= 0 && c < gridSize ? grid[r][c] : 0

  const addRoundedRectPath = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: { tl: number; tr: number; br: number; bl: number },
  ) => {
    const tl = Math.max(0, r.tl)
    const tr = Math.max(0, r.tr)
    const br = Math.max(0, r.br)
    const bl = Math.max(0, r.bl)

    ctx.moveTo(x + tl, y)
    ctx.lineTo(x + w - tr, y)
    if (tr > 0) ctx.arcTo(x + w, y, x + w, y + tr, tr)
    else ctx.lineTo(x + w, y)

    ctx.lineTo(x + w, y + h - br)
    if (br > 0) ctx.arcTo(x + w, y + h, x + w - br, y + h, br)
    else ctx.lineTo(x + w, y + h)

    ctx.lineTo(x + bl, y + h)
    if (bl > 0) ctx.arcTo(x, y + h, x, y + h - bl, bl)
    else ctx.lineTo(x, y + h)

    ctx.lineTo(x, y + tl)
    if (tl > 0) ctx.arcTo(x, y, x + tl, y, tl)
    else ctx.lineTo(x, y)

    ctx.closePath()
  }

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, size, size)

  ctx.fillStyle = palette.fg
  ctx.beginPath()

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      if (!on(row, col)) continue

      const top = on(row - 1, col)
      const right = on(row, col + 1)
      const bottom = on(row + 1, col)
      const left = on(row, col - 1)

      const x = pad + col * cell
      const y = pad + row * cell

      addRoundedRectPath(x, y, cell, cell, {
        tl: !top && !left ? cornerRadius : 0,
        tr: !top && !right ? cornerRadius : 0,
        br: !bottom && !right ? cornerRadius : 0,
        bl: !bottom && !left ? cornerRadius : 0,
      })
    }
  }

  ctx.fill()
}

export default function App() {
  const [input, setInput] = useState('')
  const [seed, setSeed] = useState('')
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const generate = useCallback((s: string) => {
    const useSeed = s || `${Date.now()}-${Math.random()}`
    setSeed(useSeed)

    const p = generatePattern(useSeed)
    setPattern(p)

    setHistory((prev) => [{ seed: useSeed, palette: p.palette }, ...prev].slice(0, 12))
  }, [])

  useEffect(() => {
    generate('')
  }, [generate])

  useEffect(() => {
    if (!pattern || !canvasRef.current) return
    drawToCanvas(canvasRef.current, pattern, 512)
  }, [pattern])

  const download = () => {
    if (!canvasRef.current) return
    const a = document.createElement('a')
    a.download = `smooth-gravatar-${seed.slice(0, 12)}.png`
    a.href = canvasRef.current.toDataURL('image/png')
    a.click()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0e0e10',
        color: '#e4e4e7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px', margin: 0, color: '#fff' }}>
        Smooth Gravatar
      </h1>

      <p style={{ fontSize: 14, color: '#71717a', marginTop: 6, marginBottom: 32 }}>
        GitHub-style identicons · 512×512 · curated colorways
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, width: '100%', maxWidth: 480 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generate(input || '')}
          placeholder="Enter a name, email, anything..."
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #27272a',
            background: '#18181b',
            color: '#e4e4e7',
            fontSize: 14,
            outline: 'none',
          }}
        />

        <button
          onClick={() => generate(input || '')}
          style={{
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#fff',
            color: '#0e0e10',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Generate
        </button>
      </div>

      {pattern && (
        <div
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: `0 0 80px ${pattern.palette.fg}22, 0 4px 30px #0008`,
            marginBottom: 16,
            lineHeight: 0,
          }}
        >
          <canvas ref={canvasRef} style={{ width: 280, height: 280, display: 'block' }} />
        </div>
      )}

      {pattern && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, marginBottom: 32 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: pattern.palette.bg,
                border: '1px solid #333',
              }}
            />
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                background: pattern.palette.fg,
                border: '1px solid #333',
              }}
            />
            <span style={{ fontSize: 12, color: '#71717a', marginLeft: 4 }}>
              {pattern.palette.bg} / {pattern.palette.fg}
            </span>
          </div>

          <button
            onClick={download}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid #27272a',
              background: 'transparent',
              color: '#a1a1aa',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Download PNG
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ width: '100%', maxWidth: 480 }}>
          <p
            style={{
              fontSize: 12,
              color: '#52525b',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            History
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {history.slice(1).map((h, i) => (
              <button
                key={i}
                onClick={() => generate(h.seed)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  border: '1px solid #27272a',
                  cursor: 'pointer',
                  padding: 0,
                  background: `linear-gradient(135deg, ${h.palette.bg} 50%, ${h.palette.fg} 50%)`,
                }}
                title={h.seed.slice(0, 20)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
