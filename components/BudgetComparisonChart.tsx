
import React, { useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BudgetResponse, City } from '../types';
import { BanknotesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatJapaneseCurrency } from '../App';

interface Props {
  cache: Partial<Record<City, BudgetResponse & { timestamp: number }>>;
  cities: City[];
}

const BudgetComparisonChart: React.FC<Props> = ({ cache, cities }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const chartData = useMemo(() => {
    return cities.map(city => {
      const data = cache[city];
      if (!data) return { city, total: 0, categories: [] as {name: string, value: number}[] };
      
      const categoryMap = new Map<string, number>();
      data.data.links.forEach(link => {
        if (link.source.startsWith('rev_')) {
          const targetNode = data.data.nodes.find(n => n.id === link.target);
          const name = targetNode ? targetNode.name : 'その他';
          categoryMap.set(name, (categoryMap.get(name) || 0) + link.value);
        }
      });

      const categories = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
      const total = categories.reduce((sum, c) => sum + c.value, 0);
      
      return { city, total, categories };
    }).sort((a, b) => b.total - a.total);
  }, [cache, cities]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 500;
    const margin = { top: 40, right: 30, bottom: 80, left: 80 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const x = d3.scaleBand()
      .domain(chartData.map(d => d.city))
      .range([margin.left, width - margin.right])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(chartData, d => d.total) || 100000])
      .nice()
      .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(() => ""))
      .attr("stroke-opacity", 0.1);

    const barGroups = svg.append("g")
      .selectAll("g")
      .data(chartData)
      .join("g")
      .attr("transform", d => `translate(${x(d.city)},0)`);

    barGroups.each(function(d) {
      let currentY = height - margin.bottom;
      const group = d3.select(this);

      if (d.total === 0) {
        group.append("rect")
          .attr("y", y(0) - 20)
          .attr("width", x.bandwidth())
          .attr("height", 20)
          .attr("fill", "#f1f5f9")
          .attr("stroke", "#e2e8f0")
          .attr("stroke-dasharray", "4");
        
        group.append("text")
          .attr("x", x.bandwidth() / 2)
          .attr("y", y(0) - 25)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px")
          .attr("fill", "#94a3b8")
          .text("未取得");
      }

      d.categories.forEach((cat) => {
        const barHeight = (y(0) - y(cat.value));
        currentY -= barHeight;
        
        group.append("rect")
          .attr("y", currentY)
          .attr("width", x.bandwidth())
          .attr("height", barHeight)
          .attr("fill", color(cat.name))
          .attr("rx", 2)
          .append("title")
          .text(`${d.city} - ${cat.name}: ${formatJapaneseCurrency(cat.value)}`);
      });

      if (d.total > 0) {
        group.append("text")
          .attr("x", x.bandwidth() / 2)
          .attr("y", currentY - 8)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("font-weight", "bold")
          .attr("fill", "#475569")
          .text(d.total >= 100000 ? `${(d.total/100000).toFixed(1)}億` : `${Math.round(d.total/10)}万`);
      }
    });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "11px")
      .style("font-weight", "600");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        const val = d as number;
        if (val === 0) return "0";
        if (val >= 100000) return `${val / 100000} 億円`;
        return `${val / 10} 万円`;
      }))
      .call(g => g.select(".domain").remove());

  }, [chartData]);

  const loadedCount = chartData.filter(d => d.total > 0).length;

  return (
    <div ref={containerRef} className="w-full bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800">23区観光予算 比較</h2>
          </div>
          <p className="text-slate-500 text-sm">
            取得済み {loadedCount} / 23 区の予算額を比較しています。
          </p>
        </div>
        {loadedCount < 23 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
            <InformationCircleIcon className="w-4 h-4" />
            <span>各区を個別に選択するとデータが反映されます。</span>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto pb-4">
        <svg 
          ref={svgRef} 
          width="100%" 
          height="500" 
          viewBox="0 0 1000 500" 
          className="min-w-[800px]"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {chartData.filter(d => d.total > 0).slice(0, 4).map((d, i) => (
          <div key={d.city} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RANK {i+1}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{d.city}</span>
            </div>
            <p className="text-lg font-black text-slate-800">{formatJapaneseCurrency(d.total)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetComparisonChart;
