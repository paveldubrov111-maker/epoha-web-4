import { ChartOptions } from 'chart.js';

export const commonChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#888', font: { size: 11 } }, grid: { display: false } },
    y: {
      ticks: { color: '#888', font: { size: 11 } },
      grid: { color: 'rgba(128,128,128,0.1)' }
    }
  }
};
