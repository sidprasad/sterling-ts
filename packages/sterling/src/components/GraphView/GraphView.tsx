import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useSterlingSelector } from '../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../state/selectors';
import { SpyTialGraph } from './SpyTialGraph';
import { GraphViewHeader } from './GraphViewHeader';

const GraphView = () => {
  const datum = useSterlingSelector(selectActiveDatum);
  const cndSpec = useSterlingSelector((state) => 
    datum ? selectCnDSpec(state, datum) : ''
  );

  return (
    <Pane className='grid grid-flow-col divide-x divide-dashed'>
      {datum && (
        <div className='relative'>
          <Pane>
            <PaneHeader className='border-b'>
              <GraphViewHeader datum={datum} />
            </PaneHeader>
            <PaneBody>
              <SpyTialGraph datum={datum} cndSpec={cndSpec} />
            </PaneBody>
          </Pane>
        </div>
      )}
    </Pane>
  );
};

export { GraphView };
