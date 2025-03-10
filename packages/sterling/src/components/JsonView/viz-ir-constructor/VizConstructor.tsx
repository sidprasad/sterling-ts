import React, { useState } from 'react';
import ControlPane from './ControlPane';
import { ComponentPropertyValue } from './ComponentProperties';
import { JsonEntry } from '../interp-viz-generator/ir-expander/ir-expander';
import VisualizationGenerator from '../interp-viz-generator/VisualizationGenerator';
import { DatumParsed } from '@/sterling-connection';

export type ComponentData = {
  type: string;
  properties: ComponentPropertyValue[];
  shouldGlow: boolean;
};

function generateIR(componentsData: ComponentData[], customName?: string): JsonEntry[] {
  // const json = componentsData.map((componentData, idx) => ({
  //   id: `${componentData.type}${idx}`,
  //   type: componentData.type,
  //   properties: componentData.properties.reduce((acc, property) => {
  //     acc[property.name] = property.value;
  //     return acc;
  //   }, {} as Record<string, any>)
  // }));
  // return json;
  const json = componentsData.map((componentData, idx) => {
    const type = componentData.type;
    const shouldGlow = componentData.shouldGlow;
    const mainProperties = JSON.parse(JSON.stringify(componentData.properties.filter(
      (property) => !property.isStyle
    ))) as ComponentPropertyValue[];
    const styleProperties = JSON.parse(JSON.stringify(componentData.properties.filter(
      (property) => property.isStyle
    ))) as ComponentPropertyValue[];

    // deal with cellVisualization field for grid properly (via recursion)
    if (type === 'grid') {
      const cellVisualizationProperty = mainProperties.find(
        (property) => property.name === 'cellVisualization'
      );
      if (cellVisualizationProperty) {
        const cellVisualization = [
          cellVisualizationProperty.value as ComponentData
        ]; // put into array just because that's what the func expects
        const cellVisualizationJson = generateIR(cellVisualization, "nested")[0]; // get the value out of the array
        mainProperties.find(
          (property) => property.name === 'cellVisualization'
        )!.value = cellVisualizationJson;
      }
    }

    const styleJson = styleProperties.reduce((acc, property) => {
      acc[property.name] = property.value;
      return acc;
    }, {} as Record<string, any>);

    const mainJson = {
      // id: `${type}${idx}`,
      // id: `component-${idx}`,
      id: `component-${idx}${customName ? `-${customName}` : ''}`,
      type,
      shouldGlow,
      properties: mainProperties.reduce((acc, property) => {
        acc[property.name] = property.value;
        return acc;
      }, {} as Record<string, any>)
    };
    mainJson.properties[`${type}Style`] = styleJson;
    return mainJson;
  });

  return json;
}

interface VizConstructorProps {
  datum: DatumParsed<any>;
}

export default function VizConstructor(props: VizConstructorProps) {
  // stateful variable to store the data for all components that have been
  // added. this is effectively a 2d list of ComponentPropertyValue objects.
  // each row corresponds to a component, and each entry in that row corresponds
  // to a single property (field) of that component.
  const [componentsData, setComponentsData] = useState<ComponentData[]>([]);
  const [textRenames, setTextRenames] = useState<[string, string][]>([]);
  const { datum } = props;

  // [TODO] use componentsData to generate the IR and then pass that to the "backend"
  // and then construct the output in the left pane.
  const generatedIR = generateIR(componentsData);
  if (componentsData.length > 0) {
    console.log('Generated IR:', generatedIR);
  }

  return (
    <div className='flex h-screen'>
      <div className='flex-[3_1_0%]'>
        <div className='h-full'>
          <VisualizationGenerator datum={datum} jsonIR={generatedIR} textRenames={textRenames} />
        </div>
      </div>

      <div className='flex-[2_1_0%]'>
        <div className='bg-gray-100 h-full'>
          <ControlPane
            componentsData={componentsData}
            setComponentsData={setComponentsData}
            textRenames={textRenames}
            setTextRenames={setTextRenames}
          />
        </div>
      </div>
    </div>
  );
}
