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
          <Text color="gray.600">
            Automatically generate selector expressions from examples. Select atoms or pairs
            across multiple instances, and the synthesizer will find a selector that matches
            your pattern.
          </Text>
        </div>

        <FormControl>
          <FormLabel>Selector Type</FormLabel>
          <RadioGroup value={selectorType} onChange={(val) => setSelectorType(val as SelectorType)}>
            <Stack direction="column" spacing={3}>
              <Radio value="unary">
                <div>
                  <Text fontWeight="semibold">Unary Selector (Atoms)</Text>
                  <Text fontSize="sm" color="gray.600">
                    Select individual atoms. Use for: alignment, colors, sizes, groups
                  </Text>
                  <Text fontSize="xs" color="gray.500" fontFamily="mono" mt={1}>
                    Example: Student & Adult
                  </Text>
                </div>
              </Radio>
              <Radio value="binary">
                <div>
                  <Text fontWeight="semibold">Binary Selector (Pairs/Relations)</Text>
                  <Text fontSize="sm" color="gray.600">
                    Select pairs of atoms. Use for: orientation constraints, edge styling
                  </Text>
                  <Text fontSize="xs" color="gray.500" fontFamily="mono" mt={1}>
                    Example: friend | coworker
                  </Text>
                </div>
              </Radio>
            </Stack>
          </RadioGroup>
          <FormHelperText>
            Choose based on what you want to constrain or style.
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>Number of Instances</FormLabel>
          <NumberInput
            value={numInstances}
            onChange={(_, val) => setNumInstances(val)}
            min={2}
            max={10}
            step={1}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormHelperText>
            How many instances to analyze? More instances = better generalization.
            New instances will be fetched from Forge/Alloy as needed.
          </FormHelperText>
        </FormControl>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            How it works:
          </Text>
          <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
            <li>
              Select {selectorType === 'unary' ? 'atoms' : 'pairs of atoms'} in each instance
              that should match the selector
            </li>
            <li>After collecting all examples, synthesis will find a matching expression</li>
            <li>Review the generated selector and see what it matches</li>
            <li>Accept to insert it into your CnD specification</li>
          </ol>
        </div>

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
