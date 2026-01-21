
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';
import { SankeyData, SankeyNode, SankeyLink } from '../types';

interface Props {
  data: SankeyData;
  width?: number;
  height?: number;
}

const SankeyChart: React.FC<Props> = ({ data, width = 800, height = 700 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    // --- Pre-processing to prevent Circular Link error ---
    const nodesMap = new Map();
    data.nodes.forEach(node => nodesMap.set(node.id, []));
    
    // Filter out self-loops and detect cycles using a simple DFS
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
      if (link.source === link.target) return; // Ignore self-loops
      if (!nodesMap.has(link.source) || !nodesMap.has(link.target)) return; // Ignore links to non-existent nodes
      
      if (!wouldCreateCycle(link.source, link.target)) {
        validLinks.push({ ...link });
        adj.get(link.source)?.push(link.target);
      } else {
        console.warn(`Circular link detected and removed: ${link.source} -> ${link.target}`);
      }
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

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
      // Run Sankey layout
      const { nodes, links } = sankeyGenerator({
        nodes: data.nodes.map(d => ({ ...d })),
        links: validLinks.map(d => ({ ...d }))
      });

      const color = d3.scaleOrdinal(d3.schemeTableau10);

      // Links
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
        .text((d: any) => `${d.source.name} → ${d.target.name}\n${d.value.toLocaleString()} 千円`);

      // Nodes
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
        .text((d: any) => `${d.name}\n合計: ${d.value.toLocaleString()} 千円`);

      // Labels
      node.append('text')
        .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('y', (d: any) => (d.y1 + d.y0) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d: any) => d.x0 < innerWidth / 2 ? 'start' : 'end')
        .attr('class', 'text-[10px] font-bold fill-slate-800 pointer-events-none')
        .text((d: any) => d.name)
        .filter((d: any) => (d.y1 - d.y0) > 15)
        .append('tspan')
        .attr('fill-opacity', 0.6)
        .attr('font-weight', 'normal')
        .attr('x', (d: any) => d.x0 < innerWidth / 2 ? d.x1 + 8 : d.x0 - 8)
        .attr('dy', '1.2em')
        .text((d: any) => `${d.value.toLocaleString()}`);
        
    } catch (err) {
      console.error("Sankey layout failed:", err);
      g.append('text')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('class', 'fill-red-500 font-bold')
        .text('データの構造に問題があり、図を表示できませんでした。');
    }

  }, [data, width, height]);

  return (
    <div className="w-full overflow-x-auto bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
      <div className="min-w-[800px]">
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block"
        />
      </div>
    </div>
  );
};

export default SankeyChart;
