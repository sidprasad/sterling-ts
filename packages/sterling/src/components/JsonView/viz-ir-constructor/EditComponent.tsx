import React, { useState, useRef, useEffect } from 'react';
import { ComponentData } from './VizConstructor';
import { PropertyValue } from './ComponentProperties';
import ComponentForm from './ComponentForm';
import { isConditional } from '../interp-viz-generator/ir-expander/util';
import AddComponent from './AddComponent';

function getComponentDescriber(componentData: ComponentData) {
  const handleConditional = (value: PropertyValue, propertyName?: string) => {
    if (isConditional(value)) {
      return `conditional ${propertyName || ''}: ${value.condition}`;
    }
    return value;
  };

  switch (componentData.type) {
    case 'text':
      const textProperty = componentData.properties.find(
        (property) => property.name === 'text'
      );
      if (textProperty === undefined) {
        throw new Error('Text component must have a text property');
      }
      return `Text component: ${handleConditional(textProperty.value, 'text')}`;
    case 'line':
      const startXProperty = componentData.properties.find(
        (property) => property.name === 'startX'
      );
      const endXProperty = componentData.properties.find(
        (property) => property.name === 'endX'
      );
      const startYProperty = componentData.properties.find(
        (property) => property.name === 'startY'
      );
      const endYProperty = componentData.properties.find(
        (property) => property.name === 'endY'
      );
      if (
        startXProperty === undefined ||
        endXProperty === undefined ||
        startYProperty === undefined ||
        endYProperty === undefined
      ) {
        throw new Error('Line component must have startX, endX, startY, and endY properties');
      }
      return `Line component - startX: ${handleConditional(
        startXProperty.value
      )}, endX: ${handleConditional(endXProperty.value)}, startY: ${handleConditional(
        startYProperty.value
      )}, endY: ${handleConditional(endYProperty.value)}`;
    case 'arrow':
      const arrowStartXProperty = componentData.properties.find(
        (property) => property.name === 'startX'
      );
      const arrowEndXProperty = componentData.properties.find(
        (property) => property.name === 'endX'
      );
      const arrowStartYProperty = componentData.properties.find(
        (property) => property.name === 'startY'
      );
      const arrowEndYProperty = componentData.properties.find(
        (property) => property.name === 'endY'
      );
      if (
        arrowStartXProperty === undefined ||
        arrowEndXProperty === undefined ||
        arrowStartYProperty === undefined ||
        arrowEndYProperty === undefined
      ) {
        throw new Error('Arrow component must have startX, endX, startY, and endY properties');
      }
      return `Arrow component - startX: ${handleConditional(
        arrowStartXProperty.value
      )}, endX: ${handleConditional(arrowEndXProperty.value)}, startY: ${handleConditional(
        arrowStartYProperty.value
      )}, endY: ${handleConditional(arrowEndYProperty.value)}`;
    case 'grid':
      const rowsProperty = componentData.properties.find(
        (property) => property.name === 'rows'
      );
      const columnsProperty = componentData.properties.find(
        (property) => property.name === 'columns'
      );
      const heightProperty = componentData.properties.find(
        (property) => property.name === 'height'
      );
      const widthProperty = componentData.properties.find(
        (property) => property.name === 'width'
      );
      if (rowsProperty === undefined || columnsProperty === undefined) {
        throw new Error('Grid component must have rows and columns properties');
      }
      if (heightProperty === undefined || widthProperty === undefined) {
        throw new Error('Grid component must have height and width properties');
      }
      return `Grid component - rows: ${handleConditional(
        rowsProperty.value
      )}, columns: ${handleConditional(
        columnsProperty.value
      )}, height: ${handleConditional(
        heightProperty.value
      )}, width: ${handleConditional(widthProperty.value)}`;
    default:
      // [TODO] fix this!
      return 'unsupported component data type';
  }
}

interface EditComponentProps {
  componentsData: ComponentData[];
  setComponentsData: React.Dispatch<React.SetStateAction<ComponentData[]>>;
}

