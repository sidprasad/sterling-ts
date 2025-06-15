import { PaneTitle } from '@/sterling-ui';
import { Button, FormControl, FormLabel, Textarea, Input } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

const GraphLayoutDrawer = () => {
  const datum = useSterlingSelector(selectActiveDatum);
  const [cndSpecText, setCndSpecText] = useState<string>("");
  
  if (!datum) return null;

  /** Load from XML (if provided) once. */
    const preloadedSpec = useSterlingSelector((state) => selectCnDSpec(state, datum))
  useEffect( () => {
    if(preloadedSpec !== '') setCndSpecText(preloadedSpec)
  }, [])

  const openInCnd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'http://localhost:3000';
    form.target = '_blank';

    // Create input elements for the form data
    const cndSpecTextInput = document.createElement('input');
    cndSpecTextInput.type = 'hidden';
    cndSpecTextInput.name = 'cope';
    cndSpecTextInput.value = cndSpecText;
    form.appendChild(cndSpecTextInput);

    const alloyDatumInput = document.createElement('input');
    alloyDatumInput.type = 'hidden';
    alloyDatumInput.name = 'alloydatum';
    alloyDatumInput.value = datum.data;
    form.appendChild(alloyDatumInput);

    // Append the form to the body and submit it
    document.body.appendChild(form);
    form.submit();

    // Remove the form from the document
    document.body.removeChild(form);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCndSpecText(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto p-4'>
      <FormControl mt={4}>
        <FormLabel>Upload layout specification file</FormLabel>
        <Input type="file" accept=".cnd" onChange={handleFileUpload} />
      </FormControl>
      <FormControl>
        <FormLabel>Layout Specification</FormLabel>
        <Textarea
          minH="20rem"
          value={cndSpecText}
          onChange={e => setCndSpecText(e.target.value)}
        />
      </FormControl>
      <Button onClick={openInCnd} mt={4}>
        Load layout
      </Button>
    </div>
  );
};

export default GraphLayoutDrawer;

const GraphLayoutDrawerHeader = () => {
  return (
    <div className='w-full flex items-center px-2 space-x-2'>
      <Icon as={RiHammerFill} />
      <PaneTitle>Layout</PaneTitle>
    </div>
  );
};

export { GraphLayoutDrawer, GraphLayoutDrawerHeader };
