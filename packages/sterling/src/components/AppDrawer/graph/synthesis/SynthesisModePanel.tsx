import { Button, ButtonGroup, Icon, Progress, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { MdArrowBack, MdArrowForward, MdClose, MdScience } from 'react-icons/md';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import {
  selectActiveDatum,
  selectCanSynthesize,
  selectIsSynthesisActive,
  selectSynthesisError,
  selectSynthesisExamples,
  selectSynthesisInstances,
  selectSynthesisLoading,
  selectSynthesisNumInstances,
  selectSynthesisResult,
  selectSynthesisSelectorType,
  selectSynthesisStep
} from '../../../../state/selectors';
import {
  addSynthesisExample,
  enterSynthesisMode,
  exitSynthesisMode,
  setSynthesisError,
  setSynthesisResult,
  startSynthesis,
  synthesisInstancesLoaded,
  synthesisLoadError,
  synthesisStepBack,
  updateSynthesisExample
} from '../../../../state/synthesis/synthesisSlice';
import { SynthesisSetupStep } from './SynthesisSetupStep';
import { SynthesisExampleStep } from './SynthesisExampleStep';
import { BinaryExampleStep } from './BinaryExampleStep';
import { SynthesisResultStep } from './SynthesisResultStep';
import { PaneTitle } from '@/sterling-ui';

/**
 * Main synthesis mode panel - orchestrates the workflow
 */
const SynthesisModePanel = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const isActive = useSterlingSelector(selectIsSynthesisActive);
  const selectorType = useSterlingSelector(selectSynthesisSelectorType);
  const currentStep = useSterlingSelector(selectSynthesisStep);
  const numInstances = useSterlingSelector(selectSynthesisNumInstances);
  const examples = useSterlingSelector(selectSynthesisExamples);
  const instances = useSterlingSelector(selectSynthesisInstances);
  const result = useSterlingSelector(selectSynthesisResult);
  const error = useSterlingSelector(selectSynthesisError);
  const isLoading = useSterlingSelector(selectSynthesisLoading);
  const canSynthesize = useSterlingSelector(selectCanSynthesize); // && false; // Disable synthesis for now (UNCOMMENT TO ALLOW)

  const handleExit = () => {
    dispatch(exitSynthesisMode());
  };

  const handleStartSynthesis = async () => {
    if (!datum || !window.CndCore) return;

    dispatch(startSynthesis());

    try {
      if (selectorType === 'unary') {
        // Unary selector synthesis
        const result = window.CndCore.synthesizeAtomSelectorWithExplanation(
          examples.map((ex) => ({
            atomIds: ex.selectedAtomIds,
            instanceData: instances[ex.instanceIndex]
          })),
          3 // maxDepth
        );

        if (!result) {
          throw new Error('Synthesis failed - no selector found');
        }

        // Evaluate against all instances to show matches
        const matchesByInstance = instances.map((inst, idx) => {
          const evaluator = new window.CndCore.SGraphQueryEvaluator();
          evaluator.initialize({ sourceData: inst }); // Pass AlloyDataInstance
          const evalResult = evaluator.evaluate(result.expression);
          return {
            instanceIndex: idx,
            matchedAtomIds: evalResult.selectedAtoms ? evalResult.selectedAtoms() : []
          };
        });

        dispatch(
          setSynthesisResult({
            expression: result.expression,
            explanation: result.explanation || null,
            matchesByInstance,
            pairMatchesByInstance: []
          })
        );
      } else {
        // Binary selector synthesis
        const result = window.CndCore.synthesizeBinarySelector(
          examples.map((ex) => ({
            pairs: ex.selectedPairs,
            instanceData: instances[ex.instanceIndex]
          })),
          3 // maxDepth
        );

        if (!result) {
          throw new Error('Synthesis failed - no binary selector found');
        }

        // Evaluate against all instances
        const pairMatchesByInstance = instances.map((inst, idx) => {
          const evaluator = new window.CndCore.SGraphQueryEvaluator();
          evaluator.initialize({ sourceData: inst }); // Pass AlloyDataInstance
          const evalResult = evaluator.evaluate(result.expression);
          const tuples = evalResult.selectedTuplesAll ? evalResult.selectedTuplesAll() : [];
          return {
            instanceIndex: idx,
            matchedPairs: tuples.map((t: string[]) => [t[0], t[1]] as [string, string])
          };
        });

        dispatch(
          setSynthesisResult({
            expression: result.expression,
            explanation: null,
            matchesByInstance: [],
            pairMatchesByInstance
          })
        );
      }
    } catch (err: any) {
      dispatch(setSynthesisError({ error: err.message || 'Synthesis failed' }));
    }
  };

  // Early return AFTER all hooks
  if (!isActive) return null;

  const progress = currentStep === 0 ? 0 : ((currentStep - 1) / numInstances) * 100;
  const isSetupStep = currentStep === 0;
  const isCollectionStep = currentStep >= 1 && currentStep <= numInstances;
  const isResultStep = currentStep > numInstances || result !== null;

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b bg-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon as={MdScience} boxSize={6} color="blue.600" />
          <div>
            <PaneTitle>Selector Synthesis</PaneTitle>
            <Text fontSize="xs" color="gray.600">
              {isSetupStep && 'Configure synthesis parameters'}
              {isCollectionStep && `Collecting examples (${examples.length}/${numInstances})`}
              {isResultStep && 'Review synthesized selector'}
            </Text>
          </div>
        </div>
        <Button
          size="sm"
          leftIcon={<MdClose />}
          onClick={handleExit}
          variant="ghost"
        >
          Exit
        </Button>
      </div>

      {/* Progress bar */}
      {!isSetupStep && !isResultStep && (
        <Progress value={progress} size="xs" colorScheme="blue" />
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        {isSetupStep && <SynthesisSetupStep />}
        {isCollectionStep && (selectorType === 'unary' ? <SynthesisExampleStep /> : <BinaryExampleStep />)}
        {isResultStep && <SynthesisResultStep />}
      </div>

      {/* Footer actions */}
      {!isSetupStep && !isResultStep && (
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <Button
            size="sm"
            leftIcon={<MdArrowBack />}
            onClick={() => dispatch(synthesisStepBack())}
            isDisabled={currentStep <= 1}
            variant="outline"
          >
            Previous
          </Button>

          <Text fontSize="sm" color="gray.600">
            Instance {currentStep} of {numInstances}
          </Text>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default SynthesisModePanel;

const SynthesisModePanelHeader = () => {
  return (
    <div className="w-full flex items-center px-2 space-x-2">
      <Icon as={MdScience} />
      <PaneTitle>Synthesis</PaneTitle>
    </div>
  );
};

export { SynthesisModePanel, SynthesisModePanelHeader };
