import { PaneTitle } from '@/sterling-ui';
import { Button, FormControl, FormLabel, Textarea, Input } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

const GraphLayoutDrawer = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const [cndSpecText, setCndSpecText] = useState<string>("");
  
  if (!datum) return null;

  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => selectCnDSpec(state, datum))
  useEffect( () => {
    if(preloadedSpec !== '') setCndSpecText(preloadedSpec)
  }, [preloadedSpec])

  const applyLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Update the CnD spec in Redux state - this will trigger SpyTialGraph to re-render
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
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
          placeholder="Enter CnD layout specification here..."
        />
      </FormControl>
      <Button onClick={applyLayout} mt={4} colorScheme="blue">
        Apply Layout
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
