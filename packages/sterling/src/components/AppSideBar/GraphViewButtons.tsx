import { SideBarButton } from '@/sterling-ui';
import { FaFilm } from 'react-icons/fa';
import { IoSettingsOutline } from 'react-icons/io5';
import { MdScience, MdWorkspacesOutline } from 'react-icons/md';
import { useSterlingDispatch, useSterlingSelector } from '../../state/hooks';
import { selectGraphDrawer, selectIsSynthesisEnabled, selectMainView } from '../../state/selectors';
import { graphDrawerViewChanged } from '../../state/ui/uiSlice';

const GraphViewButtons = () => {
  const dispatch = useSterlingDispatch();
  const view = useSterlingSelector(selectMainView);
  const drawer = useSterlingSelector(selectGraphDrawer);
  const isSynthesisEnabled = useSterlingSelector(selectIsSynthesisEnabled);
  
  return (
    <>
      <SideBarButton
        text='Time'
        rightIcon={<FaFilm />}
        isActive={view === 'GraphView' && drawer === 'state'}
        onClick={() => dispatch(graphDrawerViewChanged('state'))}
      />
      <SideBarButton
        text='Layout'
        rightIcon={<MdWorkspacesOutline />}
        isActive={view === 'GraphView' && drawer === 'layout'}
        onClick={() => dispatch(graphDrawerViewChanged('layout'))}
      />
      {isSynthesisEnabled && (
        <SideBarButton
          text='Synthesis'
          rightIcon={<MdScience />}
          isActive={view === 'GraphView' && drawer === 'synthesis'}
          onClick={() => dispatch(graphDrawerViewChanged('synthesis'))}
        />
      )}
      <SideBarButton
        text='Settings'
        rightIcon={<IoSettingsOutline />}
        isActive={view === 'GraphView' && drawer === 'settings'}
        onClick={() => dispatch(graphDrawerViewChanged('settings'))}
      />
    </>
  );
};

export { GraphViewButtons };
