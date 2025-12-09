import { sterlingConnectionMiddleware } from '@/sterling-connection';
import { configureStore } from '@reduxjs/toolkit';
import { sterlingMiddleware } from '../middleware/sterlingMiddleware';
import uiSlice from './ui/uiSlice';
import dataSlice from './data/dataSlice';
import evaluatorSlice from './evaluator/evaluatorSlice';
import graphsSlice from './graphs/graphsSlice';
import logSlice from './log/logSlice';
import providerSlice from './provider/providerSlice';
import scriptSlice from './script/scriptSlice';
import synthesisSlice from './synthesis/synthesisSlice';

const store = configureStore({
  reducer: {
    data: dataSlice,
    evaluator: evaluatorSlice,
    graphs: graphsSlice,
    log: logSlice,
    provider: providerSlice,
    script: scriptSlice,
    synthesis: synthesisSlice,
    ui: uiSlice
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().prepend(
      sterlingConnectionMiddleware(),
      sterlingMiddleware()
    )
});

export type SterlingState = ReturnType<typeof store.getState>;
export type SterlingDispatch = typeof store.dispatch;
export default store;
