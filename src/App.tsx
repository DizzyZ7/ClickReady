import { useMemo, useState } from 'react'
import { MixedSeriesChart, type MixedSeriesData } from './components/MixedSeriesChart'
import { demoSeries } from './data/demo'

const clone = (data: MixedSeriesData): MixedSeriesData => ({
  area: data.area.map(([time, value]) => [time, value]),
  spline: data.spline.map(([time, value]) => [time, value]),
  line: data.line.map(([time, value]) => [time, value]),
  bar: data.bar.map(([time, value]) => [time, value]),
})

function generateData(): MixedSeriesData {
  const next = clone(demoSeries)
  const spread = (seed: number) => Math.round((Math.sin(seed * 13.37) + Math.cos(seed * 7.11)) * 8)

  ;(Object.keys(next) as Array<keyof MixedSeriesData>).forEach((key, seriesIndex) => {
    next[key] = next[key].map(([time, value], index) => [time, Math.max(4, value + spread(index + seriesIndex * 10))])
  })

  return next
}

export function App() {
  const [data, setData] = useState<MixedSeriesData>(demoSeries)
  const [compact, setCompact] = useState(false)

  const subtitle = useMemo(
    () => compact ? 'Compact density · hover any point for details' : 'Four overlaid time series · hover any point for details',
    [compact],
  )

  return (
    <main className="app-shell">
      <section className="page-heading">
        <p className="eyebrow">DATA VISUALIZATION</p>
        <h1>Revenue performance</h1>
        <p>{subtitle}</p>
      </section>

      <section className="chart-card" aria-label="Mixed time series chart demo">
        <header className="chart-card__header">
          <div>
            <h2>Daily activity</h2>
            <p>26 Jun 2026 · UTC+3</p>
          </div>
          <div className="chart-card__actions">
            <button className="secondary-button" type="button" onClick={() => setCompact((current) => !current)}>
              {compact ? 'Comfortable view' : 'Compact view'}
            </button>
            <button className="primary-button" type="button" onClick={() => setData(generateData())}>
              Shuffle data
            </button>
          </div>
        </header>

        <MixedSeriesChart
          data={data}
          compact={compact}
          labels={{ area: 'Area', spline: 'Spline', line: 'Line', bar: 'Bar' }}
          valueFormatter={(value) => `$${value}k`}
        />
      </section>

      <section className="implementation-note">
        <p><strong>Developer note.</strong> The chart has no runtime charting dependency. It is a typed React + SVG component with responsive layout, shared hover state, tooltip, keyboard-accessible focus points, and time-scale normalization.</p>
      </section>
    </main>
  )
}
