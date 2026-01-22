
import React, { useMemo, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { BudgetResponse, City } from '../types';
import { BanknotesIcon, InformationCircleIcon, TableCellsIcon } from '@heroicons/react/24/outline';
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
      
      // Group by the source node name (Revenue/Income items)
      data.data.links.forEach(link => {
        if (link.source.startsWith('rev_')) {
          const sourceNode = data.data.nodes.find(n => n.id === link.source);
          const name = sourceNode ? sourceNode.name : 'その他財源';
          categoryMap.set(name, (categoryMap.get(name) || 0) + link.value);
        }
      });

      const categories = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
      const total = categories.reduce((sum, c) => sum + c.value, 0);
      
      return { city, total, categories };
    }).sort((a, b) => b.total - a.total);
  }, [cache, cities]);

  // Extract unique category names to ensure consistent coloring
  const uniqueCategoryNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach(d => {
      d.categories.forEach(cat => names.add(cat.name));
    });
    return Array.from(names).sort(); // Sorted for stability
  }, [chartData]);

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

    const maxTotal = d3.max(chartData, d => d.total) || 100000;
    const y = d3.scaleLinear()
      .domain([0, maxTotal])
      .nice()
      .range([height - margin.bottom, margin.top]);

    // Use unique names for the color domain to fix colors to specific category names
    const color = d3.scaleOrdinal()
      .domain(uniqueCategoryNames)
      .range(d3.schemeTableau10);

    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(() => ""))
      .attr("stroke-opacity", 0.05);

    // Bars
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
          .attr("fill", "#f8fafc")
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

      // Sort categories to maintain visual consistency in stacking order
      const sortedCats = [...d.categories].sort((a, b) => uniqueCategoryNames.indexOf(a.name) - uniqueCategoryNames.indexOf(b.name));

      sortedCats.forEach((cat) => {
        const barHeight = (y(0) - y(cat.value));
        currentY -= barHeight;
        
        group.append("rect")
          .attr("y", currentY)
          .attr("width", x.bandwidth())
          .attr("height", barHeight)
          .attr("fill", color(cat.name) as string)
          .attr("rx", 2)
          .append("title")
          .text(`${d.city}\n財源: ${cat.name}\n金額: ${formatJapaneseCurrency(cat.value)}`);
      });

      if (d.total > 0) {
        group.append("text")
          .attr("x", x.bandwidth() / 2)
          .attr("y", currentY - 8)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("font-weight", "black")
          .attr("fill", "#1e293b")
          .text(d.total >= 100000 ? `${(d.total/100000).toFixed(1)}億` : `${Math.round(d.total/10)}万`);
      }
    });

    // X Axis
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("color", "#475569");

    // Y Axis
    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => {
        const val = d as number;
        if (val === 0) return "0";
        if (val >= 100000) return `${val / 100000} 億円`;
        return `${val / 10} 万円`;
      }))
      .call(g => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "10px")
      .style("font-weight", "500")
      .style("color", "#64748b");

  }, [chartData, uniqueCategoryNames]);

  const handleCsvDownload = () => {
    const headers = ["区", "財源科目", "金額(千円)"];
    const rows: any[] = [];
    
    chartData.forEach(cityData => {
      if (cityData.total > 0) {
        cityData.categories.forEach(cat => {
          rows.push([cityData.city, cat.name, cat.value]);
        });
      }
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `23区観光予算比較_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const loadedCount = chartData.filter(d => d.total > 0).length;

  return (
    <div ref={containerRef} className="w-full bg-white rounded-[2rem] p-8 shadow-xl border border-slate-200 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BanknotesIcon className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-slate-800">23区観光予算 財源内訳（収入科目）比較</h2>
          </div>
          <p className="text-slate-500 text-sm">
            取得済み {loadedCount} / 23 区の財源構成を比較しています。同じ色のバーは同じ財源科目（一般財源等）を表します。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loadedCount > 0 && (
            <button
              onClick={handleCsvDownload}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <TableCellsIcon className="w-4 h-4" />
              <span>比較CSVダウンロード</span>
            </button>
          )}
          {loadedCount < 23 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-100">
              <InformationCircleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">各区を選択して読み込むと反映されます。</span>
              <span className="sm:hidden">他区も読込可能</span>
            </div>
          )}
        </div>
      </div>

      {/* Simplified Legend */}
      {uniqueCategoryNames.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6 px-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
          {uniqueCategoryNames.slice(0, 15).map((name) => {
            const color = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueCategoryNames);
            return (
              <div key={name} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color(name) as string }}></div>
                <span className="text-[10px] font-bold text-slate-600">{name}</span>
              </div>
            );
          })}
          {uniqueCategoryNames.length > 15 && <span className="text-[10px] text-slate-400">...他</span>}
        </div>
      )}

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
          <div key={d.city} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RANK {i+1}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{d.city}</span>
            </div>
            <p className="text-xl font-black text-slate-800">{formatJapaneseCurrency(d.total)}</p>
            <div className="mt-2 flex flex-wrap gap-1">
               {d.categories.slice(0, 2).map((cat, idx) => (
                 <span key={idx} className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">
                   {cat.name}
                 </span>
               ))}
               {d.categories.length > 2 && <span className="text-[9px] text-slate-400">他</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BudgetComparisonChart;
