import { NavButton } from '@/sterling-ui';
import { HiCode } from 'react-icons/hi';
import { FaTable } from 'react-icons/fa';
import { BiNetworkChart } from 'react-icons/bi';
import { useSterlingDispatch, useSterlingSelector } from '../../state/hooks';
import { selectAvailableViews, selectMainView } from '../../state/selectors';
import { mainViewChanged } from '../../state/ui/uiSlice';

const ViewButtons = () => {
  const dispatch = useSterlingDispatch();
  const availableViews = useSterlingSelector(selectAvailableViews);
  console.log(availableViews)
  const mainView = useSterlingSelector(selectMainView);
  return (
    <>
      {availableViews.includes('GraphView') && (
        <NavButton
          isActive={mainView === 'GraphView'}
          mr={1}
          leftIcon={<BiNetworkChart />}
          onClick={() => dispatch(mainViewChanged('GraphView'))}
        >
          Graph
        </NavButton>
      )}
      {availableViews.includes('TableView') && (
        <NavButton
          isActive={mainView === 'TableView'}
          mr={1}
          leftIcon={<FaTable />}
          onClick={() => dispatch(mainViewChanged('TableView'))}
        >
          Table
        </NavButton>
      )}
      {availableViews.includes('ScriptView') && (
        <NavButton
          isActive={mainView === 'ScriptView'}
          mr={1}
          leftIcon={<HiCode />}
          onClick={() => dispatch(mainViewChanged('ScriptView'))}
        >
          Script
        </NavButton>
      )}
      {availableViews.includes('JsonView') && (
        <NavButton
          isActive={mainView === 'JsonView'}
          mr={1}
          leftIcon={<HiCode />}
          onClick={() => dispatch(mainViewChanged('JsonView'))}
        >
          Json
        </NavButton>
      )}
    </>
  );
};

export { ViewButtons };
