import { useId, useMemo, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'

export type Timestamp = string | number | Date
export type SeriesPoint = readonly [Timestamp, number]

export type MixedSeriesData = {
  area: readonly SeriesPoint[]
  spline: readonly SeriesPoint[]
  line: readonly SeriesPoint[]
  bar: readonly SeriesPoint[]
}

type SeriesKey = keyof MixedSeriesData
type ChartLabels = Partial<Record<SeriesKey, string>>

type MixedSeriesChartProps = {
  data: MixedSeriesData
  labels?: ChartLabels
  compact?: boolean
  valueFormatter?: (value: number) => string
  timeFormatter?: (timestamp: number) => string
  emptyState?: ReactNode
}

type NormalizedPoint = { timestamp: number; value: number }
type Metric = { key: SeriesKey; label: string; value: number; color: string }
type HoverState = { index: number; x: number } | null

const SERIES: Array<{ key: SeriesKey; label: string; color: string }> = [
  { key: 'area', label: 'Area', color: '#7380f8' },
  { key: 'spline', label: 'Spline', color: '#7e57d9' },
  { key: 'line', label: 'Line', color: '#13a6a7' },
  { key: 'bar', label: 'Bar', color: '#f8a955' },
]

const VIEWBOX_WIDTH = 1040
const VIEWBOX_HEIGHT = 430
const PADDING = { top: 24, right: 28, bottom: 58, left: 58 }

function toTimestamp(input: Timestamp): number {
  if (input instanceof Date) return input.getTime()
  if (typeof input === 'number') return input
  const value = Date.parse(input)
  if (Number.isNaN(value)) throw new Error(`Invalid timestamp: ${input}`)
  return value
}

function normalizeSeries(series: readonly SeriesPoint[]): NormalizedPoint[] {
  return series
    .map(([time, value]) => ({ timestamp: toTimestamp(time), value }))
    .filter((point) => Number.isFinite(point.timestamp) && Number.isFinite(point.value))
    .sort((a, b) => a.timestamp - b.timestamp)
}

function makeScale(domain: readonly [number, number], range: readonly [number, number]) {
  const [domainMin, domainMax] = domain
  const [rangeMin, rangeMax] = range
  const safeSpan = domainMax - domainMin || 1
  const rangeSpan = rangeMax - rangeMin
  return (value: number) => rangeMin + ((value - domainMin) / safeSpan) * rangeSpan
}

function linearTicks(min: number, max: number, count: number): number[] {
  const span = max - min || 1
  const roughStep = span / Math.max(count - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const normalized = roughStep / magnitude
  const step = (normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1) * magnitude
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) ticks.push(value)
  return ticks
}

function chartLine(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ')
}

function smoothLine(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return chartLine(points)
  const first = points[0]
  let path = `M ${first.x.toFixed(2)} ${first.y.toFixed(2)}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const previous = points[index - 1] ?? current
    const after = points[index + 2] ?? next
    const control1X = current.x + (next.x - previous.x) / 6
    const control1Y = current.y + (next.y - previous.y) / 6
    const control2X = next.x - (after.x - current.x) / 6
    const control2Y = next.y - (after.y - current.y) / 6
    path += ` C ${control1X.toFixed(2)} ${control1Y.toFixed(2)}, ${control2X.toFixed(2)} ${control2Y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`
  }

  return path
}

function nearestIndex(timestamps: number[], target: number): number {
  if (timestamps.length === 1) return 0
  let closest = 0
  let minDistance = Number.POSITIVE_INFINITY
  timestamps.forEach((timestamp, index) => {
    const distance = Math.abs(timestamp - target)
    if (distance < minDistance) {
      minDistance = distance
      closest = index
    }
  })
  return closest
}

function defaultTimeFormatter(timestamp: number): string {
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

function valueAtTimestamp(series: NormalizedPoint[], timestamp: number): number | null {
  if (!series.length) return null
  const exact = series.find((point) => point.timestamp === timestamp)
  if (exact) return exact.value
  return series[nearestIndex(series.map((point) => point.timestamp), timestamp)].value
}

export function MixedSeriesChart({
  data,
  labels = {},
  compact = false,
  valueFormatter = (value) => String(value),
  timeFormatter = defaultTimeFormatter,
  emptyState = 'No time-series data to display.',
}: MixedSeriesChartProps) {
  const gradientId = useId().replace(/:/g, '')
  const containerRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<HoverState>(null)

  const normalized = useMemo(() => ({
    area: normalizeSeries(data.area),
    spline: normalizeSeries(data.spline),
    line: normalizeSeries(data.line),
    bar: normalizeSeries(data.bar),
  }), [data])

  const timestamps = useMemo(
    () => Array.from(new Set(SERIES.flatMap(({ key }) => normalized[key].map((point) => point.timestamp)))).sort((a, b) => a - b),
    [normalized],
  )
  const allValues = useMemo(() => SERIES.flatMap(({ key }) => normalized[key].map((point) => point.value)), [normalized])

  if (!timestamps.length || !allValues.length) {
    return <div className="mixed-chart mixed-chart--empty" role="status">{emptyState}</div>
  }

  const plot = {
    left: PADDING.left,
    right: VIEWBOX_WIDTH - PADDING.right,
    top: PADDING.top,
    bottom: VIEWBOX_HEIGHT - PADDING.bottom,
  }

  const rawMin = Math.min(...allValues)
  const rawMax = Math.max(...allValues)
  const yPadding = Math.max((rawMax - rawMin) * 0.15, 5)
  const yDomain: [number, number] = [Math.max(0, rawMin - yPadding), rawMax + yPadding]
  const xDomain: [number, number] = [timestamps[0], timestamps[timestamps.length - 1] || timestamps[0] + 1]
  const xScale = makeScale(xDomain, [plot.left, plot.right])
  const yScale = makeScale(yDomain, [plot.bottom, plot.top])
  const yTicks = linearTicks(yDomain[0], yDomain[1], compact ? 4 : 5)
  const xTickCount = compact ? 5 : 7
  const xTickIndexes = Array.from(
    { length: Math.min(xTickCount, timestamps.length) },
    (_, index) => Math.round(index * (timestamps.length - 1) / Math.max(Math.min(xTickCount, timestamps.length) - 1, 1)),
  )
  const xTicks = Array.from(new Set(xTickIndexes)).map((index) => timestamps[index])
  const xStep = timestamps.length > 1 ? Math.max(xScale(timestamps[1]) - xScale(timestamps[0]), 18) : 48
  const barWidth = Math.min(xStep * 0.5, 34)

  const renderPoints = (key: SeriesKey) => normalized[key].map((point) => ({ x: xScale(point.timestamp), y: yScale(point.value), ...point }))
  const areaPoints = renderPoints('area')
  const splinePoints = renderPoints('spline')
  const linePoints = renderPoints('line')
  const barPoints = renderPoints('bar')
  const areaPath = chartLine(areaPoints)
  const areaFillPath = `${areaPath} L ${areaPoints.at(-1)?.x ?? plot.left} ${plot.bottom} L ${areaPoints[0]?.x ?? plot.left} ${plot.bottom} Z`
  const splinePath = smoothLine(splinePoints)
  const linePath = chartLine(linePoints)

  const hoverTimestamp = hover ? timestamps[hover.index] : null
  const metrics: Metric[] = hoverTimestamp === null ? [] : SERIES.map(({ key, label, color }) => {
    const value = valueAtTimestamp(normalized[key], hoverTimestamp)
    return { key, label: labels[key] ?? label, value: value ?? 0, color }
  })

  const setHoverFromEvent = (event: MouseEvent<SVGSVGElement>) => {
    const svg = containerRef.current
    if (!svg) return
    const bounds = svg.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / bounds.width) * VIEWBOX_WIDTH
    const clampedX = Math.max(plot.left, Math.min(x, plot.right))
    const timestamp = xDomain[0] + ((clampedX - plot.left) / (plot.right - plot.left)) * (xDomain[1] - xDomain[0])
    const index = nearestIndex(timestamps, timestamp)
    setHover({ index, x: xScale(timestamps[index]) })
  }

  return (
    <div className={`mixed-chart ${compact ? 'mixed-chart--compact' : ''}`}>
      <div className="mixed-chart__legend" aria-label="Series legend">
        {SERIES.map(({ key, label, color }) => (
          <span className="mixed-chart__legend-item" key={key}>
            <i style={{ backgroundColor: color }} />
            {labels[key] ?? label}
          </span>
        ))}
      </div>

      <div className="mixed-chart__canvas">
        <svg
          ref={containerRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-label="Interactive chart with area, spline, line, and bar time series"
          onMouseMove={setHoverFromEvent}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7380f8" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#7380f8" stopOpacity="0.025" />
            </linearGradient>
            <clipPath id={`${gradientId}-clip`}>
              <rect x={plot.left} y={plot.top} width={plot.right - plot.left} height={plot.bottom - plot.top} rx="12" />
            </clipPath>
          </defs>

          <g className="mixed-chart__grid">
            {yTicks.map((tick) => {
              const y = yScale(tick)
              return (
                <g key={tick}>
                  <line x1={plot.left} x2={plot.right} y1={y} y2={y} />
                  <text x={plot.left - 12} y={y + 4} textAnchor="end">{valueFormatter(tick)}</text>
                </g>
              )
            })}
          </g>

          <g className="mixed-chart__x-axis">
            {xTicks.map((tick) => (
              <g key={tick} transform={`translate(${xScale(tick)}, 0)`}>
                <line y1={plot.bottom} y2={plot.bottom + 5} />
                <text y={plot.bottom + 26} textAnchor="middle">{timeFormatter(tick)}</text>
              </g>
            ))}
          </g>

          <g clipPath={`url(#${gradientId}-clip)`}>
            <path className="mixed-chart__area-fill" d={areaFillPath} fill={`url(#${gradientId})`} />
            <path className="mixed-chart__area-line" d={areaPath} />

            <g className="mixed-chart__bars">
              {barPoints.map((point) => (
                <rect
                  key={point.timestamp}
                  x={point.x - barWidth / 2}
                  y={point.y}
                  width={barWidth}
                  height={plot.bottom - point.y}
                  rx={Math.min(barWidth / 2, 6)}
                />
              ))}
            </g>

            <path className="mixed-chart__spline-line" d={splinePath} />
            <path className="mixed-chart__line" d={linePath} />

            {hover && (
              <g className="mixed-chart__hover" pointerEvents="none">
                <line x1={hover.x} x2={hover.x} y1={plot.top} y2={plot.bottom} />
                {SERIES.map(({ key, color }) => {
                  const value = valueAtTimestamp(normalized[key], timestamps[hover.index])
                  if (value === null) return null
                  return <circle key={key} cx={hover.x} cy={yScale(value)} r="4.5" fill={color} />
                })}
              </g>
            )}
          </g>

          {timestamps.map((timestamp, index) => (
            <rect
              key={timestamp}
              className="mixed-chart__focus-target"
              x={Math.max(plot.left, xScale(timestamp) - xStep / 2)}
              y={plot.top}
              width={Math.min(xStep, plot.right - Math.max(plot.left, xScale(timestamp) - xStep / 2))}
              height={plot.bottom - plot.top}
              tabIndex={0}
              aria-label={`${timeFormatter(timestamp)} data point`}
              onFocus={() => setHover({ index, x: xScale(timestamp) })}
              onBlur={() => setHover(null)}
            />
          ))}
        </svg>

        {hover && hoverTimestamp !== null && (
          <aside className="mixed-chart__tooltip" style={{ left: `${(hover.x / VIEWBOX_WIDTH) * 100}%` }} role="status">
            <p>{timeFormatter(hoverTimestamp)}</p>
            <dl>
              {metrics.map((metric) => (
                <div key={metric.key}>
                  <dt><i style={{ backgroundColor: metric.color }} />{metric.label}</dt>
                  <dd>{valueFormatter(metric.value)}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </div>
  )
}
