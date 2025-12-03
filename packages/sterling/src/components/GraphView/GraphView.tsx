import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useCallback, useRef } from 'react';
import { useSterlingSelector } from '../../state/hooks';
import { selectActiveDatum, selectCnDSpec, selectTimeIndex } from '../../state/selectors';
import { SpyTialGraph } from './SpyTialGraph';
import { GraphViewHeader } from './GraphViewHeader';

// Type for node positions - matches SpyTialGraph
type NodePositionEntry = { id: string; x: number; y: number };
type NodePositions = NodePositionEntry[] | Record<string, { x: number; y: number }>;

const GraphView = () => {
  const datum = useSterlingSelector(selectActiveDatum);
  const cndSpec = useSterlingSelector((state) => 
    datum ? selectCnDSpec(state, datum) : ''
  );
  const timeIndex = useSterlingSelector((state) =>
    datum ? selectTimeIndex(state, datum) : 0
  );

  // Store node positions for temporal trace continuity
  // We use a ref to avoid re-renders when positions change
  const nodePositionsRef = useRef<NodePositions>({});

  // Callback to update stored positions after each render
  const handleNodePositionsChange = useCallback((positions: NodePositions) => {
    nodePositionsRef.current = positions;
  }, []);

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
              />
            </PaneBody>
          </Pane>
        </div>
      ) : null}
    </Pane>
  );
};

export { GraphView };
