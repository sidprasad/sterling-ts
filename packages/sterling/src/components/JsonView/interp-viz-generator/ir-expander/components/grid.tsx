import React from 'react';
import { DatumParsed } from '@/sterling-connection';
import Grid from '../../components/Grid';
import {
  evaluateForgeProps,
  getOrderedTrace,
  handleConditional,
  isConditional,
  usesVar
} from '../util';
import { ForgeUtil } from '../../../forge-evaluator';

interface GridComponentProps {
  json: any;
  datum: DatumParsed<any>;
  textRenames: [string, string][];
  dynamics: { [key: string]: any };
  vizRow?: number;
  vizCol?: number;
  parentRef?: React.MutableRefObject<SVGSVGElement | null>;
  cellGroup?: d3.Selection<SVGGElement, unknown, null, undefined>;
  offsetX?: number;
  offsetY?: number;
}

export function GridComponent(props: GridComponentProps) {
  console.log('inside GridComponent');
  // [TODO] update this to use dynamics, vizRow, and vizCol where necessary
  const {
    json,
    dynamics,
    textRenames,
    vizRow,
    vizCol,
    datum,
    parentRef,
    cellGroup,
    offsetX,
    offsetY,
  } = props;
  const { id, properties, shouldGlow } = json;
  const {
    rows,
    columns,
    height,
    width,
    absolutePosition,
    topY,
    leftX,
    gridStyle,
    cellDataRelation,
    cellText,
    cellVisualization
  } = properties;

  const xOffset = offsetX || 0;
  const yOffset = offsetY || 0;

  // [TODO] we're currently assuming that the cellDataRelation won't be a
  // conditional. We probably don't want to make that assumption so we need
  // to fix that.

  const instanceIndex = 0; // TODO: we should make this a stateful var that is passed in from the UI
  const forgeUtil = new ForgeUtil(datum, instanceIndex);

  // make initial requests to evaluate conditional expressions for props
  let rowsValue = handleConditional(rows, forgeUtil);
  let columnsValue = handleConditional(columns, forgeUtil);
  let heightValue = handleConditional(height, forgeUtil);
  let widthValue = handleConditional(width, forgeUtil);
  let absolutePositionValue = handleConditional(absolutePosition, forgeUtil);
  let topYValue = handleConditional(topY, forgeUtil);
  let leftXValue = handleConditional(leftX, forgeUtil);
  let dashedStrokeValue =
    gridStyle &&
    (gridStyle.dashedStroke
      ? handleConditional(gridStyle.dashedStroke, forgeUtil)
      : undefined);
  let strokeWidthValue =
    gridStyle &&
    (gridStyle.strokeWidth
      ? handleConditional(gridStyle.strokeWidth, forgeUtil)
      : undefined);
  let strokeColorValue =
    gridStyle &&
    (gridStyle.strokeColor
      ? handleConditional(gridStyle.strokeColor, forgeUtil)
      : undefined);
  let cellDataRelationValue = handleConditional(cellDataRelation, forgeUtil);
  let cellTextValue = handleConditional(cellText, forgeUtil);
  let cellVisualizationValue = handleConditional(cellVisualization, forgeUtil);

  // this is for a potential relation value in the cellDataRelation field
  // TODO: shouldn't it use cellDataRelationValue instead of cellDataRelation?
  let traceRelationName = undefined;
  if (
    cellDataRelation !== undefined &&
    cellDataRelation.type === 'get-next-from-trace' &&
    cellDataRelation.relation !== undefined
  ) {
    traceRelationName = cellDataRelation.relation;
  }
  let traceRelationValue = undefined;

  // evaluate props as forge expressions when specified by the user
  rowsValue = evaluateForgeProps(rowsValue, forgeUtil);
  columnsValue = evaluateForgeProps(columnsValue, forgeUtil);
  heightValue = evaluateForgeProps(heightValue, forgeUtil);
  widthValue = evaluateForgeProps(widthValue, forgeUtil);
  absolutePositionValue = evaluateForgeProps(absolutePositionValue, forgeUtil);
  topYValue = evaluateForgeProps(topYValue, forgeUtil);
  leftXValue = evaluateForgeProps(leftXValue, forgeUtil);
  dashedStrokeValue = evaluateForgeProps(dashedStrokeValue, forgeUtil);
  strokeWidthValue = evaluateForgeProps(strokeWidthValue, forgeUtil);
  strokeColorValue = evaluateForgeProps(strokeColorValue, forgeUtil);
  cellDataRelationValue = evaluateForgeProps(cellDataRelationValue, forgeUtil);
  if (
    cellTextValue !== undefined &&
    !usesVar(cellTextValue, 'row') &&
    !usesVar(cellTextValue, 'col')
  ) {
    cellTextValue = evaluateForgeProps(cellTextValue, forgeUtil);
  }
  // TODO: do we really need this for cellVisualizationValue? This is a nested component;
  //       can't be a Forge expr
  cellVisualizationValue = evaluateForgeProps(
    cellVisualizationValue,
    forgeUtil
  );
  if (traceRelationName !== undefined) {
    traceRelationValue = evaluateForgeProps(traceRelationName, forgeUtil);
  }

  const evaluatedCellDataRelation = cellDataRelation;
  if (traceRelationValue !== undefined) {
    evaluatedCellDataRelation.relation = traceRelationValue;
  }

  // evaluating cellText if required
  const numRows = Number(rowsValue);
  const numColumns = Number(columnsValue);
  const toEvaluateCellText =
    cellTextValue !== undefined &&
    (isConditional(cellTextValue) ||
      usesVar(cellTextValue, 'row') ||
      usesVar(cellTextValue, 'col'));
  const cellTextEvals = Array(
    toEvaluateCellText ? numRows * numColumns : 0
  ).fill(undefined);
  const updateCellTextValue = (idx: number, value: any) => {
    cellTextEvals[idx] = value;
  };
  if (toEvaluateCellText) {
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numColumns; c++) {
        let thisCellTextValue = cellTextValue;
        if (isConditional(cellTextValue)) {
          const cellTextCopy = cellTextValue;
          cellTextCopy.condition = cellTextCopy.condition
            .replaceAll('${row}', `${r}`)
            .replaceAll('${col}', `${c}`);
          thisCellTextValue = handleConditional(cellTextCopy, forgeUtil);
        }
        thisCellTextValue = thisCellTextValue
          .replaceAll('${row}', `${r}`)
          .replaceAll('${col}', `${c}`);
        thisCellTextValue = evaluateForgeProps(thisCellTextValue, forgeUtil);
        updateCellTextValue(r * numColumns + c, thisCellTextValue);
      }
    }
  }
  let finalCellTextValue = toEvaluateCellText ? cellTextEvals : cellTextValue;

  // evaluating cellVisualization if required
  const toEvaluateCellVisualization =
    cellVisualizationValue !== undefined &&
    evaluatedCellDataRelation !== undefined;
  const orderedTrace =
    evaluatedCellDataRelation !== undefined &&
    evaluatedCellDataRelation.type === 'get-next-from-trace'
      ? getOrderedTrace(evaluatedCellDataRelation.relation)
      : [];
  const cellVizEvals = Array(
    toEvaluateCellVisualization ? numRows * numColumns : 0
  ).fill(undefined);
  const updateCellVizValue = (idx: number, value: any) => {
    cellVizEvals[idx] = value;
  };
  if (toEvaluateCellVisualization) {
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numColumns; c++) {
        let thisCellVizJson = handleConditional(cellVisualizationValue, forgeUtil);
        if (evaluatedCellDataRelation.type === 'get-next-from-trace') {
          thisCellVizJson = JSON.parse(
            JSON.stringify(thisCellVizJson).replaceAll(
              '${x}',
              `${orderedTrace[r * numColumns + c]}`
            )
          );
        } else {
          // TODO: this replace-all business is SUPER JANKY! NEED TO FIX IT!
          //       I think moving the replacements into the components themselves (as it should be)
          //       should resolve this.
          thisCellVizJson = JSON.parse(
            JSON.stringify(thisCellVizJson)
              .replaceAll('${row}', `${r}`)
              .replaceAll('${col}', `${c}`)
          );
        }
        updateCellVizValue(r * numColumns + c, thisCellVizJson);
      }
    }
  }
  const finalCellVisualizationValue = toEvaluateCellVisualization
    ? cellVizEvals
    : cellVisualizationValue;

  return (
    <Grid
      datum={datum}
      textRenames={textRenames}
      rows={Number(rowsValue)}
      columns={Number(columnsValue)}
      height={Number(heightValue)}
      width={Number(widthValue)}
      // the values used below (i.e. 'true', '#t', true) are truthy; everything else is falsy
      absolutePosition={
        absolutePositionValue === 'true' ||
        absolutePositionValue === '#t' ||
        absolutePositionValue === true
      }
      topY={topYValue !== undefined ? Number(topYValue) : undefined}
      leftX={leftXValue !== undefined ? Number(leftXValue) : undefined}
      gridStyle={{
        dashedStroke:
          dashedStrokeValue === 'true' ||
          dashedStrokeValue === '#t' ||
          dashedStrokeValue === true,
        strokeWidth:
          strokeWidthValue !== undefined ? Number(strokeWidthValue) : undefined,
        strokeColor: strokeColorValue
      }}
      // cellDataRelation={cellDataRelation}
      cellDataRelation={evaluatedCellDataRelation}
      cellText={finalCellTextValue}
      cellVisualization={finalCellVisualizationValue}
      parentRef={parentRef}
      cellGroup={cellGroup}
      offsetX={xOffset}
      offsetY={yOffset}
      shouldGlow={shouldGlow}
      id={id}
    />
  );
}
