import { Pane, PaneBody, PaneHeader } from '@/sterling-ui';
import { useSterlingSelector } from '../../state/hooks';
import { selectMainView } from '../../state/selectors';
import { GraphDrawer, GraphDrawerHeader } from './graph/GraphDrawer';
import { ScriptDrawer, ScriptDrawerHeader } from './script/ScriptDrawer';
import { TableDrawer, TableDrawerHeader } from './table/TableDrawer';

const AppDrawer = () => {
  const view = useSterlingSelector(selectMainView);
  return (
    <Pane>
      <PaneHeader className='border-b'>
        {view === 'GraphView' && <GraphDrawerHeader />}
        {view === 'TableView' && <TableDrawerHeader />}
        {view === 'ScriptView' && <ScriptDrawerHeader />}
      </PaneHeader>
      <PaneBody>
        {view === 'GraphView' && <GraphDrawer />}
        {view === 'TableView' && <TableDrawer />}
        {view === 'ScriptView' && <ScriptDrawer />}
      </PaneBody>
    </Pane>
  );
};

export { AppDrawer };
