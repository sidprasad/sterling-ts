import { Badge, Box, Button, Text, VStack, HStack } from '@chakra-ui/react';
import { useState } from 'react';
import { MdArrowForward } from 'react-icons/md';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import {
  selectSynthesisExamples,
  selectSynthesisInstances,
  selectSynthesisStep
} from '../../../../state/selectors';
import { addSynthesisExample, updateSynthesisExample } from '../../../../state/synthesis/synthesisSlice';

/**
 * Binary example collection - user selects pairs of atoms
 */
export const BinaryExampleStep = () => {
  const dispatch = useSterlingDispatch();
  const currentStep = useSterlingSelector(selectSynthesisStep);
  const examples = useSterlingSelector(selectSynthesisExamples);
  const instances = useSterlingSelector(selectSynthesisInstances);
  const [selectedPairs, setSelectedPairs] = useState<[string, string][]>([]);
  const [selectedFirst, setSelectedFirst] = useState<string | null>(null);

  const instanceIndex = currentStep - 1;
  const instance = instances[instanceIndex];
  const currentExample = examples.find((ex) => ex.instanceIndex === instanceIndex);

  // Early return after all hooks
  if (!instance) {
    return (
      <div className="p-8 text-center">
        <Text color="gray.500">Loading instance...</Text>
      </div>
    );
  }

  const atoms = instance.getAtoms ? instance.getAtoms() : [];

  const handleAtomClick = (atomId: string) => {
    if (selectedFirst === null) {
      // First atom of pair
      setSelectedFirst(atomId);
    } else if (selectedFirst === atomId) {
      // Clicked same atom, deselect
      setSelectedFirst(null);
    } else {
      // Second atom of pair - create the pair
      const newPair: [string, string] = [selectedFirst, atomId];
      setSelectedPairs((prev) => {
        // Check if this pair already exists (in either direction)
        const exists = prev.some(
          ([a, b]) =>
            (a === newPair[0] && b === newPair[1]) || (a === newPair[1] && b === newPair[0])
        );
        if (exists) {
          // Remove it
          return prev.filter(
            ([a, b]) =>
              !(
                (a === newPair[0] && b === newPair[1]) ||
                (a === newPair[1] && b === newPair[0])
              )
          );
        } else {
          // Add it
          return [...prev, newPair];
        }
      });
      setSelectedFirst(null);
    }
  };

  const handleRemovePair = (pair: [string, string]) => {
    setSelectedPairs((prev) =>
      prev.filter(([a, b]) => !(a === pair[0] && b === pair[1]))
    );
  };

  const handleConfirm = () => {
    if (currentExample) {
      dispatch(
        updateSynthesisExample({
          instanceIndex,
          selectedPairs
        })
      );
    } else {
      dispatch(
        addSynthesisExample({
          instanceIndex,
          selectedAtomIds: [], // Empty for binary
          selectedPairs,
          instanceData: instance
        })
      );
    }
  };

  const isPairSelected = (atomId: string) => {
    return selectedPairs.some(([a, b]) => a === atomId || b === atomId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Instructions */}
      <div className="p-4 bg-yellow-50 border-b border-yellow-200">
        <Text fontSize="sm" fontWeight="semibold" mb={1}>
          Instance {instanceIndex + 1} - Select Pairs of Atoms
        </Text>
        <Text fontSize="xs" color="gray.700">
          {selectedFirst ? (
            <>
              First atom: <Badge colorScheme="blue">{selectedFirst}</Badge> - Now select second
              atom
            </>
          ) : (
            <>Click first atom of pair. Selected pairs: {selectedPairs.length}</>
          )}
        </Text>
      </div>

      {/* Selected pairs list */}
      {selectedPairs.length > 0 && (
        <div className="p-4 bg-blue-50 border-b">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Selected Pairs:
          </Text>
          <VStack spacing={2} align="stretch">
            {selectedPairs.map(([a, b], idx) => (
              <HStack
                key={idx}
                p={2}
                bg="white"
                rounded="md"
                borderWidth={1}
                borderColor="blue.300"
                justify="space-between"
              >
                <HStack>
                  <Badge colorScheme="blue">{a}</Badge>
                  <MdArrowForward />
                  <Badge colorScheme="blue">{b}</Badge>
                </HStack>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => handleRemovePair([a, b])}
                >
                  Remove
                </Button>
              </HStack>
            ))}
          </VStack>
        </div>
      )}

      {/* Atom list for selection */}
      <div className="flex-1 overflow-y-auto p-4">
        <VStack spacing={2} align="stretch">
          {atoms.length === 0 && (
            <Text color="gray.500" textAlign="center">
              No atoms available
            </Text>
          )}
          {atoms.map((atom: any) => {
            const isFirstSelected = selectedFirst === atom.id;
            const isInPair = isPairSelected(atom.id);
            return (
              <Box
                key={atom.id}
                p={3}
                borderWidth={2}
                borderColor={
                  isFirstSelected ? 'purple.500' : isInPair ? 'blue.300' : 'gray.200'
                }
                bg={isFirstSelected ? 'purple.50' : isInPair ? 'blue.50' : 'white'}
                rounded="md"
                cursor="pointer"
                onClick={() => handleAtomClick(atom.id)}
                _hover={{
                  borderColor: isFirstSelected ? 'purple.600' : isInPair ? 'blue.400' : 'gray.300'
                }}
                transition="all 0.2s"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Text fontWeight="semibold">{atom.id}</Text>
                    {atom.types && atom.types.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {atom.types.map((type: string) => (
                          <Badge key={type} size="sm" colorScheme="gray">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {isFirstSelected && (
                    <Badge colorScheme="purple" fontSize="xs">
                      First in pair
                    </Badge>
                  )}
                  {isInPair && !isFirstSelected && (
                    <Badge colorScheme="blue" fontSize="xs">
                      In pair
                    </Badge>
                  )}
                </div>
              </Box>
            );
          })}
        </VStack>
      </div>

      {/* Confirm button */}
      <div className="p-4 border-t bg-gray-50">
        <Button
          w="full"
          colorScheme="blue"
          onClick={handleConfirm}
          isDisabled={selectedPairs.length === 0}
        >
          Confirm Selection ({selectedPairs.length} pairs)
        </Button>
      </div>
    </div>
  );
};
