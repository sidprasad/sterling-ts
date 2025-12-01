import { dataReceived } from '@/sterling-connection';
import { createSlice } from '@reduxjs/toolkit';
import { GraphsState, newGraphsState } from './graphs';
import reducers from './graphsReducers';
import extraReducers from './graphsExtraReducers';

const initialState: GraphsState = newGraphsState();

const graphsSlice = createSlice({
  name: 'graphs',
  initialState,
  reducers,
  extraReducers: (builder) =>
    builder.addCase(dataReceived, extraReducers.dataReceived)
});

export const {
  asAttributeSet,
  cndSpecSet,
  edgeLabelStyleRemoved,
  edgeLabelStyleSet,
  edgeStyleRemoved,
  edgeStyleSet,
  edgeIndexSet,
  edgeIndexRemoved,
  curveRemoved,
  curveSet,
  graphSpread,
  graphZoomed,
  hiddenRelationAdded,
  nodeLabelStyleRemoved,
  nodeLabelStyleSet,
  nodeLabelPropRemoved,
  nodeLabelPropSet,
  nodesOffset,
  projectionAdded,
  projectionOrderingSet,
  projectionRemoved,
  projectionSet,
  shapeRemoved,
  saveThemeRequested,
  shapeSet,
  shapeStyleRemoved,
  shapeStyleSet,
  themeFileLoaded,
  timeIndexSet
} = graphsSlice.actions;
export default graphsSlice.reducer;
