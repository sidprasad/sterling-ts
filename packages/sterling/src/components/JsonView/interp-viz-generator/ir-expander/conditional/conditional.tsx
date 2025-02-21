import React from 'react';
import { DatumParsed } from '@/sterling-connection';
import { SingleComponent } from '../ir-expander';
import { handleConditional } from '../util';
import { ForgeUtil } from '../../../forge-evaluator';

interface ConditionalComponentProps {
  elementJson: any;
  datum: DatumParsed<any>;
  textRenames: [string, string][];
  vizRow?: number;
  vizCol?: number;
}

// This function is only safe to call if you have a conditional element
export function ConditionalComponent(props: ConditionalComponentProps) {
  // [TODO] update this to make use of dynamics (when grid components are implemented)
  const { elementJson, datum, textRenames, vizRow, vizCol } = props;

  const instanceIndex = 0; // TODO: we should make this a stateful var that is passed in from the UI
  const forgeUtil = new ForgeUtil(datum, instanceIndex);
  
  try {
    const resultComponentJson = handleConditional(elementJson, forgeUtil);
    return <SingleComponent elementJson={resultComponentJson} datum={datum} textRenames={textRenames} vizRow={vizRow} vizCol={vizCol} />;
  } catch (e) {
    return <div color='red'>Error: condition didn't evaluate to bool -- {elementJson.condition}</div>
  }
}