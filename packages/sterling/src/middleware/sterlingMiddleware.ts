import {
  dataRequested,
  metaRequested,
  metaReceived,
  sterlingConnected
} from '@/sterling-connection';
import { Dispatch, Middleware, MiddlewareAPI } from 'redux';

declare const process: {
  env: {
    SYNTHESIS_ENABLED?: boolean;
  };
};

function sterlingMiddleware<S, D extends Dispatch>(): Middleware<{}, S, D> {
  return (api: MiddlewareAPI<D, S>) => (next: Dispatch) => (action: any) => {
    if (sterlingConnected.match(action)) {
      next(action);
      
      // Debug: Log the actual value and type
      console.log('[Sterling] SYNTHESIS_ENABLED value:', process.env.SYNTHESIS_ENABLED, 'type:', typeof process.env.SYNTHESIS_ENABLED);
      
      // If synthesis flag is enabled via command line, inject feature flag
      if (process.env.SYNTHESIS_ENABLED === true) {
        console.log('[Sterling] Synthesis mode enabled via command-line flag');
        api.dispatch(metaReceived({
          name: 'forge-synthesis',
          features: ['synthesis']
        }));
      } else {
        console.log('[Sterling] Synthesis mode NOT enabled. Flag is:', process.env.SYNTHESIS_ENABLED);
      }
      
      api.dispatch(metaRequested());
      // This data request may respond with an instance datum. If it doesn't,
      // that means the provider uses generator names to index multiple instance 
      // streams, in which case Sterling should query one by name using "click".
      api.dispatch(dataRequested());
    } else {
      return next(action);
    }
  };
}

export { sterlingMiddleware };
