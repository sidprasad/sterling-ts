import { Badge, Box, Button, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import {
  selectSynthesisExamples,
  selectSynthesisInstances,
  selectSynthesisStep
} from '../../../../state/selectors';
import { addSynthesisExample, updateSynthesisExample } from '../../../../state/synthesis/synthesisSlice';

/**
 * Example collection step - user selects atoms in current instance
 */
export const SynthesisExampleStep = () => {
  const dispatch = useSterlingDispatch();
  const currentStep = useSterlingSelector(selectSynthesisStep);
  const examples = useSterlingSelector(selectSynthesisExamples);
  const instances = useSterlingSelector(selectSynthesisInstances);

  const [selectedAtomIds, setSelectedAtomIds] = useState<string[]>([]);

  const instanceIndex = currentStep - 1;
  const instance = instances[instanceIndex];
  const currentExample = examples.find((ex) => ex.instanceIndex === instanceIndex);

  if (!instance) {
    return (
      <div className="p-8 text-center">
        <Text color="gray.500">Loading instance...</Text>
      </div>
    );
  }

  const atoms = instance.getAtoms ? instance.getAtoms() : [];

  const handleAtomClick = (atomId: string) => {
    setSelectedAtomIds((prev) => {
      if (prev.includes(atomId)) {
        return prev.filter((id) => id !== atomId);
      } else {
        return [...prev, atomId];
      }
    });
  };

  const handleConfirm = () => {
    if (currentExample) {
      dispatch(
        updateSynthesisExample({
          instanceIndex,
          selectedAtomIds
        })
      );
    } else {
      dispatch(
        addSynthesisExample({
          instanceIndex,
          selectedAtomIds,
          instanceData: instance
        })
      );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Instructions */}
      <div className="p-4 bg-yellow-50 border-b border-yellow-200">
        <Text fontSize="sm" fontWeight="semibold" mb={1}>
          Instance {instanceIndex + 1} - Select Atoms
        </Text>
        <Text fontSize="xs" color="gray.700">
          Click atoms that should be matched by the selector. Selected: {selectedAtomIds.length}
        </Text>
      </div>

      {/* Atom list for selection */}
      <div className="flex-1 overflow-y-auto p-4">
        <VStack spacing={2} align="stretch">
          {atoms.length === 0 && (
            <Text color="gray.500" textAlign="center">
              No atoms available
            </Text>
          )}
          {atoms.map((atom: any) => {
            const isSelected = selectedAtomIds.includes(atom.id);
            return (
              <Box
                key={atom.id}
                p={3}
                borderWidth={2}
                borderColor={isSelected ? 'blue.500' : 'gray.200'}
                bg={isSelected ? 'blue.50' : 'white'}
                rounded="md"
                cursor="pointer"
                onClick={() => handleAtomClick(atom.id)}
                _hover={{ borderColor: isSelected ? 'blue.600' : 'gray.300' }}
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
                  {isSelected && (
                    <Badge colorScheme="blue" fontSize="xs">
                      Selected
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
          isDisabled={selectedAtomIds.length === 0}
        >
          Confirm Selection ({selectedAtomIds.length} atoms)
        </Button>
      </div>
    </div>
  );
};
