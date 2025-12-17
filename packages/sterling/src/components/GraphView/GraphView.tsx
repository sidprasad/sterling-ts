import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useCallback, useRef } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../state/hooks';
import { 
  selectActiveDatum, 
  selectCnDSpec, 
  selectTimeIndex,
  selectIsSynthesisActive,
  selectSynthesisStep,
  selectSynthesisExamples
} from '../../state/selectors';
import { addSynthesisExample, updateSynthesisExample } from '../../state/synthesis/synthesisSlice';
import { SpyTialGraph } from './SpyTialGraph';
import { GraphViewHeader } from './GraphViewHeader';

// Type for node positions - matches SpyTialGraph
type NodePositionEntry = { id: string; x: number; y: number };
type NodePositions = NodePositionEntry[] | Record<string, { x: number; y: number }>;

const GraphView = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const cndSpec = useSterlingSelector((state) => 
    datum ? selectCnDSpec(state, datum) : ''
  );
  const timeIndex = useSterlingSelector((state) =>
    datum ? selectTimeIndex(state, datum) : 0
  );
  
  // Synthesis mode state
  const isSynthesisActive = useSterlingSelector(selectIsSynthesisActive);
  const currentStep = useSterlingSelector(selectSynthesisStep);
  const examples = useSterlingSelector(selectSynthesisExamples);
  
  // Get current example for synthesis mode
  const instanceIndex = currentStep - 1;
  const currentExample = examples.find((ex) => ex.instanceIndex === instanceIndex);
  const selectedAtomIds = currentExample?.selectedAtomIds || [];

  // Store node positions for temporal trace continuity
  // We use a ref to avoid re-renders when positions change
  const nodePositionsRef = useRef<NodePositions>({});

  // Callback to update stored positions after each render
  const handleNodePositionsChange = useCallback((positions: NodePositions) => {
    nodePositionsRef.current = positions;
  }, []);
  
  // Handle atom click in synthesis mode
  const handleSynthesisAtomClick = useCallback((atomId: string) => {
    console.log('[GraphView] Atom clicked:', atomId, 'current example:', currentExample);
    
    const newSelectedIds = selectedAtomIds.includes(atomId)
      ? selectedAtomIds.filter(id => id !== atomId)
      : [...selectedAtomIds, atomId];
    
    if (currentExample) {
      // Update existing example
      dispatch(updateSynthesisExample({
        instanceIndex,
        selectedAtomIds: newSelectedIds
      }));
    } else {
      // This shouldn't happen normally, but handle it
      console.warn('[GraphView] No current example found, creating one');
      dispatch(addSynthesisExample({
        instanceIndex,
        selectedAtomIds: newSelectedIds,
        selectedPairs: []
      }));
    }
  }, [dispatch, instanceIndex, currentExample, selectedAtomIds]);

  return (
    <Pane className='grid grid-flow-col divide-x divide-dashed'>
      {datum ? (
        <div className='relative'>
          <Pane>
            <PaneHeader className='border-b'>
              <GraphViewHeader datum={datum} />
            </PaneHeader>
            <PaneBody>
              <SpyTialGraph 
                datum={datum} 
                cndSpec={cndSpec}
                timeIndex={timeIndex}
                priorPositions={nodePositionsRef.current}
                onNodePositionsChange={handleNodePositionsChange}
                synthesisMode={isSynthesisActive && currentStep > 0}
                synthesisSelectedAtoms={selectedAtomIds}
                onSynthesisAtomClick={handleSynthesisAtomClick}
              />
            </PaneBody>
          </Pane>
        </div>
      ) : null}
    </Pane>
  );
};

export { GraphView };
