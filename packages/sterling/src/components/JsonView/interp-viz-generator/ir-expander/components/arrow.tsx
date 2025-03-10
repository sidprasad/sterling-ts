import React from 'react';
import { DatumParsed } from "@/sterling-connection";
import { evaluateForgeProps, handleConditional } from '../util';
import Arrow from '../../components/Arrow';
import { ForgeUtil } from '../../../forge-evaluator';

interface ArrowComponentProps {
  json: any;
  datum: DatumParsed<any>;
  dynamics: { [key: string]: any };
  vizRow: number | undefined;
  vizCol: number | undefined;
  offsetX?: number;
  offsetY?: number;
}

export function ArrowComponent(props: ArrowComponentProps) {
  // [TODO] update this to use dynamics, vizRow, and vizCol where necessary
  const { json, dynamics, vizRow, vizCol, datum, offsetX, offsetY } = props;
  const { id, properties, shouldGlow } = json;
  const { startX, endX, startY, endY, arrowStyle } = properties;

  const xOffset = offsetX || 0;
  const yOffset = offsetY || 0;

  const instanceIndex = 0; // TODO: we should make this a stateful var that is passed in from the UI
  const forgeUtil = new ForgeUtil(datum, instanceIndex);

  // make initial requests to evaluate conditional expressions for props
  let startXValue = handleConditional(startX, forgeUtil);
  let endXValue = handleConditional(endX, forgeUtil);
  let startYValue = handleConditional(startY, forgeUtil);
  let endYValue = handleConditional(endY, forgeUtil);
  let strokeWidthValue = arrowStyle && (
    arrowStyle.strokeWidth ? handleConditional(arrowStyle.strokeWidth, forgeUtil) : undefined
  );
  let strokeColorValue = arrowStyle && (
    arrowStyle.strokeColor ? handleConditional(arrowStyle.strokeColor, forgeUtil) : undefined
  );

  // evaluate props as forge expressions when specified by the user
  startXValue = evaluateForgeProps(startXValue, forgeUtil);
  endXValue = evaluateForgeProps(endXValue, forgeUtil);
  startYValue = evaluateForgeProps(startYValue, forgeUtil);
  endYValue = evaluateForgeProps(endYValue, forgeUtil);
  strokeWidthValue = evaluateForgeProps(strokeWidthValue, forgeUtil);
  strokeColorValue = evaluateForgeProps(strokeColorValue, forgeUtil);

  return (
    <Arrow
      startX={Number(startXValue)}
      endX={Number(endXValue)}
      startY={Number(startYValue)}
      endY={Number(endYValue)}
      offsetX={xOffset}
      offsetY={yOffset}
      arrowStyle={{
        strokeWidth: strokeWidthValue ? Number(strokeWidthValue) : undefined,
        strokeColor: strokeColorValue ? String(strokeColorValue) : undefined
      }}
      shouldGlow={shouldGlow}
      id={id}
    />
  );
}