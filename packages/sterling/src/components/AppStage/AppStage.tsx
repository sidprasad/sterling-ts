import { Pane } from '@/sterling-ui';
import { useSterlingSelector } from '../../state/hooks';
import { selectMainView } from '../../state/selectors';
import { GraphView } from '../GraphView/GraphView';
import { ScriptView } from '../ScriptView/ScriptView';
import { TableView } from '../TableView/TableView';
import { JsonView } from '../JsonView/JsonView';

const AppStage = () => {
  const mainView = useSterlingSelector(selectMainView);
  return (
    <Pane>
      {mainView === 'GraphView' && <GraphView />}
      {mainView === 'TableView' && <TableView />}
      {mainView === 'ScriptView' && <ScriptView />}
      {/* TODO: change the name to something better :-) */}
      {mainView === 'JsonView' && <JsonView />}
    </Pane>
  );
};

export { AppStage };
