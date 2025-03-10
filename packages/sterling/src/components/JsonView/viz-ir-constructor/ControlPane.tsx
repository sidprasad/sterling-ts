import React, { useState } from 'react';
import {
  ComponentProperty,
  textComponentProperties,
  gridComponentProperties,
  lineComponentProperties,
  arrowComponentProperties
} from './ComponentProperties';
import { ComponentData } from './VizConstructor';
import AddComponent from './AddComponent';
import EditComponent from './EditComponent';
import TextRenamingComponent from './TextRenamingComponent';

export enum ComponentType {
  GRID = 'grid',
  TEXT = 'text',
  LINE = 'line',
  ARROW = 'arrow',
  CONDITIONAL = 'conditional'
}

// fields associated with each type of component
export const componentProperties: Record<string, ComponentProperty[]> = {
  [ComponentType.GRID]: gridComponentProperties, // [], // [TODO]
  [ComponentType.TEXT]: textComponentProperties,
  [ComponentType.LINE]: lineComponentProperties,
  [ComponentType.ARROW]: arrowComponentProperties,
  [ComponentType.CONDITIONAL]: [] // [TODO]
};

enum ControlPaneMode {
  ADD = 'Add component',
  EDIT = 'Edit component',
  CONFIGURE_RENAME = 'Configure text renaming'
}

interface ControlPaneProps {
  // generatedIR: string;
  // setGeneratedIR: React.Dispatch<React.SetStateAction<string>>;
  componentsData: ComponentData[];
  setComponentsData: React.Dispatch<React.SetStateAction<ComponentData[]>>;
  textRenames: [string, string][]; // [original text, replaced text]
  setTextRenames: React.Dispatch<React.SetStateAction<[string, string][]>>;
}

export default function ControlPane(props: ControlPaneProps) {
  const { componentsData, setComponentsData, textRenames, setTextRenames } = props;

  // stateful variable to store the mode in which the user currently is
  const [currentMode, setCurrentMode] = useState<ControlPaneMode>(
    ControlPaneMode.ADD
  );

  const toggleMode = () => {
    setCurrentMode((prevMode) =>
      prevMode === ControlPaneMode.ADD
        ? ControlPaneMode.EDIT
        : ControlPaneMode.ADD
    );
  };

  const toggleTextRenameMode = (currValue: ControlPaneMode) => {
    if (currValue === ControlPaneMode.CONFIGURE_RENAME) {
      setCurrentMode(ControlPaneMode.ADD);
    } else {
      setCurrentMode(ControlPaneMode.CONFIGURE_RENAME);
    }
  }

  return (
    <div className='p-2'>
      <p className='text-center text-lg'>Control Pane</p>

      {/* toggle switch between modes */}
      <div className='flex items-center justify-end mt-4'>
        <span
          className={`text-xs font-semibold ${
            currentMode === ControlPaneMode.ADD
              ? 'text-blue-500'
              : 'text-gray-500'
          }`}
        >
          {ControlPaneMode.ADD}
        </span>
        <label className='relative mx-4'>
          <input
            type='checkbox'
            className='hidden'
            checked={currentMode === ControlPaneMode.EDIT}
            onChange={toggleMode}
          />
          <div className='w-8 h-4 bg-gray-300 rounded-full cursor-pointer relative'>
            <div
              className={`w-4 h-4 bg-blue-500 rounded-full shadow-md transform transition-transform ${
                currentMode === ControlPaneMode.EDIT ? 'translate-x-4' : ''
              }`}
            ></div>
          </div>
        </label>
        <span
          className={`text-xs font-semibold ${
            currentMode === ControlPaneMode.EDIT
              ? 'text-blue-500'
              : 'text-gray-500'
          }`}
        >
          {ControlPaneMode.EDIT}
        </span>
      </div>

      <div>
        <button className={`px-2 py-1 text-sm rounded ${
              currentMode === ControlPaneMode.CONFIGURE_RENAME
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
            onClick={() => toggleTextRenameMode(currentMode)}
        >
          Configure text renaming
        </button>
      </div>

      {/* render the appropriate component */}
      <div className='mt-4'>
        {currentMode === ControlPaneMode.ADD ? (
          <AddComponent setComponentsData={setComponentsData} />
        ) : (
          // <EditComponent
          //   componentsData={componentsData}
          //   setComponentsData={setComponentsData}
          // />
          currentMode === ControlPaneMode.EDIT ? (
            <EditComponent
              componentsData={componentsData}
              setComponentsData={setComponentsData}
            />
          ) : (
            <TextRenamingComponent 
              textRenames={textRenames}
              setTextRenames={setTextRenames}
            />
          )
        )}
      </div>
    </div>
  );

  // return <AddComponent setComponentsData={setComponentsData} />;
}
