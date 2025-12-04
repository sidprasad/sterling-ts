import { DataJoinParsed, isDatumAlloy } from '@/sterling-connection';
import { PayloadAction } from '@reduxjs/toolkit';
import { castDraft } from 'immer';
import { WritableDraft } from 'immer/dist/types/types-external';
import { identity } from 'transformation-matrix';
import { selectSelectedGenerator } from '../selectors';
import { GraphsState } from './graphs';
import { DEFAULT_THEME } from './graphsDefaults';
import { validateLayouts } from './graphsReducers';

type DraftState = WritableDraft<GraphsState>;

function dataReceived(
  state: DraftState,
  action: PayloadAction<DataJoinParsed>
) {
  const { enter } = action.payload;

  if (enter) {
    // Extract Alloy data, since that's all we know how to use right now
    const alloyData = enter.filter(isDatumAlloy);

    // For each one, generate matrices, initial layout, and theme
    alloyData.forEach((alloyDatum) => {
      const datumId = alloyDatum.id;

      // Generate matrices
      state.matricesByDatumId[alloyDatum.id] = {
        datumId,
        spreadMatrix: identity(),
        zoomMatrix: identity()
      };

      // If there is no theme yet for this generator, populate it with the default. 
      const generator = alloyDatum.generatorName ?? ''
      if(!(generator in state.themeByGeneratorName))
        state.themeByGeneratorName[generator] = castDraft(DEFAULT_THEME);

      // Generate the layout associated with no projection
      state.layoutsByDatumId[datumId] = { datumId, layoutById: {} };
      validateLayouts(state, alloyDatum);

      // Choose the first index as the first instance to display
      state.timeByDatumId[datumId] = 0;

      // If a CnD spec is present, load it into the state.
      // Otherwise, use the default directive to hide disconnected built-ins.
      const DEFAULT_CND_SPEC = 'directives:\n  - flag: hideDisconnectedBuiltIns';
      state.cndSpecByDatumId[datumId] = alloyDatum.parsed.visualizerConfig?.cnd ?? DEFAULT_CND_SPEC;

      // TODO: Remove during refactor
      state.hiddenByDatumId[datumId] = {};
    });
  }
}

export default {
  dataReceived
};
