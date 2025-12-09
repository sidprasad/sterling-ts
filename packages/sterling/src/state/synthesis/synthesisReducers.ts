import { WritableDraft } from 'immer/dist/types/types-external';
import { SynthesisExample, SynthesisResult, SynthesisState } from './synthesis';

type DraftState = WritableDraft<SynthesisState>;

/**
 * Enter synthesis mode
 */
function enterSynthesisMode(
  state: DraftState,
  action: { payload: { numInstances: number } }
) {
  state.isActive = true;
  state.numInstances = action.payload.numInstances;
  state.currentStep = 0;
  state.examples = [];
  state.loadedInstances = [];
  state.result = null;
  state.error = null;
  state.isLoading = true; // Will load instances
}

/**
 * Exit synthesis mode
 */
function exitSynthesisMode(state: DraftState) {
  state.isActive = false;
  state.currentStep = 0;
  state.examples = [];
  state.loadedInstances = [];
  state.result = null;
  state.error = null;
  state.isLoading = false;
}

/**
 * Set loaded instances
 */
function synthesisInstancesLoaded(
  state: DraftState,
  action: { payload: { instances: any[] } }
) {
  state.loadedInstances = action.payload.instances;
  state.isLoading = false;
  state.currentStep = 1; // Move to first example collection
}

/**
 * Set loading error
 */
function synthesisLoadError(
  state: DraftState,
  action: { payload: { error: string } }
) {
  state.error = action.payload.error;
  state.isLoading = false;
}

/**
 * Add an example from user selection
 */
function addSynthesisExample(
  state: DraftState,
  action: { payload: SynthesisExample }
) {
  state.examples.push(action.payload);
  
  // Move to next step if we haven't collected all examples yet
  if (state.currentStep <= state.numInstances) {
    state.currentStep++;
  }
}

/**
 * Update the current example (user changed selection)
 */
function updateSynthesisExample(
  state: DraftState,
  action: { payload: { instanceIndex: number; selectedAtomIds: string[] } }
) {
  const { instanceIndex, selectedAtomIds } = action.payload;
  const exampleIndex = state.examples.findIndex(
    (ex) => ex.instanceIndex === instanceIndex
  );
  
  if (exampleIndex >= 0) {
    state.examples[exampleIndex].selectedAtomIds = selectedAtomIds;
  }
}

/**
 * Go to previous step
 */
function synthesisStepBack(state: DraftState) {
  if (state.currentStep > 1) {
    state.currentStep--;
    // Remove last example if going back
    if (state.examples.length >= state.currentStep) {
      state.examples.pop();
    }
  }
}

/**
 * Set synthesis result
 */
function setSynthesisResult(
  state: DraftState,
  action: { payload: SynthesisResult }
) {
  state.result = action.payload;
  state.error = null;
  state.isLoading = false;
}

/**
 * Set synthesis error
 */
function setSynthesisError(
  state: DraftState,
  action: { payload: { error: string } }
) {
  state.error = action.payload.error;
  state.result = null;
  state.isLoading = false;
}

/**
 * Start synthesis computation
 */
function startSynthesis(state: DraftState) {
  state.isLoading = true;
  state.error = null;
}

export default {
  enterSynthesisMode,
  exitSynthesisMode,
  synthesisInstancesLoaded,
  synthesisLoadError,
  addSynthesisExample,
  updateSynthesisExample,
  synthesisStepBack,
  setSynthesisResult,
  setSynthesisError,
  startSynthesis
};
