import React from 'react';
import { applyTextRename, evaluateForgeProps, handleConditional } from '../util';
import TextDisplay from '../../components/TextDisplay';
import { DatumParsed } from '@/sterling-connection';
import { ForgeUtil } from '../../../forge-evaluator';

interface TextComponentProps {
  json: any;
  datum: DatumParsed<any>;
  textRenames: [string, string][];
  dynamics: { [key: string]: any };
  vizRow: number | undefined;
  vizCol: number | undefined;
}

export function TextComponent(props: TextComponentProps) {
  // [TODO] update this to use dynamics, vizRow, and vizCol where necessary
  const { json, dynamics, textRenames, vizRow, vizCol, datum } = props;
  const { id, properties, shouldGlow } = json;
  const { text, topY, leftX, textStyle } = properties;

  const instanceIndex = 0; // TODO: we should make this a stateful var that is passed in from the UI
  const forgeUtil = new ForgeUtil(datum, instanceIndex);

  // make initial requests to evaluate conditional expressions for props
  let textValue = handleConditional(text, forgeUtil);
  let topYValue = handleConditional(topY, forgeUtil);
  let leftXValue = handleConditional(leftX, forgeUtil);
  let textColorValue = textStyle && (
    textStyle.textColor ? handleConditional(textStyle.textColor, forgeUtil) : undefined
  );

  // evaluate props as forge expressions when specified by the user
  textValue = evaluateForgeProps(textValue, forgeUtil);
  topYValue = evaluateForgeProps(topYValue, forgeUtil);
  leftXValue = evaluateForgeProps(leftXValue, forgeUtil);
  textColorValue = evaluateForgeProps(textColorValue, forgeUtil);

  return (
    <TextDisplay
      text={applyTextRename(String(textValue), textRenames)}
      topY={Number(topYValue)}
      leftX={Number(leftXValue)}
      textStyle={
        textStyle && textStyle.textColor
          ? { textColor: String(textColorValue) }
          : undefined
      }
      shouldGlow={shouldGlow}
      id={id}
    />
  );
}
