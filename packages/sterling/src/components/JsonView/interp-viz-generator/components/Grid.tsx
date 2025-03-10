import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { DatumParsed } from '@/sterling-connection';
import { applyTextRename, isArray } from '../ir-expander/util';
import { GridComponent } from '../ir-expander/components/grid';
import { Tuple } from '../../forge-evaluator/forgeExprEvaluator';
import { ArrowComponent } from '../ir-expander/components/arrow';


export type GridIndex = { row: number; col: number; type: 'grid-index' };
export type CellInput = GridIndex | any;

export type GetNextFromTrace = {
  type: 'get-next-from-trace';
  relation: Tuple[];
};
export type GetValueFromGridCell = {
  type: 'get-value-from-grid-cell';
};
export type DataRelation = GetNextFromTrace | GetValueFromGridCell;

interface GridStyle {
  dashedStroke?: boolean;
  strokeWidth?: number;
  strokeColor?: string;
}

export interface GridProps {
  datum: DatumParsed<any>;
  textRenames: [string, string][];
  rows: number;
  columns: number;
  height: number;
  width: number;
  absolutePosition: boolean;
  topY?: number; // required if absolutePosition is true
  leftX?: number; // required if absolutePosition is true
  gridStyle?: GridStyle;

  cellText?: string | string[] | any;
  cellVisualization?: any;
  cellDataRelation?: DataRelation;
  parentRef?: React.MutableRefObject<SVGSVGElement | null>;
  cellGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  offsetX?: number;
  offsetY?: number;
  shouldGlow: boolean;
  id: string;
}

export default function Grid(props: GridProps) {
  console.log('inside Grid');

  const { datum, textRenames, rows, columns, height, width, absolutePosition, topY, leftX, gridStyle, cellText, cellVisualization, cellDataRelation, parentRef, cellGroup, offsetX, offsetY, shouldGlow } = props;
  // default values for some props
  const dashedStroke = gridStyle && gridStyle.dashedStroke ? gridStyle.dashedStroke : false;
  const strokeWidth = gridStyle && gridStyle.strokeWidth ? gridStyle.strokeWidth : 2;
  const strokeColor = gridStyle && gridStyle.strokeColor ? gridStyle.strokeColor : 'black';
  const xOffset = offsetX || 0;
  const yOffset = offsetY || 0;

  const svgRef = parentRef || useRef<SVGSVGElement | null>(null);
  // [NOTE] we're currently assuming that the cellDataRelation can't be a conditional,
  // but that isn't necessarily what we want. update this to support the cellDataRelation
  // potentially being a conditional value as well. 

  if (cellVisualization !== undefined && cellDataRelation === undefined) {
    throw new Error('cellVisualization requires cellDataRelation to be defined');
  }
  // if absolutePosition is true, topY and leftX must be provided
  if (absolutePosition && (topY === undefined || leftX === undefined)) {
    throw new Error('topY and leftX are required if absolutePosition is true');
  }

  const hasNestedCellViz = cellVisualization !== undefined && cellDataRelation !== undefined;
  const [nestedCellViz, setNestedCellViz] = useState<Array<JSX.Element | undefined>>(
    () => Array(hasNestedCellViz ? rows * columns : 0).fill(undefined)
  );
  const updateNestedViz = (idx: number, value: JSX.Element) => {
    setNestedCellViz((prev) => prev.map((val, i) => i === idx ? value : val));
  }

  const cellHeight = height / rows;
  const cellWidth = width / columns;

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // remove previous render

    const gridGroup = svg.append('g');

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const cellGroup = gridGroup
          .append('g')
          .attr(
            'transform',
            `translate(${col * cellWidth}, ${row * cellHeight})`
          );

        cellGroup
          .append('rect')
          .attr('width', cellWidth)
          .attr('height', cellHeight)
          .attr('stroke-width', strokeWidth)
          .attr('stroke', strokeColor)
          .attr('fill', 'transparent'); // [NOTE] we could let the user choose the fill color
        
        if (dashedStroke) cellGroup.attr('stroke-dasharray', '5,5');

        if (cellText !== undefined) {
          const cellTextValue = isArray(cellText) ? cellText[row * columns + col] : cellText;
          cellGroup
            .append('text')
            .attr('x', cellWidth / 2)
            .attr('y', cellHeight / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', Math.min(cellWidth, cellHeight) / 3) // [NOTE] we could let the user choose the font size
            .text(applyTextRename(cellTextValue, textRenames));
        }

        if (hasNestedCellViz) {
          let cellVizJson = cellVisualization[row * columns + col];

          // TODO: FIX EVERYTHING UNDER THIS
          if (cellDataRelation.type === 'get-next-from-trace') {
            // [TODO] URGENT!!! this next if block with replacements is super JANKY. 
            // move replacements into components themselves using args so that we can
            // do this in a cleaner way, and with less janky stuff like this. 
            // it should also help us prevent issues of shadowed variables and replacing
            // with invalid values from outer scopes prematurely. 
            if (cellVizJson.type === 'grid') {
              cellVizJson.properties.rows = `${cellVizJson.properties.rows}`.replaceAll('${row}', `${row}`).replaceAll('${col}', `${col}`);
              cellVizJson.properties.columns = `${cellVizJson.properties.columns}`.replaceAll('${row}', `${row}`).replaceAll('${col}', `${col}`);
            }
          // } else if (cellDataRelation.type === 'get-value-from-grid-cell') {
          //   cellVizJson = JSON.parse(JSON.stringify(cellVisualization).replaceAll('${row}', `${row}`).replaceAll('${col}', `${col}`));
          }
          let component: JSX.Element;
          console.log('going to look at type:', cellVizJson.type);
            switch (cellVizJson.type) {
              // [TODO] add support for things other than nested grids
              case 'grid':
                const ytop = topY || 0;
                const xleft = leftX || 0;
                component = <GridComponent json={cellVizJson} datum={datum} textRenames={textRenames} dynamics={{}} vizRow={row} vizCol={col} offsetX={xleft + xOffset + (col * cellWidth)} offsetY={ytop + yOffset + (row * cellHeight)} />;
                break;
              case 'arrow':
                console.log('in arrow');
                component = <ArrowComponent json={cellVizJson} datum={datum} dynamics={{}} vizRow={row} vizCol={col} offsetX={(leftX || 0) + xOffset + (col * cellWidth)} offsetY={(topY || 0) + yOffset + (row * cellHeight)} />;
                break;
              default:
                component = <></>;
            }
          updateNestedViz(row * columns + col, component);
        }
      }
    }
  }, [svgRef.current])

  if (cellGroup) {
    return <></>; // already rendered within parent component's svg element
  }

  if (absolutePosition) {
    return (
      <div>
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: topY! + yOffset,
            left: leftX! + xOffset,
            boxShadow: shouldGlow
          ? "inset 0 0 8px rgba(253, 224, 71, 0.8), inset 0 0 16px rgba(253, 224, 71, 0.6)"
          : "none"
          }}
          className={`${shouldGlow ? "bg-yellow-100 animate-pulse" : ""}`}
          id={props.id}
        />

        {nestedCellViz.map((viz) => viz)}
      </div>
    )
  }

  return (
    <div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: yOffset,
          left: xOffset,
          boxShadow: shouldGlow
          ? "inset 0 0 8px rgba(253, 224, 71, 0.8), inset 0 0 16px rgba(253, 224, 71, 0.6)"
          : "none"
        }}
        className={`${shouldGlow ? "bg-yellow-100 animate-pulse" : ""}`}
        id={props.id}
      />

      {nestedCellViz.map((viz) => viz)}
    </div>
  )
}
