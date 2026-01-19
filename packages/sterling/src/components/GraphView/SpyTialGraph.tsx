import { DatumParsed } from '@/sterling-connection';
import { useCallback, useEffect, useRef, useState } from 'react';

// LayoutState bundles positions and transform together for temporal continuity
// These types match the spytial-core webcola-cnd-graph component API
export interface TransformInfo {
  k: number;  // scale
  x: number;  // translate x
  y: number;  // translate y
}

export type NodePositionHint = { id: string; x: number; y: number };

export interface LayoutState {
  positions: NodePositionHint[];
  transform: TransformInfo;
}

// Declare the global CndCore type
declare global {
  interface Window {
    CndCore: {
      AlloyInstance: {
        parseAlloyXML: (xml: string) => any;
      };
      AlloyDataInstance: new (instance: any) => any;
      SGraphQueryEvaluator: new () => {
        initialize: (context: { sourceData: any }) => void;
        evaluate: (expression: string, config?: any) => any;
      };
      parseLayoutSpec: (spec: string) => any;
      LayoutInstance: new (
        layoutSpec: any,
        evaluator: any,
        instanceNumber: number,
        enableAlignmentEdges: boolean
      ) => {
        generateLayout: (dataInstance: any, projections: object) => {
          layout: any;
          projectionData?: any[];
          error?: {
            message: string;
            errorMessages?: any;
            overlappingNodes?: any;
          };
        };
      };
      // Synthesis API
      synthesizeAtomSelector: (
        examples: { atomIds: string[]; instanceData: any }[],
        maxDepth?: number
      ) => { expression: string; matchesByInstance: any[] } | null;
      synthesizeAtomSelectorWithExplanation: (
        examples: { atomIds: string[]; instanceData: any }[],
        maxDepth?: number
      ) => {
        expression: string;
        explanation: string;
        matchesByInstance: { instanceIndex: number; matchedAtomIds: string[] }[];
      } | null;
      synthesizeBinarySelector: (
        examples: { pairs: [string, string][]; instanceData: any }[],
        maxDepth?: number
      ) => {
        expression: string;
        pairMatchesByInstance: { instanceIndex: number; matchedPairs: [string, string][] }[];
      } | null;
      isSynthesisSupported: (evaluator: any) => boolean;
    };
    mountCndLayoutInterface?: (elementId?: string, options?: any) => void;
    mountErrorMessageModal?: (elementId?: string) => void;
    showParseError?: (message: string, context: string) => void;
    showGeneralError?: (message: string) => void;
    showPositionalError?: (errorMessages: any) => void;
    showGroupOverlapError?: (message: string) => void;
    clearAllErrors?: () => void;
    // Projection control functions
    updateProjectionData?: (projectionData: any[]) => void;
    currentProjections?: Record<string, string>;
  }
}

// Extend HTMLElementTagNameMap for the webcola-cnd-graph custom element
declare global {
  interface HTMLElementTagNameMap {
    'webcola-cnd-graph': HTMLElement & {
      renderLayout: (layout: any, options?: { priorState?: LayoutState }) => Promise<void>;
      getLayoutState?: () => LayoutState;
      addToolbarControl?: (element: HTMLElement) => void;
      clear?: () => void;
      // Node highlighting for synthesis mode
      clearNodeHighlights?: () => void;
      highlightNodes?: (nodeIds: string[], color?: string) => boolean;
      highlightNodePairs?: (pairs: [string, string][], options?: { showBadges?: boolean }) => boolean;
    };
  }
}

interface SpyTialGraphProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  /** Index of the current time step in a temporal trace */
  timeIndex?: number;
  /** Callback to share layout state with parent for cross-frame continuity */
  onLayoutStateChange?: (state: LayoutState) => void;
  /** Prior layout state from previous frame for temporal continuity */
  priorState?: LayoutState;
  onCndSpecChange?: (spec: string) => void;
  /** Synthesis mode: enable node selection */
  synthesisMode?: boolean;
  /** Callback to receive the AlloyDataInstance when it's created (for synthesis) */
  onDataInstanceCreated?: (dataInstance: any) => void;
}

