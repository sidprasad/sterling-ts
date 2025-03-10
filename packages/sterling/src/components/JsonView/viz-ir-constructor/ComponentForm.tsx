import React, { useState } from 'react';
import {
  ComponentProperty,
  ComponentPropertyInput,
  PropertyValue
} from './ComponentProperties';

interface ComponentFormProps {
  properties: ComponentProperty[];
  initialValues?: Record<string, PropertyValue>;
  onSubmit: (values: Record<string, PropertyValue>) => void;
  onCancel: () => void;
  customHeight?: number; // default is 59
}

export default function ComponentForm(props: ComponentFormProps) {
  const { properties, initialValues = {}, onSubmit, onCancel } = props;

  // stateful variable to store the values of the component properties
  const [componentPropertyValues, setComponentPropertyValues] =
    useState<Record<string, PropertyValue>>(initialValues);

  // stateful variable to store whether each property's value is to be conditionally evaluated
  // (it is an array with the i-th element being a boolean corresponding to the i-th property)
  const [propertyIsConditional, setPropertyIsConditional] = useState<
    Array<boolean>
  >(
    properties.map(
      (property, idx) =>
        initialValues[property.name] &&
        initialValues[property.name]['type'] === 'conditional'
    )
  );

  // stateful variable to store any error message text that needs to be displayed
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  // update field values on input change
  const handleInputChange = (name: string, value: PropertyValue) => {
    setComponentPropertyValues((prev) => ({ ...prev, [name]: value }));
  };

  // change the conditional evaluation of a property
  const setConditional = (idx: number, value: boolean) => {
    setPropertyIsConditional((prev) =>
      prev.map((prevValue, i) => {
        if (i === idx) {
          // if (!value) {
          const newValues = { ...componentPropertyValues };
          delete newValues[properties[idx].name];
          setComponentPropertyValues(newValues);
          // }
          return value;
        }
        return prevValue;
      })
    );
  };

  // handle form submission
  const handleSubmit = () => {
    const missingFields = properties.filter(
      // (property) => property.required && !componentPropertyValues[property.name]
      (property) =>
        property.required &&
        (!componentPropertyValues[property.name] ||
          (componentPropertyValues[property.name]['type'] === 'conditional' &&
            (!componentPropertyValues[property.name]['condition'] ||
              !componentPropertyValues[property.name]['then'] ||
              !componentPropertyValues[property.name]['else'])))
    );
    if (missingFields.length > 0) {
      setErrorMessage(
        `Please fill in the required fields: ${missingFields
          .map((field) => field.name)
          .join(', ')}`
      );
    } else {
      setErrorMessage(undefined);
      onSubmit(componentPropertyValues);
    }
  };

  const customHeight = props.customHeight || 59;
  console.log('custom height:', customHeight);

  return (
    <div>
      {/* <div className={`h-[${customHeight}vh] overflow-y-auto pb-1`}> */}
      <div
        className='overflow-y-auto pb-1'
        style={{ height: `${customHeight}vh` }}
      >
        <form className='space-y-4 px-1'>
          {properties.map((property, idx) => (
            <div key={property.name}>
              <ComponentPropertyInput
                componentProperty={property}
                // value={componentPropertyValues[property.name] || ''}
                value={
                  propertyIsConditional[idx]
                    ? componentPropertyValues[property.name] || {
                        type: 'conditional',
                        condition: '',
                        then: '',
                        else: ''
                      }
                    : componentPropertyValues[property.name] || ''
                }
                isConditional={
                  propertyIsConditional[properties.indexOf(property)]
                }
                onChange={(value) => handleInputChange(property.name, value)}
              />
              <div className='flex justify-end space-x-2 pt-1'>
                <input
                  type='checkbox'
                  checked={propertyIsConditional[properties.indexOf(property)]}
                  onChange={(e) =>
                    setConditional(
                      properties.indexOf(property),
                      e.target.checked
                    )
                  }
                />
                <p className='text-xs'>Conditional</p>
              </div>
            </div>
          ))}
        </form>
      </div>

      {errorMessage && (
        <p className='mt-2 text-sm text-red-500'>{errorMessage}</p>
      )}

      <div className='mt-4 flex gap-2'>
        <button
          onClick={handleSubmit}
          className='px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600'
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className='px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400'
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
