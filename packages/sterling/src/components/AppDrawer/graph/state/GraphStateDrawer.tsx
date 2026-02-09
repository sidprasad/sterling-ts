import { PaneTitle } from '@/sterling-ui';
import { Icon } from '@chakra-ui/react';
import { FaFilm } from 'react-icons/fa';
import { useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectDatumIsTrace } from '../../../../state/selectors';
import { TimeSection } from './time/TimeSection';

const GraphStateDrawer = () => {
  const activeDatum = useSterlingSelector(selectActiveDatum);
  const isTrace = useSterlingSelector((state) =>
    activeDatum ? selectDatumIsTrace(state, activeDatum) : false
  );

  if (!activeDatum) return null;
  
  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto'>
      {isTrace ? (
        <TimeSection datum={activeDatum} />
      ) : (
        <div className='p-4 text-sm text-gray-500'>
          <p>Time controls are only available for trace-based instances.</p>
        </div>
      )}
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
