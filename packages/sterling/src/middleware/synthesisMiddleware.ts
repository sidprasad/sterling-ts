import { dataReceived } from '@/sterling-connection';
import { Middleware } from '@reduxjs/toolkit';
import { SterlingState } from '../state/store';
import { synthesisInstancesLoaded } from '../state/synthesis/synthesisSlice';
// CndCore types are declared in ../types/cndcore.d.ts

/**
 * Middleware to handle synthesis instance loading from Forge/Alloy
 */
export const synthesisMiddleware: Middleware<{}, SterlingState> = (store) => (next) => (action) => {
  // Let the action pass through first
  const result = next(action);

  // Check if we're in synthesis mode and a new datum arrived
  if (dataReceived.match(action)) {
    try {
      const state = store.getState();
      const synthesis = state.synthesis;

      // Only handle if synthesis is active and we're collecting examples
      if (synthesis.isActive && synthesis.currentStep > 0 && synthesis.currentStep <= synthesis.numInstances) {
        const payload = action.payload;
        
        // Check if there are any new datums in the "enter" array
        if (payload.enter && payload.enter.length > 0 && window.CndCore) {
          const newDatum = payload.enter[payload.enter.length - 1]; // Get the last (newest) datum
          const activeDatum = state.data.datumById[state.data.active || ''];
          
          console.log('[SynthesisMiddleware] New datum received:', {
            newDatumId: newDatum.id,
            activeDatumId: activeDatum?.id,
            generatorMatch: newDatum.generatorName === activeDatum?.generatorName,
            currentStep: synthesis.currentStep,
            numInstances: synthesis.numInstances
          });
          
          // Check if this datum is from the expected generator
          if (newDatum.generatorName === activeDatum?.generatorName) {
            console.log('[SynthesisMiddleware] New instance from same generator, loading for synthesis');
            
            const parsedDatum = window.CndCore.AlloyInstance.parseAlloyXML(newDatum.data);
            
            if (parsedDatum.instances && parsedDatum.instances.length > 0) {
              const newInstance = new window.CndCore.AlloyDataInstance(
                parsedDatum.instances[0]
              );
              
              // Add to loaded instances
              const updatedInstances = [...synthesis.loadedInstances, newInstance];
              console.log('[SynthesisMiddleware] Loaded instance, total now:', updatedInstances.length);
              store.dispatch(synthesisInstancesLoaded({ instances: updatedInstances }));
            }
          }
        }
      }
    } catch (err) {
      console.error('[SynthesisMiddleware] Failed to load new instance:', err);
    }
  }

  return result;
};
