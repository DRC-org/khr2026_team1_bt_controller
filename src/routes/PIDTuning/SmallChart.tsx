import type { ChartData, Chart as ChartJS, ChartOptions } from 'chart.js';
import type { RefObject } from 'react';
import { Line } from 'react-chartjs-2';

interface SmallChartProps {
  title: string;
  chartRef: RefObject<ChartJS<'line'> | null>;
  data: ChartData<'line'>;
  options: ChartOptions<'line'>;
}

export function SmallChart({
  title,
  chartRef,
  data,
  options,
}: SmallChartProps) {
  return (
    <div>
      <h3 className="mb-1 font-medium text-xs">{title}</h3>
      <div className="h-32">
        <Line ref={chartRef} data={data} options={options} />
      </div>
    </div>
  );
}
