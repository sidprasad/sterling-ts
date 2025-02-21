import React from 'react';
import { DatumParsed } from "@/sterling-connection";
import { evaluateForgeProps, handleConditional } from '../util';
import Line from '../../components/Line';
import { ForgeUtil } from '../../../forge-evaluator';

interface LineComponentProps {
  json: any;
  datum: DatumParsed<any>;
  dynamics: { [key: string]: any };
  vizRow: number | undefined;
  vizCol: number | undefined;
}

export function LineComponent(props: LineComponentProps) {
  // [TODO] update this to use dynamics, vizRow, and vizCol where necessary 
  const { json, dynamics, vizRow, vizCol, datum } = props;
  const { id, properties } = json;
  const { startX, endX, startY, endY, lineStyle } = properties;

  const instanceIndex = 0; // TODO: we should make this a stateful var that is passed in from the UI
  const forgeUtil = new ForgeUtil(datum, instanceIndex);

  // make initial requests to evaluate conditional expressions for props
  let startXValue = handleConditional(startX, forgeUtil);
  let endXValue = handleConditional(endX, forgeUtil);
  let startYValue = handleConditional(startY, forgeUtil);
  let endYValue = handleConditional(endY, forgeUtil);
  let strokeWidthValue = lineStyle && (
    lineStyle.strokeWidth ? handleConditional(lineStyle.strokeWidth, forgeUtil) : undefined
  );
  let strokeColorValue = lineStyle && (
    lineStyle.strokeColor ? handleConditional(lineStyle.strokeColor, forgeUtil) : undefined
  );

  // evaluate props as forge expressions when specified by the user
  startXValue = evaluateForgeProps(startXValue, forgeUtil);
  endXValue = evaluateForgeProps(endXValue, forgeUtil);
  startYValue = evaluateForgeProps(startYValue, forgeUtil);
  endYValue = evaluateForgeProps(endYValue, forgeUtil);
  strokeWidthValue = evaluateForgeProps(strokeWidthValue, forgeUtil);
  strokeColorValue = evaluateForgeProps(strokeColorValue, forgeUtil);

  return (
    <Line
      startX={Number(startXValue)}
      endX={Number(endXValue)}
      startY={Number(startYValue)}
      endY={Number(endYValue)}
      lineStyle={{
        strokeWidth: strokeWidthValue ? Number(strokeWidthValue) : undefined,
        strokeColor: strokeColorValue ? String(strokeColorValue) : undefined
      }}
    />
  );
}