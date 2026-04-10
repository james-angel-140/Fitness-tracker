interface Props {
  score: number
  label: string
  size?: number
}

export function ScoreGauge({ score, label, size = 160 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = (size / 2) * 0.75
  const strokeWidth = size * 0.09

  // Opens at the bottom: arc from 220° → 500° (280° sweep), gap centred at 180° (6 o'clock)
  const startAngle = 220
  const endAngle = 500
  const totalAngle = endAngle - startAngle

  function polarToXY(deg: number, radius: number) {
    const rad = ((deg - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(from: number, to: number, radius: number) {
    const s = polarToXY(from, radius)
    const e = polarToXY(to, radius)
    const large = to - from > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const fillAngle = startAngle + (score / 100) * totalAngle
  const trackPath = arcPath(startAngle, endAngle, r)
  const fillPath = score > 0 ? arcPath(startAngle, fillAngle, r) : null

  const colour =
    score >= 85 ? '#22d3ee'
    : score >= 75 ? '#34d399'
    : score >= 65 ? '#a3e635'
    : score >= 50 ? '#facc15'
    : score >= 30 ? '#fb923c'
    : '#f87171'

  // Arc endpoints are at y = cy + r*sin(130°) = cy + 0.766r
  // Clip just below those endpoints to hide the bottom gap
  const svgHeight = cy + r * 0.77 + strokeWidth

  return (
    <svg
      width={size}
      height={svgHeight}
      viewBox={`0 0 ${size} ${svgHeight}`}
      overflow="hidden"
    >
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="hsl(216 34% 17%)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Fill */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${colour}55)` }}
        />
      )}
      {/* Score number */}
      <text
        x={cx}
        y={cy - r * 0.02}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="hsl(213 31% 91%)"
        fontSize={size * 0.26}
        fontWeight="700"
        fontFamily="inherit"
      >
        {score}
      </text>
      {/* Label */}
      <text
        x={cx}
        y={cy + r * 0.32}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={colour}
        fontSize={size * 0.085}
        fontWeight="600"
        fontFamily="inherit"
      >
        {label}
      </text>
    </svg>
  )
}
