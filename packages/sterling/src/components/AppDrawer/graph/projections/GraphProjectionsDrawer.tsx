import { PaneTitle } from '@/sterling-ui';
import { useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum } from '../../../../state/selectors';
import { ProjectionSection } from '../state/ProjectionSection';

const GraphProjectionsDrawer = () => {
  const activeDatum = useSterlingSelector(selectActiveDatum);

  if (!activeDatum) return null;

  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto'>
      <ProjectionSection datum={activeDatum} />
    </div>
  );
};

const GraphProjectionsDrawerHeader = () => {
  return (
    <div className='flex items-center px-2 space-x-2'>
      <PaneTitle>Projections</PaneTitle>
    </div>
  );
};

export { GraphProjectionsDrawer, GraphProjectionsDrawerHeader };
