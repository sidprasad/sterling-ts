import { DatumParsed } from '@/sterling-connection';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { LayoutState, TransformInfo, NodePositionHint } from './SpyTialGraph';

// Use the Window type declaration from SpyTialGraph.tsx - no need to re-declare

interface ProjectionData {
  typeId: string;
  typeName: string;
  atoms: { id: string; label: string }[];
}

interface MultiProjectionGraphProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  /** Index of the current time step in a temporal trace */
  timeIndex?: number;
  /** The type to project over (e.g., "State", "Time") */
  projectionType: string;
}

interface SingleProjectionPaneProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  timeIndex?: number;
  projectionType: string;
  atomId: string;
  atomLabel: string;
  index: number;
}

/**
 * A single pane showing one projection value
 */
const SingleProjectionPane = (props: SingleProjectionPaneProps) => {
  const { datum, cndSpec, timeIndex, projectionType, atomId, atomLabel, index } = props;
  
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

      // Create AlloyDataInstance for the current time index
      const instanceIndex = timeIndex !== undefined ? Math.min(timeIndex, alloyDatum.instances.length - 1) : 0;
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);

      // Create SGraphQueryEvaluator
      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance });

      // Parse layout specification
      let layoutSpec = null;
      try {
        layoutSpec = window.CndCore.parseLayoutSpec(cndSpec || '');
      } catch (parseError: any) {
        console.error(`[Projection ${atomLabel}] Layout spec parse error:`, parseError);
        layoutSpec = window.CndCore.parseLayoutSpec('');
      }

      // Create LayoutInstance
      const ENABLE_ALIGNMENT_EDGES = true;
      const layoutInstance = new window.CndCore.LayoutInstance(
        layoutSpec,
        sgraphEvaluator,
        0,
        ENABLE_ALIGNMENT_EDGES
      );

      // Generate layout with THIS specific projection
      const projections = { [projectionType]: atomId };
      console.log(`[Projection ${atomLabel}] Using projections:`, projections);
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance, projections);

      if (layoutResult.error) {
        console.error(`[Projection ${atomLabel}] Layout generation error:`, layoutResult.error);
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
      console.error(`[Projection ${atomLabel}] Error rendering graph:`, err);
      setError(`Error: ${err.message}`);
      setIsLoading(false);
    }
  }, [datum.data, datum.id, cndSpec, timeIndex, projectionType, atomId, atomLabel]);

  // Create and mount the webcola-cnd-graph element once
  useEffect(() => {
    if (!graphContainerRef.current || isInitializedRef.current) return;

    const graphElement = document.createElement('webcola-cnd-graph') as HTMLElementTagNameMap['webcola-cnd-graph'];
    graphElement.id = `spytial-graph-projection-${index}`;
    graphElement.setAttribute('layoutFormat', 'default');
    graphElement.setAttribute('aria-label', `Graph visualization for ${atomLabel}`);
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
  }, [index, atomLabel]);

  // Load graph when dependencies change
  useEffect(() => {
    if (graphElementRef.current && typeof window.CndCore !== 'undefined') {
      loadGraph();
    }
  }, [datum.data, cndSpec, timeIndex, loadGraph]);

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header with projection label */}
      <div className="px-3 py-2 bg-gray-100 border-b border-gray-200">
        <span className="font-medium text-sm text-gray-700">{atomLabel}</span>
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
 * Component that renders multiple graphs in a grid, one for each projection value
 */
const MultiProjectionGraph = (props: MultiProjectionGraphProps) => {
  const { datum, cndSpec, timeIndex, projectionType } = props;
  
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
  const [isCndCoreReady, setIsCndCoreReady] = useState(typeof window !== 'undefined' && typeof window.CndCore !== 'undefined');
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

  // Extract projection data from the datum
  useEffect(() => {
    if (!isCndCoreReady || !datum.data) return;

    try {
      const alloyXml = datum.data;
      const alloyDatum = window.CndCore.AlloyInstance.parseAlloyXML(alloyXml);
      
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) {
        setError('No instances found in Alloy XML');
        return;
      }

      const instanceIndex = timeIndex !== undefined ? Math.min(timeIndex, alloyDatum.instances.length - 1) : 0;
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);

      // Create evaluator to get projection data
      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance });

      // Parse empty layout spec to get projection data
      const layoutSpec = window.CndCore.parseLayoutSpec('');
      const layoutInstance = new window.CndCore.LayoutInstance(layoutSpec, sgraphEvaluator, 0, true);
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance, {});

      if (layoutResult.projectionData) {
        setProjectionData(layoutResult.projectionData);
      }
    } catch (err: any) {
      console.error('Error extracting projection data:', err);
      setError(`Error: ${err.message}`);
    }
  }, [datum.data, timeIndex, isCndCoreReady]);

  // Find the atoms for the selected projection type
  const projectionAtoms = useMemo(() => {
    const typeData = projectionData.find(p => p.typeId === projectionType || p.typeName === projectionType);
    return typeData?.atoms || [];
  }, [projectionData, projectionType]);

  // Calculate grid columns based on number of projections
  const gridCols = useMemo(() => {
    const count = projectionAtoms.length;
    if (count <= 2) return 2;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    return 4;
  }, [projectionAtoms.length]);

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

  if (projectionAtoms.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="text-gray-600 bg-gray-50 p-4 rounded-lg">
          No atoms found for projection type "{projectionType}". 
          <br />
          <span className="text-sm text-gray-500">
            Available types: {projectionData.map(p => p.typeName || p.typeId).join(', ') || 'None'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="absolute inset-0 overflow-auto bg-gray-100 p-4"
    >
      <div className="mb-4 px-2">
        <h2 className="text-lg font-semibold text-gray-800">
          All Projections over {projectionType}
        </h2>
        <p className="text-sm text-gray-600">
          Showing {projectionAtoms.length} projection{projectionAtoms.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${gridCols}, minmax(300px, 1fr))`,
        }}
      >
        {projectionAtoms.map((atom, index) => (
          <SingleProjectionPane
            key={atom.id}
            datum={datum}
            cndSpec={cndSpec}
            timeIndex={timeIndex}
            projectionType={projectionType}
            atomId={atom.id}
            atomLabel={atom.label || atom.id}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

export { MultiProjectionGraph };
export type { MultiProjectionGraphProps, ProjectionData };
