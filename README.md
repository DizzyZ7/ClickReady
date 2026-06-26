# ClickReady — mixed time-series chart

Интерактивное тестовое на React + TypeScript: один SVG-график принимает четыре временных ряда и рендерит их разными представлениями:

- `area`: линия с полупрозрачной градиентной заливкой;
- `spline`: сглаженная линия;
- `line`: линейный пунктирный ряд;
- `bar`: скругленные столбцы.

Компонент не использует chart libraries. Он адаптивный, сортирует входные точки, строит общую временную и Y-шкалу, показывает единый hover cursor / tooltip и поддерживает фокус с клавиатуры.

## Запуск

```bash
npm install
npm run dev
```

Production-проверка:

```bash
npm run build
npm run lint
```

## Инициализация

```tsx
import { MixedSeriesChart, type MixedSeriesData } from './components/MixedSeriesChart'

const data: MixedSeriesData = {
  area: [
    ['2026-06-26T00:00:00+03:00', 32],
    ['2026-06-26T02:00:00+03:00', 42],
  ],
  spline: [
    ['2026-06-26T00:00:00+03:00', 61],
    ['2026-06-26T02:00:00+03:00', 58],
  ],
  line: [
    ['2026-06-26T00:00:00+03:00', 21],
    ['2026-06-26T02:00:00+03:00', 24],
  ],
  bar: [
    ['2026-06-26T00:00:00+03:00', 18],
    ['2026-06-26T02:00:00+03:00', 27],
  ],
}

export function Dashboard() {
  return (
    <MixedSeriesChart
      data={data}
      labels={{
        area: 'Revenue',
        spline: 'Forecast',
        line: 'Benchmark',
        bar: 'Orders',
      }}
      valueFormatter={(value) => `$${value}k`}
    />
  )
}
```

Точка ряда имеет форму `[timestamp, value]`. `timestamp` допускает ISO-строку, `Date` или Unix timestamp в миллисекундах.

## Props

| Prop | Description |
| --- | --- |
| `data` | Обязательные ряды `area`, `spline`, `line`, `bar`. |
| `labels` | Кастомные подписи в легенде и tooltip. |
| `compact` | Плотный режим с меньшим количеством делений шкалы. |
| `valueFormatter` | Форматирование Y-значений и tooltip. |
| `timeFormatter` | Форматирование X-меток. |
| `emptyState` | Контент при отсутствии валидных точек. |

## Структура

```text
src/
  components/MixedSeriesChart.tsx  # переиспользуемый SVG-компонент
  data/demo.ts                     # демо-данные
  App.tsx                          # демонстрационный экран
  styles.css                       # интерфейс и стили графика
```
