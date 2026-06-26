import type { MixedSeriesData } from '../components/MixedSeriesChart'

const hour = (value: number) => new Date(2026, 5, 26, value).toISOString()

export const demoSeries: MixedSeriesData = {
  area: [
    [hour(0), 32], [hour(2), 42], [hour(4), 35], [hour(6), 52], [hour(8), 47],
    [hour(10), 59], [hour(12), 54], [hour(14), 66], [hour(16), 58], [hour(18), 72], [hour(20), 69],
  ],
  spline: [
    [hour(0), 61], [hour(2), 58], [hour(4), 70], [hour(6), 64], [hour(8), 74],
    [hour(10), 66], [hour(12), 78], [hour(14), 72], [hour(16), 82], [hour(18), 75], [hour(20), 85],
  ],
  line: [
    [hour(0), 21], [hour(2), 24], [hour(4), 20], [hour(6), 31], [hour(8), 29],
    [hour(10), 39], [hour(12), 34], [hour(14), 43], [hour(16), 39], [hour(18), 51], [hour(20), 48],
  ],
  bar: [
    [hour(0), 18], [hour(2), 27], [hour(4), 23], [hour(6), 34], [hour(8), 29],
    [hour(10), 44], [hour(12), 36], [hour(14), 49], [hour(16), 42], [hour(18), 56], [hour(20), 50],
  ],
}
