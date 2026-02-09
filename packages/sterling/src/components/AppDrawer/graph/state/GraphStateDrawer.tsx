import { PaneTitle } from '@/sterling-ui';
import { Icon } from '@chakra-ui/react';
import { FaFilm } from 'react-icons/fa';
import { useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectDatumIsTrace } from '../../../../state/selectors';
import { TimeSection } from './time/TimeSection';
import { ProjectionSection } from './ProjectionSection';

const GraphStateDrawer = () => {
  const activeDatum = useSterlingSelector(selectActiveDatum);
  const isTrace = useSterlingSelector((state) =>
    activeDatum ? selectDatumIsTrace(state, activeDatum) : false
  );

  if (!activeDatum) return null;
  
  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto'>
      {/* Projection controls - shows when projection directives exist in layout spec */}
      <ProjectionSection datum={activeDatum} />
      
      {/* Time controls - only for trace-based instances */}
      {isTrace && <TimeSection datum={activeDatum} />}
    </div>
  );
};

const GraphStateDrawerHeader = () => {
  return (
    <div className='flex items-center px-2 space-x-2'>
      <Icon as={FaFilm} />
      <PaneTitle>Time</PaneTitle>
    </div>
  );
};

export { GraphStateDrawer, GraphStateDrawerHeader };
