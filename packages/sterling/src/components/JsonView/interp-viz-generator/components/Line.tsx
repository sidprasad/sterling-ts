import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface LineStyle {
  strokeWidth?: number;
  strokeColor?: string;
}

export interface LineProps {
  startX: number;
  endX: number;
  startY: number;
  endY: number;
  lineStyle?: LineStyle;
  shouldGlow: boolean;
  id: string;
}

export default function Line(props: LineProps) {
  const strokeWidth = props.lineStyle && props.lineStyle.strokeWidth ? props.lineStyle.strokeWidth : 3;
  const strokeColor = props.lineStyle && props.lineStyle.strokeColor ? props.lineStyle.strokeColor : 'black';

  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // remove previous render

    const top = Math.min(props.startY, props.endY);
    const left = Math.min(props.startX, props.endX);

    svg
      .append('line')
      .attr('x1', props.startX - left + strokeWidth / 2)
      .attr('x2', props.endX - left + strokeWidth / 2)
      .attr('y1', props.startY - top + strokeWidth / 2)
      .attr('y2', props.endY - top + strokeWidth / 2)
      .attr('stroke-width', strokeWidth)
      .attr('stroke', strokeColor);
  }, [props.startX, props.endX, props.startY, props.endY, strokeWidth]);

  return (
    <svg
      ref={svgRef}
      // width={Math.max(props.endX, props.startX) + 20}
      // height={Math.max(props.endY, props.startY) + 5}
      width={Math.max(props.endX, props.startX) - Math.min(props.endX, props.startX) + 20}
      height={Math.max(props.endY, props.startY) - Math.min(props.endY, props.startY) + 5}
      style={{
        position: 'absolute',
        top: Math.min(props.startY, props.endY),
        left: Math.min(props.startX, props.endX),
        boxShadow: props.shouldGlow
          ? "inset 0 0 8px rgba(253, 224, 71, 0.8), inset 0 0 16px rgba(253, 224, 71, 0.6)"
          : "none"
      }}
      className={`${props.shouldGlow ? "bg-yellow-100 animate-pulse" : ""}`}
      id={props.id}
    />
  );
}
