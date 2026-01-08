import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Stack,
  Text,
  VStack
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum } from '../../../../state/selectors';
import {
  enterSynthesisMode,
  synthesisInstancesLoaded,
  synthesisLoadError
} from '../../../../state/synthesis/synthesisSlice';
import { SelectorType } from '../../../../state/synthesis/synthesis';

/**
 * Initial setup step - configure number of instances and selector type
 */
export const SynthesisSetupStep = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const [numInstances, setNumInstances] = useState(3);
  const [selectorType, setSelectorType] = useState<SelectorType>('unary');
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!datum || !window.CndCore) return;

    setIsLoading(true);
    dispatch(enterSynthesisMode({ numInstances, selectorType }));

    try {
      // Start with the current instance
      const alloyXml = datum.data;
      const parsedDatum = window.CndCore.AlloyInstance.parseAlloyXML(alloyXml);

      if (!parsedDatum.instances || parsedDatum.instances.length === 0) {
        throw new Error('No instances found in Alloy XML');
      }

      // Load just the first instance from current datum
      const firstInstance = new window.CndCore.AlloyDataInstance(
        parsedDatum.instances[0]
      );

      console.log('[SynthesisSetup] Starting with first instance');
      dispatch(synthesisInstancesLoaded({ instances: [firstInstance] }));
    } catch (err: any) {
      dispatch(synthesisLoadError({ error: err.message }));
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <VStack spacing={6} align="stretch">
        <div>
          <Text fontSize="2xl" fontWeight="bold" mb={2}>
            Selector Synthesis
          </Text>
        </div>

        <FormControl>
          <FormLabel>Selector Type</FormLabel>
          <RadioGroup value={selectorType} onChange={(val) => setSelectorType(val as SelectorType)}>
            <Stack direction="column" spacing={3}>
              <Radio value="unary">
                <Text fontWeight="semibold">Unary Selector (Atoms)</Text>
              </Radio>
              <Radio value="binary">
                <Text fontWeight="semibold">Binary Selector (Pairs/Relations)</Text>
              </Radio>
            </Stack>
          </RadioGroup>
        </FormControl>

        <FormControl>
          <FormLabel>Number of Instances</FormLabel>
          <NumberInput
            value={numInstances}
            onChange={(_, val) => setNumInstances(val)}
            min={1}
            max={10}
            step={1}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>

        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleStart}
          isLoading={isLoading}
          loadingText="Loading instances..."
          w="full"
        >
          Start Synthesis
        </Button>
      </VStack>
    </div>
  );
};
