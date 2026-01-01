import { DatumParsed } from '@/sterling-connection';
import { createSelector } from '@reduxjs/toolkit';
import { get } from 'lodash-es';
import {
  GraphDrawerView,
  MainView,
  ScriptDrawerView,
  TableDrawerView,
  UiState
} from './ui';

/**
 * Select the main views available to the user.
 */
function selectAvailableViews(state: UiState): MainView[] {
  return state.availableViews;
}

/**
 * Select the main view.
 */
function selectMainView(state: UiState): MainView {
  return state.mainView;
}

/**
 * Select the graph drawer view.
 */
function selectGraphDrawer(state: UiState): GraphDrawerView | null {
  return state.graphViewDrawer;
}

function selectGraphDrawerThemeRelationExpanded(
  state: UiState,
  datum: DatumParsed<any>,
  relation: string
): boolean {
  return false;
}

/**
 * Select whether a type style is expanded in the graph drawer view associated
 * with a datum.
 */
function selectGraphDrawerThemeTypeExpanded(
  state: UiState,
  datum: DatumParsed<any>,
  type: string
): boolean {
  return false;
}

/**
 * Select the table drawer view.
 */
function selectTableDrawer(state: UiState): TableDrawerView | null {
  return state.tableViewDrawer;
}

/**
 * Select the script drawer view.
 */
function selectScriptDrawer(state: UiState): ScriptDrawerView | null {
  return state.scriptViewDrawer;
}

/**
 * Select the open/closed state of the drawer.
 */
const selectDrawerIsCollapsed = createSelector(
  [selectMainView, selectGraphDrawer, selectTableDrawer, selectScriptDrawer],
  (main, graph, table, script) => {
    switch (main) {
      case 'GraphView':
        return graph === null;
      case 'TableView':
        return table === null;
      case 'ScriptView':
        return script === null;
      default:
        return true;
    }
  }
);

/**
 * Select the drawer view.
 */
const selectDrawerView = createSelector(
  [selectMainView, selectGraphDrawer, selectTableDrawer, selectScriptDrawer],
  (main, graph, table, script) => {
    switch (main) {
      case 'GraphView':
        return graph;
      case 'TableView':
        return table;
      case 'ScriptView':
        return script;
      default:
        return null;
    }
  }
);

/**
 * The generator name that has been selected in the explorer dropdown.
 */
function selectSelectedGenerator(state: UiState): string | undefined {
  return state.selectedGenerator;
}


export default {
  selectAvailableViews,
  selectMainView,
  selectGraphDrawer,
  selectGraphDrawerThemeRelationExpanded,
  selectGraphDrawerThemeTypeExpanded,
  selectTableDrawer,
  selectScriptDrawer,
  selectDrawerIsCollapsed,
  selectDrawerView,
  selectSelectedGenerator
};
