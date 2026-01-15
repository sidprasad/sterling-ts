import {
  dataRequested,
  metaRequested,
  metaReceived,
  sterlingConnected
} from '@/sterling-connection';
import { Dispatch, Middleware, MiddlewareAPI } from 'redux';

declare const process: {
  env: {
    SYNTHESIS_ENABLED?: boolean | string;
  };
};

function sterlingMiddleware<S, D extends Dispatch>(): Middleware<{}, S, D> {
  return (api: MiddlewareAPI<D, S>) => (next: Dispatch) => (action: any) => {
    if (sterlingConnected.match(action)) {
      next(action);
      
      // Check if synthesis is enabled - webpack DefinePlugin can pass boolean or string
      const synthesisEnabled = process.env.SYNTHESIS_ENABLED === true || process.env.SYNTHESIS_ENABLED === 'true';
      
      // If synthesis flag is enabled via command line, inject feature flag
      if (synthesisEnabled) {
        console.log('[Sterling] Synthesis mode enabled via command-line flag');
        api.dispatch(metaReceived({
          name: 'forge-synthesis',
          features: ['synthesis']
        }));
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
