import React, { useState } from 'react';
import { ComponentType, componentProperties } from './ControlPane';
import {
  ComponentPropertyInput,
  ComponentPropertyValue,
  PropertyValue
} from './ComponentProperties';
import { ComponentData } from './VizConstructor';
import ComponentForm from './ComponentForm';


export enum CellDataRelationType {
  GRIDCELL = 'get-value-from-grid-cell',
  TRACE = 'get-next-from-trace'
}

interface AddComponentProps {
  setComponentsData: React.Dispatch<React.SetStateAction<ComponentData[]>>;
  addToComponentIdxAsNestedComponent?: number; // add as nested cell viz for the
  // grid cells of the grid component with the given component index
  customHeight?: number; // default is 59
  additionalCleanup?: () => void;
}

export default function AddComponent(props: AddComponentProps) {
  const { setComponentsData, addToComponentIdxAsNestedComponent } = props;

  const isNested = addToComponentIdxAsNestedComponent !== undefined;

  // stateful variable to store the type of component the user
  // is currently adding to the canvas
  const [selectedComponentType, setSelectedComponentType] = useState<
    ComponentType | undefined
  >(undefined);

  const [selectedCellDataRelationType, setSelectedCellDataRelationType] = useState<CellDataRelationType | undefined>(undefined);
  const [selectedTrace, setSelectedTrace] = useState<string | undefined>(undefined);

  const handleAddComponent = (
    componentPropertyValues: Record<string, PropertyValue>
  ) => {
    if (!selectedComponentType) return;

    if (isNested && !selectedCellDataRelationType) return;

    if (selectedCellDataRelationType === CellDataRelationType.TRACE && !selectedTrace) return;

    const properties = componentProperties[selectedComponentType];
    const componentPropertyData: ComponentPropertyValue[] = properties.map(
      (property) => ({
        name: property.name,
        type: property.type,
        value: componentPropertyValues[property.name],
        required: property.required,
        isStyle: property.isStyle
      })
    );

    const newComponent: ComponentData = {
      type: selectedComponentType,
      properties: componentPropertyData,
      shouldGlow: false
    };
    console.log('newComponent:', newComponent);

    if (!isNested) {
      setComponentsData((prev) => [...prev, newComponent]);
    } else {
      setComponentsData((prev) =>
        prev.map((component, idx) =>
          idx === addToComponentIdxAsNestedComponent
            ? {
                ...component,
                properties: [
                  ...component.properties,
                  {
                    name: 'cellVisualization',
                    type: 'component',
                    value: newComponent,
                    required: false,
                    isStyle: false
                  },
                  // {
                  //   name: 'cellDataRelation',
                  //   type: 'component',
                  //   value: {
                  //     type: 'get-value-from-grid-cell'
                  //   },
                  //   required: false,
                  //   isStyle: false
                  // }
                  {
                    name: 'cellDataRelation',
                    type: 'component',
                    required: false,
                    value: {
                      type: selectedCellDataRelationType,
                      relation: selectedTrace
                    },
                    isStyle: false
                  }
                ]
              }
            : component
        )
      );
    }
    // setComponentsData((prev) => [...prev, newComponent]);
    setSelectedComponentType(undefined);
    if (props.additionalCleanup !== undefined) {
      props.additionalCleanup();
    }
  };

  return (
    <div>
      {isNested && (
        <div>
          <p className='mt-2 text-sm'>Pick a cellDataRelation type:</p>
          <div className='space-x-2'>
            <button
              className={`px-2 py-1 text-sm rounded ${
                selectedCellDataRelationType === CellDataRelationType.GRIDCELL
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => {setSelectedCellDataRelationType(CellDataRelationType.GRIDCELL); setSelectedTrace(undefined);}}
            >
              {CellDataRelationType.GRIDCELL}
            </button>
            <button
              className={`px-2 py-1 text-sm rounded ${
                selectedCellDataRelationType === CellDataRelationType.TRACE
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
              onClick={() => setSelectedCellDataRelationType(CellDataRelationType.TRACE)}
            >
              {CellDataRelationType.TRACE}
            </button>
          </div>
          {selectedCellDataRelationType === CellDataRelationType.TRACE && (
            <div>
              <p className='mt-2 text-sm'>Enter a trace name (arity 2 tuples):</p>
              <input
                type='text'
                value={selectedTrace || ''}
                onChange={(e) => setSelectedTrace(e.target.value)}
                className='border border-gray-300 rounded px-2 py-1'
              />
            </div>
          )}
        </div>
      )}
      <p className='mt-4 text-base'>
        Choose the type of component you want to add:
      </p>
      <div className='my-2 flex gap-3 justify-center'>
        {Object.values(ComponentType).map((componentType) => (
          <button
            key={componentType}
            onClick={() => setSelectedComponentType(componentType)}
            className={`px-2 py-1 text-sm rounded ${
              selectedComponentType === componentType
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {componentType}
          </button>
        ))}
      </div>

      {selectedComponentType ? (
        <ComponentForm
          properties={componentProperties[selectedComponentType]}
          onSubmit={handleAddComponent}
          onCancel={() => setSelectedComponentType(undefined)}
          customHeight={props.customHeight}
        />
      ) : (
        <p className='mt-10 text-sm text-gray-600'>
          Select a component type to configure its properties
        </p>
      )}
    </div>
  );
}
