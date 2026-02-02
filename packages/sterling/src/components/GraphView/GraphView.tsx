import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useCallback, useRef } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../state/hooks';
import { 
  selectActiveDatum, 
  selectCnDSpec, 
  selectTimeIndex,
  selectIsSynthesisActive,
  selectSynthesisStep,
  selectMultiProjectionSettings
} from '../../state/selectors';
import { setCurrentDataInstance } from '../../state/synthesis/synthesisSlice';
import { SpyTialGraph } from './SpyTialGraph';
import { MultiProjectionGraph } from './MultiProjectionGraph';
import type { LayoutState } from './SpyTialGraph';
import { GraphViewHeader } from './GraphViewHeader';

const GraphView = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const cndSpec = useSterlingSelector((state) => 
    datum ? selectCnDSpec(state, datum) : ''
  );
  const timeIndex = useSterlingSelector((state) =>
    datum ? selectTimeIndex(state, datum) : 0
  );
  
  // Multi-projection mode state
  const multiProjectionSettings = useSterlingSelector((state) =>
    datum ? selectMultiProjectionSettings(state, datum) : { enabled: false }
  );
  
  // Synthesis mode state
  const isSynthesisActive = useSterlingSelector(selectIsSynthesisActive);
  const currentStep = useSterlingSelector(selectSynthesisStep);

  // Store layout state for temporal trace continuity
  // We use a ref to avoid re-renders when state changes
  const layoutStateRef = useRef<LayoutState | undefined>(undefined);

  // Callback to update stored layout state after each render
  const handleLayoutStateChange = useCallback((state: LayoutState) => {
    layoutStateRef.current = state;
  }, []);

  // Callback to receive the AlloyDataInstance for synthesis
  const handleDataInstanceCreated = useCallback((dataInstance: any) => {
    if (isSynthesisActive) {
      dispatch(setCurrentDataInstance({ dataInstance }));
    }
  }, [dispatch, isSynthesisActive]);

  // Determine which graph component to render
  const shouldShowMultiProjection = 
    multiProjectionSettings.enabled && 
    multiProjectionSettings.projectionType &&
    !isSynthesisActive;  // Don't show multi-projection in synthesis mode

  // Render the appropriate graph component
  const renderGraphContent = () => {
    if (!datum) return null;
    
    if (shouldShowMultiProjection) {
      return (
        <MultiProjectionGraph
          datum={datum}
          cndSpec={cndSpec}
          timeIndex={timeIndex}
          projectionType={multiProjectionSettings.projectionType!}
        />
      );
    }
    
    return (
      <SpyTialGraph 
        datum={datum} 
        cndSpec={cndSpec}
        timeIndex={timeIndex}
        priorState={layoutStateRef.current}
        onLayoutStateChange={handleLayoutStateChange}
        synthesisMode={isSynthesisActive && currentStep > 0}
        onDataInstanceCreated={handleDataInstanceCreated}
      />
    );
  };

  return (
    <Pane className='grid grid-flow-col divide-x divide-dashed'>
      {datum ? (
        <div className='relative'>
          <Pane>
            <PaneHeader className='border-b'>
              <GraphViewHeader datum={datum} />
            </PaneHeader>
            <PaneBody>
              {renderGraphContent()}
            </PaneBody>
          </Pane>
        </div>
      ) : null}
    </Pane>
  );
};

export { GraphView };
