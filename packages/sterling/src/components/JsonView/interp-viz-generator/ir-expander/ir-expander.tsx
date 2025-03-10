import React from 'react';
import { ConditionalComponent } from './conditional/conditional';
import { TextComponent } from './components/text';
import { DatumParsed } from '@/sterling-connection';
import { SterlingDispatch } from 'sterling/src/state/store';
import { LineComponent } from './components/line';
import { GridComponent } from './components/grid';
import { ArrowComponent } from './components/arrow';

// [TODO] maybe it's possible to define this in a better way -- we
// could define a separate type for `properties` for each kind of
// component, and then define `properties` here as a union over
// those types?
type JsonComponent = {
  id: string;
  type: string;
  properties: any;
};

type Conditional = {
  type: 'conditional';
  condition: string;
  then: any;
  else: any;
};

export type JsonEntry = JsonComponent | Conditional;

interface SingleComponentProps {
  elementJson: JsonEntry;
  datum: DatumParsed<any>;
  textRenames: [string, string][];
  vizRow?: number;
  vizCol?: number;
}

export function SingleComponent(props: SingleComponentProps) {
  const { elementJson, datum, textRenames, vizRow, vizCol } = props;

  if (elementJson.type === 'conditional') {
    return <ConditionalComponent elementJson={elementJson} datum={datum} textRenames={textRenames} vizRow={vizRow} vizCol={vizCol} />;
  }

  if (elementJson.type === 'text') {
    return (
      <TextComponent
        json={elementJson}
        datum={datum}
        textRenames={textRenames}
        dynamics={{}}
        vizRow={vizRow}
        vizCol={vizCol}
      />
    );
  }

  if (elementJson.type === 'line') {
    return (
      <LineComponent
        json={elementJson}
        datum={datum}
        dynamics={{}}
        vizRow={vizRow}
        vizCol={vizCol}
      />
    )
  }

  if (elementJson.type === 'grid') {
    return (
      <GridComponent
        json={elementJson}
        datum={datum}
        textRenames={textRenames}
        dynamics={{}}
        vizRow={vizRow}
        vizCol={vizCol}
      />
    )
  }

  if (elementJson.type === 'arrow') {
    return (
      <ArrowComponent
        json={elementJson}
        datum={datum}
        dynamics={{}}
        vizRow={vizRow}
        vizCol={vizCol}
      />
    )
  }

  return <div>unknown component</div>;
}

interface VisualizationComponentsProps {
  jsonIR: JsonEntry[];
  datum: DatumParsed<any>;
  textRenames: [string, string][];
}

export function VisualizationComponents(props: VisualizationComponentsProps) {
  const { jsonIR, datum, textRenames } = props;

  return (
    <>
      {jsonIR.map((element, i) => {
        return <SingleComponent elementJson={element} datum={datum} textRenames={textRenames} />;
      })}
    </>
  );
}
