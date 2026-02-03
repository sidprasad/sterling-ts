import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useCallback, useRef, useMemo } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../state/hooks';
import { 
  selectActiveDatum, 
  selectCnDSpec, 
  selectTimeIndex,
  selectIsSynthesisActive,
  selectSynthesisStep,
  selectSelectedProjections,
  selectSelectedTimeIndices,
  selectTraceLength
} from '../../state/selectors';
import { setCurrentDataInstance } from '../../state/synthesis/synthesisSlice';
import { SpyTialGraph } from './SpyTialGraph';
import { MultiProjectionGraph } from './MultiProjectionGraph';
import { MultiTemporalGraph } from './MultiTemporalGraph';
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
  
  // Get trace length for multi-temporal view
  const traceLength = useSterlingSelector((state) =>
    datum ? selectTraceLength(state, datum) : 1
  );
  
  // Selected projections for multi-graph view
  const selectedProjections = useSterlingSelector((state) =>
    datum ? selectSelectedProjections(state, datum) : {}
  );
  
  // Selected time indices for multi-temporal view
  const selectedTimeIndices = useSterlingSelector((state) =>
    datum ? selectSelectedTimeIndices(state, datum) : []
  );
  
  // Calculate total number of graphs to show
  // For now, we use the first projection type that has multiple selections
  const multiProjectionInfo = useMemo(() => {
    console.log('[GraphView] selectedProjections:', selectedProjections);
    for (const [typeId, atoms] of Object.entries(selectedProjections)) {
      console.log(`[GraphView] Checking typeId="${typeId}", atoms:`, atoms);
      if (atoms.length > 1) {
        console.log(`[GraphView] Found multi-projection: typeId="${typeId}" with ${atoms.length} atoms`);
        return { typeId, atoms };
      }
    }
    return null;
  }, [selectedProjections]);
  
  // Check if multi-temporal mode is active (more than 1 time index selected)
  const isMultiTemporalActive = selectedTimeIndices.length > 1;
  
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

  // Determine if we should show multiple graphs
  const shouldShowMultiProjection = 
    multiProjectionInfo !== null &&
    !isSynthesisActive &&
    !isMultiTemporalActive;  // Multi-temporal takes precedence
  
  const shouldShowMultiTemporal =
    isMultiTemporalActive &&
    !isSynthesisActive;  // Don't show multi-temporal in synthesis mode

  // Render the appropriate graph component
  const renderGraphContent = () => {
    if (!datum) return null;
    
    // Multi-temporal view takes precedence
    if (shouldShowMultiTemporal) {
      return (
        <MultiTemporalGraph
          datum={datum}
          cndSpec={cndSpec}
          selectedTimeIndices={selectedTimeIndices}
          traceLength={traceLength}
        />
      );
    }
    
    if (shouldShowMultiProjection && multiProjectionInfo) {
      return (
        <MultiProjectionGraph
          datum={datum}
          cndSpec={cndSpec}
          timeIndex={timeIndex}
          projectionType={multiProjectionInfo.typeId}
          selectedAtoms={multiProjectionInfo.atoms}
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