export default function EditComponent(props: EditComponentProps) {
  const { componentsData, setComponentsData } = props;
  const [selectedComponentIdx, setSelectedComponentIdx] = useState<
    number | undefined
  >(undefined);
  const [isMoveMode, setIsMoveMode] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isNestedVizMode, setIsNestedVizMode] = useState<boolean>(false);

  const holographicRef = useRef<HTMLDivElement | null>(null);

  const setGlow = (idx: number, glowValue: boolean) => {
    setComponentsData((prev) =>
      prev.map((componentData, i) => {
        if (i === idx) {
          return {
            ...componentData,
            shouldGlow: glowValue
          };
        }
        return componentData;
      })
    );
  };

  const handleSelect = (idx: number) => {
    if (idx === selectedComponentIdx) {
      setSelectedComponentIdx(undefined);
      setGlow(idx, false);
      setIsMoveMode(false);
      setIsEditing(false);
      setIsNestedVizMode(false);
      return undefined;
    }
    setSelectedComponentIdx((prevIdx) => {
      if (prevIdx !== undefined) {
        setGlow(prevIdx, false);
      }
      // selecting new component so not already in any special mode
      setIsMoveMode(false);
      setIsEditing(false);
      setIsNestedVizMode(false);
      return idx;
    });
    setGlow(idx, true);
  };

  const handleDelete = () => {
    if (selectedComponentIdx !== undefined) {
      setComponentsData((prev) =>
        prev.filter((_, idx) => idx !== selectedComponentIdx)
      );
      setSelectedComponentIdx(undefined);
    }
  };

  const startMoveMode = () => {
    if (selectedComponentIdx !== undefined) {
      setIsEditing(false); // can't be in move mode and edit mode together
      setIsNestedVizMode(false); // can't be in move mode and nested viz mode together
      setIsMoveMode(true);

      // Create holographic clone of the selected component
      const node = document.querySelector(`#component-${selectedComponentIdx}`);
      if (node) {
        const clone = node.cloneNode(true) as HTMLDivElement;
        const rect = node.getBoundingClientRect(); // get current position and size
        const offsetX = rect.width / 2;
        const offsetY = rect.height / 2;

        clone.classList.add('moving-clone');
        clone.style.position = 'absolute';
        clone.style.opacity = '0.5';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '1000';
        // clone.style.transform = 'translate(-50%, -50%)';
        clone.style.width = `${rect.width}px`;
        clone.style.height = `${rect.height}px`;
        clone.style.left = `${rect.left + window.scrollX}px`;
        clone.style.top = `${rect.top + window.scrollY}px`;

        holographicRef.current = clone;
        document.body.appendChild(clone);

        // save the offsers for later use
        holographicRef.current.dataset.offsetX = `${offsetX}`;
        holographicRef.current.dataset.offsetY = `${offsetY}`;
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isMoveMode || !holographicRef.current) return;

    const offsetX = parseFloat(holographicRef.current.dataset.offsetX || '0');
    const offsetY = parseFloat(holographicRef.current.dataset.offsetY || '0');

    holographicRef.current.style.left = `${e.clientX - offsetX}px`;
    holographicRef.current.style.top = `${e.clientY - offsetY}px`;
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isMoveMode || selectedComponentIdx === undefined) return;

    const offsetX = parseFloat(holographicRef.current?.dataset.offsetX || '0');
    const offsetY = parseFloat(holographicRef.current?.dataset.offsetY || '0');

    // finalize placement
    const newX = e.clientX - offsetX + window.scrollX;
    // note: 34 is a manual adjustment that was required to make sure the "holographic"
    // component was placed at the same location as the original component
    const newY = e.clientY - offsetY + window.scrollY - 34;

    setComponentsData((prev) => {
      const updatedComponents = [...prev];
      updatedComponents[selectedComponentIdx].properties = updatedComponents[
        selectedComponentIdx
      ].properties.map((property) =>
        property.name === 'topY'
          ? { ...property, value: newY }
          : property.name === 'leftX'
          ? { ...property, value: newX }
          : property
      );
      if (updatedComponents[selectedComponentIdx].type === 'grid') {
        updatedComponents[selectedComponentIdx].properties = updatedComponents[
          selectedComponentIdx
        ].properties.map((property) =>
          property.name === 'absolutePosition'
            ? { ...property, value: `${true}` }
            : property
        );
        if (
          updatedComponents[selectedComponentIdx].properties.find(
            (property) => property.name === 'topY'
          ) === undefined
        ) {
          updatedComponents[selectedComponentIdx].properties.push({
            name: 'topY',
            type: 'number',
            value: newY,
            required: false,
            isStyle: false
          });
        }
        if (
          updatedComponents[selectedComponentIdx].properties.find(
            (property) => property.name === 'leftX'
          ) === undefined
        ) {
          updatedComponents[selectedComponentIdx].properties.push({
            name: 'leftX',
            type: 'number',
            value: newX,
            required: false,
            isStyle: false
          });
        }
      }
      if (updatedComponents[selectedComponentIdx].type === 'line' || updatedComponents[selectedComponentIdx].type === 'arrow') {
        const startX = updatedComponents[selectedComponentIdx].properties.find(
          (property) => property.name === 'startX'
        )?.value;
        const startY = updatedComponents[selectedComponentIdx].properties.find(
          (property) => property.name === 'startY'
        )?.value;
        const endX = updatedComponents[selectedComponentIdx].properties.find(
          (property) => property.name === 'endX'
        )?.value;
        const endY = updatedComponents[selectedComponentIdx].properties.find(
          (property) => property.name === 'endY'
        )?.value;
        const width = endX - startX;
        const height = endY - startY;
        updatedComponents[selectedComponentIdx].properties = updatedComponents[
          selectedComponentIdx
        ].properties.map((property) =>
          property.name === 'startX'
            ? { ...property, value: newX }
            : property.name === 'endX'
            ? { ...property, value: newX + width }
            : property.name === 'startY'
            ? { ...property, value: newY }
            : property.name === 'endY'
            ? { ...property, value: newY + height }
            : property
        );
      }
      return updatedComponents;
    });

    // clean up and exit move mode
    holographicRef.current?.remove();
    holographicRef.current = null;
    setIsMoveMode(false);
  };

  useEffect(() => {
    if (isMoveMode) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMoveMode]);

  const handleSaveEdits = (
    componentPropertyValues: Record<string, PropertyValue>
  ) => {
    if (selectedComponentIdx === undefined) return;

    setComponentsData((prev) =>
      prev.map((componentData, idx) =>
        idx === selectedComponentIdx
          ? {
              ...componentData,
              properties: componentData.properties.map((property) => ({
                ...property,
                value: componentPropertyValues[property.name] // || property.value
              }))
            }
          : componentData
      )
    );

    setIsEditing(false);
  };

  return (
    <div className='py-1 mt-4'>
      {/* <p className='text-lg font-semibold'>Components List</p>
      <ul className='space-y-4'>
        {componentsData.map((componentData, idx) => (
          <li
            key={idx}
            className={`text-sm p-2 rounded cursor-pointer ${
              selectedComponentIdx === idx
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
            // onClick={() => setSelectedComponentIdx(idx)}>
            onClick={() => handleSelect(idx)}
          >
            {getComponentDescriber(componentData)}
          </li>
        ))}
      </ul> */}
      {!isNestedVizMode && (
        <div>
          <p className='text-lg font-semibold'>Components List</p>
          <ul className='space-y-4'>
            {componentsData.map((componentData, idx) => (
              <li
                key={idx}
                className={`text-sm p-2 rounded cursor-pointer ${
                  selectedComponentIdx === idx
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                // onClick={() => setSelectedComponentIdx(idx)}>
                onClick={() => handleSelect(idx)}
              >
                {getComponentDescriber(componentData)}
              </li>
            ))}
            {componentsData.length === 0 && (
              <p className='text-sm'>No components to display</p>
            )}
          </ul>
        </div>
      )}

      {selectedComponentIdx !== undefined && !isEditing && (
        <div className='mt-4'>
          <p className='text-base font-semibold'>
            Selected: {componentsData[selectedComponentIdx].type}
          </p>
          <div className='text-sm space-x-2'>
            <button
              className='mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600'
              onClick={handleDelete}
            >
              Delete Component
            </button>
            <button
              className={`mt-2 px-4 py-2 ${
                isMoveMode ? 'bg-blue-500' : 'bg-yellow-500'
              } text-white rounded ${isMoveMode ? '' : 'hover:bg-yellow-600'}`}
              onClick={startMoveMode}
            >
              Move Component
            </button>
            <button
              className='mt-2 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600'
              onClick={() => {
                setIsMoveMode(false);
                setIsNestedVizMode(false);
                setIsEditing(true);
              }}
            >
              Edit Fields
            </button>

            {componentsData[selectedComponentIdx].type === 'grid' && (
              <button
                className='mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
                onClick={() => {
                  setIsMoveMode(false);
                  setIsNestedVizMode(false);
                  setIsNestedVizMode(true);
                }}
              >
                Add nested cell viz.
              </button>
            )}
          </div>
        </div>
      )}

      {selectedComponentIdx !== undefined && isEditing && (
        <ComponentForm
          properties={componentsData[selectedComponentIdx].properties.map(
            (property) => ({
              name: property.name,
              type: property.type,
              required: property.required,
              isStyle: property.isStyle
            })
          )}
          initialValues={Object.fromEntries(
            componentsData[selectedComponentIdx].properties.map((property) => [
              property.name,
              property.value
            ])
          )}
          onSubmit={handleSaveEdits}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {selectedComponentIdx !== undefined && isNestedVizMode && (
        <div>
          <p className='mt-4 text-sm'>Add a nested component</p>
          <AddComponent
            setComponentsData={setComponentsData}
            addToComponentIdxAsNestedComponent={selectedComponentIdx}
            customHeight={35}
            additionalCleanup={() => setIsNestedVizMode(false)}
          />
        </div>
      )}
    </div>
  );
}
