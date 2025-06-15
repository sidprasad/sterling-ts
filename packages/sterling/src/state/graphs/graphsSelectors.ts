import { GraphLayout } from '@/alloy-graph';
import { DatumParsed } from '@/sterling-connection';
import { Projection, SterlingTheme } from '@/sterling-theme';
import { Matrix } from 'transformation-matrix';
import { generateLayoutId, GraphsState } from './graphs';

/**
 * Select a graph layout associated with a datum.
 */
function selectGraphLayout(
  state: GraphsState,
  datum: DatumParsed<any>
): GraphLayout {
  const projections = selectProjections(state, datum);
  const layouts = state.layoutsByDatumId[datum.id];
  const layoutId = generateLayoutId(projections);
  return layouts.layoutById[layoutId];
}

function selectHiddenRelations(
  state: GraphsState,
  datum: DatumParsed<any>
): Record<string, string[]> {
  return state.hiddenByDatumId[datum.id];
}

/**
 * Return an array of projections associated with a datum.
 */
function selectProjections(
  state: GraphsState,
  datum: DatumParsed<any>
): Projection[] {
  const theme = selectTheme(state, datum);
  return theme ? theme.projections || [] : [];
}

/**
 * Select the spread matrix associated with a datum.
 */
function selectSpreadMatrix(
  state: GraphsState,
  datum: DatumParsed<any>
): Matrix | undefined {
  return state.matricesByDatumId[datum.id]?.spreadMatrix;
}

/**
 * Select the theme associated with a datum. This is indexed by generator name;
 * if the provider has not given generator names, all data are associated with 
 * the same generator (internally named '').
 */
function selectTheme(
  state: GraphsState,
  datum: DatumParsed<any>
): SterlingTheme {
  return state.themeByGeneratorName[datum.generatorName ?? ''];
}

/**
 * Select the current time index for a datum.
 */
function selectTimeIndex(state: GraphsState, datum: DatumParsed<any>): number {
  return state.timeByDatumId[datum.id] || 0;
}

/**
 * Select the zoom matrix associated with a datum.
 */
function selectZoomMatrix(
  state: GraphsState,
  datum: DatumParsed<any>
): Matrix | undefined {
  return state.matricesByDatumId[datum.id]?.zoomMatrix;
}

/**
 * Select the pre-loaded CnD diagram spec, if any.
 * If no spec is defined, the value with be the empty string.
 */
function selectCnDSpec(
  state: GraphsState,
  datum: DatumParsed<any>
): string {
  return state.cndSpecByDatumId[datum.id]
}


export default {
  selectGraphLayout,
  selectHiddenRelations,
  selectProjections,
  selectSpreadMatrix,
  selectTheme,
  selectTimeIndex,
  selectZoomMatrix,
  selectCnDSpec
};
