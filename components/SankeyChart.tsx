
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';
import { SankeyData, SankeyNode, SankeyLink } from '../types';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { formatJapaneseCurrency } from '../App';

interface Props {
  data: SankeyData;
  city: string;
  width?: number;
  height?: number;
}

const SankeyChart: React.FC<Props> = ({ data, city, width = 800, height = 700 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const nodesMap = new Map();
    data.nodes.forEach(node => nodesMap.set(node.id, []));
    
    const validLinks: SankeyLink[] = [];
    const adj = new Map<string, string[]>();
    data.nodes.forEach(n => adj.set(n.id, []));

    const wouldCreateCycle = (source: string, target: string): boolean => {
      const visited = new Set<string>();
      const stack = [target];
      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (curr === source) return true;
        if (!visited.has(curr)) {
          visited.add(curr);
          const neighbors = adj.get(curr) || [];
          stack.push(...neighbors);
        }
      }
      return false;
    };

    data.links.forEach(link => {
      if (link.source === link.target) return;
      if (!nodesMap.has(link.source) || !nodesMap.has(link.target)) return;
      
      if (!wouldCreateCycle(link.source, link.target)) {
        validLinks.push({ ...link });
        adj.get(link.source)?.push(link.target);
      }
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('xmlns', 'http://www.w3.org/2000/svg');

    const margin = { top: 20, right: 180, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeId(d => d.id)
      .nodeAlign(sankeyCenter)
      .nodeWidth(20)
      .nodePadding(12)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 5]]);

    try {
      const { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map(d => ({ ...d })),
        links: validLinks.map(d => ({ ...d }))
      });

      const color = d3.scaleOrdinal(d3.schemeTableau10);

      const link = g.append('g')
        .attr('fill', 'none')
        .attr('stroke-opacity', 0.4)
        .selectAll('g')
        .data(links)
        .join('g')
        .style('mix-blend-mode', 'multiply');

      link.append('path')
        .attr('d', sankeyLinkHorizontal())
        .attr('stroke', (d: any) => color(d.source.id))
        .attr('stroke-width', (d: any) => Math.max(1, d.width))
        .append('title')
        .text((d: any) => `${d.source.name} → ${d.target.name}\n${formatJapaneseCurrency(d.value)}`);

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g');

      node.append('rect')
        .attr('x', (d: any) => d.x0)
        .attr('y', (d: any) => d.y0)
        .attr('height', (d: any) => Math.max(2, d.y1 - d.y0))
        .attr('width', (d: any) => d.x1 - d.x0)
        .attr('fill', (d: any) => color(d.id))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .append('title')
        .text((d: any) => `${d.name}\n合計: ${formatJapaneseCurrency(d.value)}`);

      node.append('text')
        .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('y', (d: any) => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) => d.x0 < innerWidth / 2 ? 'start' : 'end')
        .attr('style', 'font-size: 10px; font-weight: bold; fill: #1e293b; pointer-events: none;')
        .text((d: any) => d.name)
        .filter((d: any) => (d.y1 - d.y0) > 15)
        .append('tspan')
        .attr('fill-opacity', 0.6)
        .attr('font-weight', 'normal')
        .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('dy', '1.2em')
        .text((d: any) => formatJapaneseCurrency(d.value));
        
    } catch (err) {
      console.error("Sankey layout failed:", err);
    }

  }, [data, width, height]);

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svgClone = svgRef.current.cloneNode(true) as SVGSVGElement;
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("width", width.toString());
    background.setAttribute("height", height.toString());
    background.setAttribute("fill", "#ffffff");
    svgClone.insertBefore(background, svgClone.firstChild);

    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `${city}_観光予算フロー_${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  return (
    <div className="w-full relative bg-white rounded-2xl p-6 shadow-sm border border-slate-200 group">
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>保存 (SVG)</span>
        </button>
      </div>
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[1000px]">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="mx-auto block"
          />
        </div>
      </div>
    </div>
  );
};

export default SankeyChart;
