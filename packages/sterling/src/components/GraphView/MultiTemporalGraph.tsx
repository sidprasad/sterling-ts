import { DatumParsed } from '@/sterling-connection';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

interface MultiTemporalGraphProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  /** Array of time indices to display */
  selectedTimeIndices: number[];
  /** Total number of time steps in the trace */
  traceLength: number;
}

interface SingleTemporalPaneProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  timeIndex: number;
  traceLength: number;
  index: number;
}

/**
 * A single pane showing one time step
 */
const SingleTemporalPane = (props: SingleTemporalPaneProps) => {
  const { datum, cndSpec, timeIndex, traceLength, index } = props;
  
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphElementRef = useRef<HTMLElementTagNameMap['webcola-cnd-graph'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  const layoutRef = useRef<any>(null);

  /**
   * Load and render the graph using SpyTial/CnD
   */
  const loadGraph = useCallback(async () => {
    if (!graphElementRef.current) return;
    
    setIsLoading(true);
    setError(null);

    if (typeof window.CndCore === 'undefined') {
      setError('CnD Core library is not available.');
      setIsLoading(false);
      return;
    }

    try {
      const alloyXml = datum.data;
      if (!alloyXml) {
        throw new Error('No Alloy XML data available in datum');
      }

      // Parse Alloy XML
      const alloyDatum = window.CndCore.AlloyInstance.parseAlloyXML(alloyXml);
      
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) {
        throw new Error('No instances found in Alloy XML');
      }

      // Create AlloyDataInstance for THIS specific time index
      const instanceIndex = Math.min(timeIndex, alloyDatum.instances.length - 1);
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);

      // Create SGraphQueryEvaluator
      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance });

      // Parse layout specification
      let layoutSpec = null;
      try {
        layoutSpec = window.CndCore.parseLayoutSpec(cndSpec || '');
      } catch (parseError: any) {
        console.error(`[Time ${timeIndex}] Layout spec parse error:`, parseError);
        layoutSpec = window.CndCore.parseLayoutSpec('');
      }

      // Create LayoutInstance
      const ENABLE_ALIGNMENT_EDGES = true;
      const layoutInstance = new window.CndCore.LayoutInstance(
        layoutSpec,
        sgraphEvaluator,
        instanceIndex, // Use the time index as instance number
        ENABLE_ALIGNMENT_EDGES
      );

      // Generate layout (no projections for temporal view - we're using actual time indices)
      const projections = window.currentProjections || {};
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance, projections);

      if (layoutResult.error) {
        console.error(`[Time ${timeIndex}] Layout generation error:`, layoutResult.error);
        setError(`Layout error: ${layoutResult.error.message}`);
      }

      // Store the layout
      layoutRef.current = layoutResult.layout;

      // Render the layout
      if (graphElementRef.current && layoutResult.layout) {
        await graphElementRef.current.renderLayout(layoutResult.layout);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error(`[Time ${timeIndex}] Error rendering graph:`, err);
      setError(`Error: ${err.message}`);
      setIsLoading(false);
    }
  }, [datum.data, datum.id, cndSpec, timeIndex]);

  // Create and mount the webcola-cnd-graph element once
  useEffect(() => {
    if (!graphContainerRef.current || isInitializedRef.current) return;

    const graphElement = document.createElement('webcola-cnd-graph') as HTMLElementTagNameMap['webcola-cnd-graph'];
    graphElement.id = `spytial-graph-temporal-${index}`;
    graphElement.setAttribute('layoutFormat', 'default');
    graphElement.setAttribute('aria-label', `Graph visualization for time step ${timeIndex + 1}`);
    graphElement.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 200px;
      display: block;
    `;

    graphContainerRef.current.appendChild(graphElement);
    graphElementRef.current = graphElement;
    isInitializedRef.current = true;

    return () => {
      if (graphElementRef.current) {
        if (graphElementRef.current.clear) {
          graphElementRef.current.clear();
        }
        if (graphContainerRef.current && graphElementRef.current.parentNode === graphContainerRef.current) {
          graphContainerRef.current.removeChild(graphElementRef.current);
        }
      }
      graphElementRef.current = null;
      layoutRef.current = null;
      isInitializedRef.current = false;
    };
  }, [index, timeIndex]);

  // Load graph when dependencies change
  useEffect(() => {
    if (graphElementRef.current && typeof window.CndCore !== 'undefined') {
      loadGraph();
    }
  }, [datum.data, cndSpec, timeIndex, loadGraph]);

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header with time step label */}
      <div className="px-3 py-2 bg-blue-50 border-b border-blue-200">
        <span className="font-medium text-sm text-blue-800">
          State {timeIndex + 1} of {traceLength}
        </span>
      </div>
      
      {/* Graph container */}
      <div 
        ref={graphContainerRef}
        className="flex-1 relative"
        style={{ 
          minHeight: '250px',
          background: 'white'
        }}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
          style={{ zIndex: 10, pointerEvents: 'none' }}
        >
          <div className="text-gray-600 text-sm">Loading...</div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200 text-red-600 text-xs">
          {error}
        </div>
      )}
    </div>
  );
};

/**
 * Component that renders multiple graphs in a grid, one for each selected time step
 */
const MultiTemporalGraph = (props: MultiTemporalGraphProps) => {
  const { datum, cndSpec, selectedTimeIndices, traceLength } = props;
  
  const [isCndCoreReady, setIsCndCoreReady] = useState(
    typeof window !== 'undefined' && typeof window.CndCore !== 'undefined'
  );
  const [error, setError] = useState<string | null>(null);

  // Poll for CndCore availability
  useEffect(() => {
    if (isCndCoreReady) return;

    const checkCndCore = () => {
      if (typeof window !== 'undefined' && window.CndCore && typeof window.CndCore.parseLayoutSpec === 'function') {
        setIsCndCoreReady(true);
        return true;
      }
      return false;
    };

    if (checkCndCore()) return;

    let attempts = 0;
    const maxAttempts = 100;
    const intervalId = setInterval(() => {
      attempts++;
      if (checkCndCore() || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && !isCndCoreReady) {
          setError('CnD Core library failed to load.');
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isCndCoreReady]);

  // Calculate grid columns based on number of time steps
  const gridCols = useMemo(() => {
    const count = selectedTimeIndices.length;
    if (count <= 2) return count;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  }, [selectedTimeIndices.length]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  if (!isCndCoreReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading CnD Core...</div>
      </div>
    );
  }

  if (selectedTimeIndices.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-gray-600 bg-gray-50 p-4 rounded-lg">
          No time steps selected.
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-auto bg-gray-100 p-4">
      <div className="mb-4 px-2">
        <h2 className="text-lg font-semibold text-gray-800">
          Temporal Comparison
        </h2>
        <p className="text-sm text-gray-600">
          Showing {selectedTimeIndices.length} time step{selectedTimeIndices.length !== 1 ? 's' : ''} of {traceLength}
        </p>
      </div>
      
      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${gridCols}, minmax(300px, 1fr))`,
        }}
      >
        {selectedTimeIndices.map((timeIdx, index) => (
          <SingleTemporalPane
            key={`time-${timeIdx}`}
            datum={datum}
            cndSpec={cndSpec}
            timeIndex={timeIdx}
            traceLength={traceLength}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export { MultiTemporalGraph };
export type { MultiTemporalGraphProps };
