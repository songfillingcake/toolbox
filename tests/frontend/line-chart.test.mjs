import { describe, expect, it } from 'vitest';
import { loadBrowserScript } from './load-browser-script.mjs';

const LineChart = loadBrowserScript(
  '../src/main/resources/static/js/line-chart.js',
  '__LineChart'
);

describe('LineChart', () => {
  it('parses CSV with header and multiple series', () => {
    const csv = 'date,value,series\n2026-01-01,10,A\n2026-01-02,15,A\n2026-01-01,8,B';
    const { error, series } = LineChart.parseCsv(csv);
    expect(error).toBeNull();
    expect(series).toHaveLength(2);
    expect(series.find(s => s.name === 'A').points).toHaveLength(2);
    expect(series.find(s => s.name === 'B').points[0].y).toBe(8);
  });

  it('parses JSON array', () => {
    const json = JSON.stringify([
      { x: '1', y: 10, series: 'S1' },
      { x: '2', y: 20, series: 'S1' }
    ]);
    const { error, series } = LineChart.parseJson(json);
    expect(error).toBeNull();
    expect(series).toHaveLength(1);
    expect(series[0].points).toHaveLength(2);
  });

  it('auto-detects JSON format', () => {
    const text = '[{"x":"a","y":1}]';
    const { error, series } = LineChart.parseInput(text, 'auto');
    expect(error).toBeNull();
    expect(series[0].points[0].y).toBe(1);
  });

  it('rejects empty input', () => {
    const { error } = LineChart.parseInput('', 'auto');
    expect(error).toContain('请输入');
  });

  it('renders SVG output', () => {
    const series = [{ name: 'A', points: [{ x: '1', y: 10 }, { x: '2', y: 20 }] }];
    const svg = LineChart.renderSvg(series);
    expect(svg).toContain('<svg');
    expect(svg).toContain('polyline');
  });
});
