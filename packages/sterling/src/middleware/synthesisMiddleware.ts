import { dataReceived } from '@/sterling-connection';
import { Middleware } from '@reduxjs/toolkit';
import { SterlingState } from '../state/store';
import { synthesisInstancesLoaded } from '../state/synthesis/synthesisSlice';

// Declare CndCore global
declare global {
  interface Window {
    CndCore?: any;
  }
}

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
        const newDatum = action.payload;
        
        // Check if this datum is from the expected generator
        const activeDatum = state.data.data.find(d => d.id === state.data.activeDatum);
        if (newDatum.generatorName === activeDatum?.generatorName && window.CndCore) {
          console.log('[SynthesisMiddleware] New instance received, loading it for synthesis');
          
          const parsedDatum = window.CndCore.AlloyInstance.parseAlloyXML(newDatum.data);
          
          if (parsedDatum.instances && parsedDatum.instances.length > 0) {
            const newInstance = new window.CndCore.AlloyDataInstance(
              parsedDatum.instances[0]
            );
            
            // Add to loaded instances
            const updatedInstances = [...synthesis.loadedInstances, newInstance];
            store.dispatch(synthesisInstancesLoaded({ instances: updatedInstances }));
          }
        }
      }
    } catch (err) {
      console.error('[SynthesisMiddleware] Failed to load new instance:', err);
    }
  }

  return result;
};
