export type GraphView = 'GraphView';
export type TableView = 'TableView';
export type ScriptView = 'ScriptView';
export type MainView = GraphView | TableView | ScriptView;
export type CommonDrawerView = 'explorer' | 'evaluator' | 'log';
export type GraphDrawerView =
  | CommonDrawerView
  | 'state'
  | 'layout'
  | 'settings'
  | 'synthesis';
export type TableDrawerView = CommonDrawerView | 'state' | 'settings';
export type ScriptDrawerView = CommonDrawerView | 'variables' | 'settings';

export interface UiState {
  // the views available to the user
  availableViews: MainView[];

  // the main view state
  mainView: MainView;

  // the drawer states
  graphViewDrawer: GraphDrawerView | null;
  tableViewDrawer: TableDrawerView | null;
  scriptViewDrawer: ScriptDrawerView | null;

  // the graph view drawer states
  // The generator name selected in the explorer dropdown
  selectedGenerator: string | undefined;
}

/**
 * Create a new UI state.
 */
export const newUiState = (initialView?: MainView): UiState => {
  return {
    availableViews: ['GraphView', 'TableView', 'ScriptView'],
    mainView: initialView || 'ScriptView',
    graphViewDrawer: 'explorer',
    tableViewDrawer: null,
    scriptViewDrawer: 'variables',
    selectedGenerator: undefined
  };
};

/**
 * Determine if a string is a common drawer view string.
 */
export function isCommonDrawerView(
  view: string | null
): view is CommonDrawerView {
  return view === 'data' || view === 'evaluator' || view === 'log';
}
