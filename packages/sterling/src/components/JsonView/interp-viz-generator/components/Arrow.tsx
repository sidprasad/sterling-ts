import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface ArrowStyle {
  strokeWidth?: number;
  strokeColor?: string;
}

export interface ArrowProps {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  offsetX?: number;
  offsetY?: number;
  arrowStyle?: ArrowStyle;
  shouldGlow: boolean;
  id: string;
}

export default function Arrow(props: ArrowProps) {
  console.log('making Arrow');
  const strokeWidth =
    props.arrowStyle && props.arrowStyle.strokeWidth
      ? props.arrowStyle.strokeWidth
      : 3;
  const strokeColor =
    props.arrowStyle && props.arrowStyle.strokeColor
      ? props.arrowStyle.strokeColor
      : 'black';

  const xOffset = props.offsetX || 0;
  const yOffset = props.offsetY || 0;

  const startX = props.startX + xOffset;
  const endX = props.endX + xOffset;
  const startY = props.startY + yOffset;
  const endY = props.endY + yOffset;
  console.log('startX', startX);
  console.log('endX', endX);
  console.log('startY', startY);
  console.log('endY', endY);

  const arrowSize = 10;

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // remove previous render

    svg
      .append('defs')
      .append('svg:marker')
      .attr('id', 'arrowhead')
      .attr('viewbox', '0 0 8 8')
      .attr('refX', 4)
      .attr('refY', 4)
      .attr('markerWidth', arrowSize)
      .attr('markerHeight', arrowSize)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M 0 2 L 4 4 L 0 6 Z')
      .style('stroke', strokeColor)
      .style('fill', strokeColor)
      .append('path');

    const top = Math.min(startY, endY);
    const left = Math.min(startX, endX);

    svg
      .append('line')
      .attr('x1', startX - left + strokeWidth / 2 + arrowSize)
      .attr('x2', endX - left + strokeWidth / 2 + arrowSize)
      .attr('y1', startY - top + strokeWidth / 2 + arrowSize)
      .attr('y2', endY - top + strokeWidth / 2 + arrowSize)
      .attr('stroke-width', strokeWidth)
      .attr('stroke', strokeColor)
      .attr('marker-end', 'url(#arrowhead)');
  }, [startX, endX, startY, endY, strokeWidth, strokeColor]);

  return (
    <svg
      ref={svgRef}
      // width={Math.max(props.endX, props.startX) + 20}
      // height={Math.max(props.startY, props.endY) + 5}
      width={Math.max(endX, startX) - Math.min(endX, startX) + 20}
      height={Math.max(endY, startY) - Math.min(endY, startY) + 20}
      style={{
        position: 'absolute',
        top: Math.min(startY, endY) - strokeWidth / 2 - arrowSize,
        left: Math.min(startX, endX) - strokeWidth / 2 - arrowSize,
        // zIndex: 30,
        boxShadow: props.shouldGlow
          ? 'inset 0 0 8px rgba(253, 224, 71, 0.8), inset 0 0 16px rgba(253, 224, 71, 0.6)'
          : 'none'
      }}
      className={`${props.shouldGlow ? 'bg-yellow-100 animate-pulse' : ''}`}
      id={props.id}
    />
  );
}