const SpyTialGraph = (props: SpyTialGraphProps) => {
  const { 
    datum, 
    cndSpec, 
    timeIndex, 
    priorState, 
    onLayoutStateChange,
    synthesisMode = false,
    onDataInstanceCreated
  } = props;
  // Separate ref for the graph container - this div is NOT managed by React's children
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphElementRef = useRef<HTMLElementTagNameMap['webcola-cnd-graph'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCndCoreReady, setIsCndCoreReady] = useState(typeof window.CndCore !== 'undefined');
  const layoutRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  
  // Use a ref to store the latest onLayoutStateChange callback
  // This avoids stale closure issues in event listeners
  const onLayoutStateChangeRef = useRef(onLayoutStateChange);
  onLayoutStateChangeRef.current = onLayoutStateChange;

  // Poll for CndCore availability if not ready yet
  useEffect(() => {
    if (isCndCoreReady) return;

    const checkCndCore = () => {
      if (window.CndCore?.parseLayoutSpec) {
        console.log('CndCore is now available');
        setIsCndCoreReady(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkCndCore()) return;

    // Poll every 100ms for up to 10 seconds
    let attempts = 0;
    const maxAttempts = 100;
    const intervalId = setInterval(() => {
      attempts++;
      if (checkCndCore() || attempts >= maxAttempts) {
        clearInterval(intervalId);
        if (attempts >= maxAttempts && !isCndCoreReady) {
          console.error('CndCore did not load within timeout');
          setError('CnD Core library failed to load. Please refresh the page.');
          setIsLoading(false);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isCndCoreReady]);

  /**
   * Reset the graph layout to the initial state
   */
  const resetLayout = useCallback(async () => {
    if (graphElementRef.current && layoutRef.current) {
      await graphElementRef.current.renderLayout(layoutRef.current);
    }
  }, []);

  /**
   * Load and render the graph using SpyTial/CnD
   */
  const loadGraph = useCallback(async () => {
    if (!graphElementRef.current) return;
    
    setIsLoading(true);
    setError(null);

    // Check if CndCore is available
    if (typeof window.CndCore === 'undefined') {
      setError('CnD Core library is not available. Please check your internet connection.');
      setIsLoading(false);
      return;
    }

    try {
      // Get the raw Alloy XML from the datum
      const alloyXml = datum.data;
      if (!alloyXml) {
        throw new Error('No Alloy XML data available in datum');
      }

      // Step 1: Parse Alloy XML using CndCore
      //console.log('Parsing Alloy XML...');
      const alloyDatum = window.CndCore.AlloyInstance.parseAlloyXML(alloyXml);
      
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) {
        throw new Error('No instances found in Alloy XML');
      }

      // Step 2: Create AlloyDataInstance for the current time index
      // For temporal traces, select the instance at the current time step
      const instanceIndex = timeIndex !== undefined ? Math.min(timeIndex, alloyDatum.instances.length - 1) : 0;
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);
      // console.log('Created Alloy Data Instance:', {
      //   instanceIndex,
      //   totalInstances: alloyDatum.instances.length,
      //   types: alloyDataInstance.getTypes().length,
      //   atoms: alloyDataInstance.getAtoms().length,
      //   relations: alloyDataInstance.getRelations().length
      // });

      // Notify parent if in synthesis mode - pass raw instance data (not class) for Redux storage
      if (synthesisMode && onDataInstanceCreated) {
        // Pass the raw instance data that can be used to recreate AlloyDataInstance later
        // We can't store AlloyDataInstance in Redux because class methods don't survive serialization
        onDataInstanceCreated(alloyDatum.instances[instanceIndex]);
      }

      // Step 3: Create SGraphQueryEvaluator for layout generation
      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance }); // Pass AlloyDataInstance, not raw XML
      
      //console.log('Created SGraphQueryEvaluator for layout generation');

      // Step 4: Parse layout specification
      // Note: An empty cndSpec is valid and has semantic meaning (no constraints/directives)
      let layoutSpec = null;
      try {
        layoutSpec = window.CndCore.parseLayoutSpec(cndSpec || '');
        if (window.clearAllErrors) {
          window.clearAllErrors();
        }
      } catch (parseError: any) {
        console.error('Layout spec parse error:', parseError);
        if (window.showParseError) {
          window.showParseError(parseError.message, 'Layout Specification');
        }
        // Continue with empty layout spec on parse error
        layoutSpec = window.CndCore.parseLayoutSpec('');
      }

      // Step 5: Create LayoutInstance with SGraphQueryEvaluator
      const ENABLE_ALIGNMENT_EDGES = true;
      const instanceNumber = 0;
      const layoutInstance = new window.CndCore.LayoutInstance(
        layoutSpec,
        sgraphEvaluator,
        instanceNumber,
        ENABLE_ALIGNMENT_EDGES
      );

      // Step 6: Generate layout
      const projections = window.currentProjections || {};
      console.log('Using projections:', projections);
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance, projections);

      // Update projection controls with projection data
      if (window.updateProjectionData && layoutResult.projectionData) {
        console.log('Updating projection data:', layoutResult.projectionData);
        window.updateProjectionData(layoutResult.projectionData);
      } else if (layoutResult.projectionData && layoutResult.projectionData.length > 0) {
        console.warn('Projection data available but updateProjectionData function not found. Projection controls may not display correctly.');
      }

      // Check for layout errors
      if (layoutResult.error) {
        console.error('Layout generation error:', layoutResult.error);
        
        if (layoutResult.error.errorMessages) {
          if (window.showPositionalError) {
            window.showPositionalError(layoutResult.error.errorMessages);
          } else {
            setError(`Positional constraint conflict: ${layoutResult.error.message}`);
          }
        } else if (layoutResult.error.overlappingNodes) {
          if (window.showGroupOverlapError) {
            window.showGroupOverlapError(layoutResult.error.message);
          } else {
            setError(`Group overlap error: ${layoutResult.error.message}`);
          }
        } else {
          if (window.showGeneralError) {
            window.showGeneralError(`Layout generation error: ${layoutResult.error.message}`);
          } else {
            setError(`Layout generation error: ${layoutResult.error.message}`);
          }
        }

        // Mark as unsat if there's an error
        if (graphElementRef.current) {
          graphElementRef.current.setAttribute('unsat', '');
        }
      }

      // Store the layout for reset functionality
      layoutRef.current = layoutResult.layout;

      // Step 7: Render the layout with prior state for temporal continuity
      if (graphElementRef.current && layoutResult.layout) {
        // Log the nodes in the new layout
        const newLayoutNodeIds = layoutResult.layout.nodes?.map((n: any) => n.id || n.name || n.label) || [];
        //console.log('Nodes in new layout:', newLayoutNodeIds);
        
        // Check if we have prior state to use
        const hasPriorState = priorState && priorState.positions && priorState.positions.length > 0;
        const renderOptions = hasPriorState ? { priorState } : undefined;
        
        // Debug: Check which prior position IDs match new layout node IDs
        if (hasPriorState && priorState) {
          const priorIds = priorState.positions.map((p: NodePositionHint) => p.id);
          const matchingIds = priorIds.filter((id: string) => newLayoutNodeIds.includes(id));
          // console.log('Prior position IDs:', priorIds);
          // console.log('Matching IDs between prior positions and new layout:', matchingIds);
          // console.log(`Match rate: ${matchingIds.length}/${newLayoutNodeIds.length} nodes have prior positions`);
        }
        
        //console.log('Rendering with prior state:', hasPriorState ? priorState.positions.length + ' nodes' : 'none');
        
        // Render - the layout-complete event will capture final positions
        await graphElementRef.current.renderLayout(layoutResult.layout, renderOptions);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error rendering SpyTial graph:', err);
      setError(`Error rendering graph: ${err.message}`);
      setIsLoading(false);
    }
  }, [datum.data, datum.id, cndSpec, timeIndex, resetLayout, priorState]);

  // Create and mount the webcola-cnd-graph element once
  useEffect(() => {
    if (!graphContainerRef.current || isInitializedRef.current) return;

    // Create the webcola-cnd-graph custom element
    const graphElement = document.createElement('webcola-cnd-graph') as HTMLElementTagNameMap['webcola-cnd-graph'];
    graphElement.id = 'spytial-graph-container';
    graphElement.setAttribute('layoutFormat', 'default');
    graphElement.setAttribute('aria-label', 'Interactive graph visualization');
    graphElement.style.cssText = `
      width: 100%;
      height: 100%;
      min-height: 400px;
      display: block;
    `;

    // Listen for layout-complete event to capture FINAL layout state after WebCola constraints
    // This is crucial for temporal consistency - we want positions AFTER constraints are applied
    const handleLayoutComplete = (e: CustomEvent) => {
      //console.log('Layout complete! Capturing final layout state for temporal consistency.');
      
      // Use getLayoutState() to get complete state (positions + transform)
      if (graphElementRef.current?.getLayoutState && onLayoutStateChangeRef.current) {
        const layoutState = graphElementRef.current.getLayoutState();
        if (layoutState && layoutState.positions && layoutState.positions.length > 0) {
          // console.log(`Captured layout state: ${layoutState.positions.length} positions, transform: k=${layoutState.transform.k.toFixed(2)}`);
          onLayoutStateChangeRef.current(layoutState);
        }
      }
    };

    // Listen for node drag end to update layout state
    const handleNodeDragEnd = (e: CustomEvent) => {
      //console.log('Node drag ended, updating layout state');
      if (graphElementRef.current?.getLayoutState && onLayoutStateChangeRef.current) {
        const layoutState = graphElementRef.current.getLayoutState();
        if (layoutState && layoutState.positions && layoutState.positions.length > 0) {
          onLayoutStateChangeRef.current(layoutState);
        }
      }
    };

    // Listen for viewBox changes (zoom/pan) to update layout state
    const handleViewBoxChange = (e: CustomEvent) => {
      // When zoom/pan changes, update the full layout state (which includes transform)
      if (graphElementRef.current?.getLayoutState && onLayoutStateChangeRef.current) {
        const layoutState = graphElementRef.current.getLayoutState();
        if (layoutState && layoutState.positions && layoutState.positions.length > 0) {
          onLayoutStateChangeRef.current(layoutState);
        }
      }
    };

    graphElement.addEventListener('layout-complete', handleLayoutComplete as EventListener);
    graphElement.addEventListener('node-drag-end', handleNodeDragEnd as EventListener);
    graphElement.addEventListener('viewbox-change', handleViewBoxChange as EventListener);

    graphContainerRef.current.appendChild(graphElement);
    graphElementRef.current = graphElement;
    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      if (graphElementRef.current) {
        graphElementRef.current.removeEventListener('layout-complete', handleLayoutComplete as EventListener);
        graphElementRef.current.removeEventListener('node-drag-end', handleNodeDragEnd as EventListener);
        graphElementRef.current.removeEventListener('viewbox-change', handleViewBoxChange as EventListener);
        
        if (graphElementRef.current.clear) {
          graphElementRef.current.clear();
        }
        // Remove the element we added
        if (graphContainerRef.current && graphElementRef.current.parentNode === graphContainerRef.current) {
          graphContainerRef.current.removeChild(graphElementRef.current);
        }
      }
      graphElementRef.current = null;
      layoutRef.current = null;
      isInitializedRef.current = false;
    };
  }, []); // Only run once on mount

  // Load graph when datum, cndSpec, timeIndex changes, BUT only after CndCore is ready
  useEffect(() => {
    if (graphElementRef.current && isCndCoreReady) {
      loadGraph();
    }
  }, [datum.data, cndSpec, timeIndex, loadGraph, isCndCoreReady]);

  return (
    <div 
      className="absolute inset-0 flex flex-col"
      style={{ 
        background: 'white',
        overflow: 'hidden'
      }}
    >
      {/* This div is where we manually mount the custom element - React won't touch its children */}
      <div 
        ref={graphContainerRef} 
        style={{ 
          flex: 1,
          position: 'relative',
          minHeight: '400px',
          cursor: synthesisMode ? 'pointer' : 'default'
        }}
      />
      {/* React-managed overlay elements */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75"
          style={{ zIndex: 10, pointerEvents: 'none' }}
        >
          <div className="text-gray-600">Loading graph...</div>
        </div>
      )}
      {error && (
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 bg-red-100 border-t border-red-300 text-red-700"
          style={{ zIndex: 20 }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export { SpyTialGraph };
