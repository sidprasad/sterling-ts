import { DatumParsed } from '@/sterling-connection';
import { useCallback, useEffect, useRef, useState } from 'react';

// Declare the global CndCore type
declare global {
  interface Window {
    CndCore: {
      AlloyInstance: {
        parseAlloyXML: (xml: string) => any;
      };
      AlloyDataInstance: new (instance: any) => any;
      SGraphQueryEvaluator: new () => {
        initialize: (context: { sourceData: any }) => void; // sourceData should be IDataInstance (AlloyDataInstance)
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
  }
}

// Extend HTMLElementTagNameMap for the custom element
declare global {
  interface HTMLElementTagNameMap {
    'webcola-cnd-graph': HTMLElement & {
      renderLayout: (layout: any, options?: { priorPositions?: NodePositions }) => Promise<void>;
      getNodePositions?: () => NodePositions;
      addToolbarControl?: (element: HTMLElement) => void;
      clear?: () => void;
    };
  }
}

// Type for node positions used in temporal trace continuity
// Can be either an array of {id, x, y} or a Record<nodeId, {x, y}>
type NodePositionEntry = { id: string; x: number; y: number };
type NodePositions = NodePositionEntry[] | Record<string, { x: number; y: number }>;

interface SpyTialGraphProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  /** Index of the current time step in a temporal trace */
  timeIndex?: number;
  /** Callback to share node positions with parent for cross-frame continuity */
  onNodePositionsChange?: (positions: NodePositions) => void;
  /** Prior node positions from previous frame for temporal continuity */
  priorPositions?: NodePositions;
  onCndSpecChange?: (spec: string) => void;
  /** Synthesis mode: enable node selection */
  synthesisMode?: boolean;
  /** Selected atom IDs in synthesis mode */
  synthesisSelectedAtoms?: string[];
  /** Callback when atom is clicked in synthesis mode */
  onSynthesisAtomClick?: (atomId: string) => void;
}

const SpyTialGraph = (props: SpyTialGraphProps) => {
  const { 
    datum, 
    cndSpec, 
    timeIndex, 
    priorPositions, 
    onNodePositionsChange,
    synthesisMode = false,
    synthesisSelectedAtoms = [],
    onSynthesisAtomClick
  } = props;
  // Separate ref for the graph container - this div is NOT managed by React's children
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphElementRef = useRef<HTMLElementTagNameMap['webcola-cnd-graph'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCndCoreReady, setIsCndCoreReady] = useState(typeof window.CndCore !== 'undefined');
  const layoutRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  
  // Use a ref to store the latest onNodePositionsChange callback
  // This avoids stale closure issues in event listeners
  const onNodePositionsChangeRef = useRef(onNodePositionsChange);
  onNodePositionsChangeRef.current = onNodePositionsChange;

  // Poll for CndCore availability if not ready yet
  useEffect(() => {
    if (isCndCoreReady) return;

    const checkCndCore = () => {
      if (typeof window.CndCore !== 'undefined' && window.CndCore.parseLayoutSpec) {
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
      console.log('Parsing Alloy XML...');
      const alloyDatum = window.CndCore.AlloyInstance.parseAlloyXML(alloyXml);
      
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) {
        throw new Error('No instances found in Alloy XML');
      }

      // Step 2: Create AlloyDataInstance for the current time index
      // For temporal traces, select the instance at the current time step
      const instanceIndex = timeIndex !== undefined ? Math.min(timeIndex, alloyDatum.instances.length - 1) : 0;
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);
      console.log('Created Alloy Data Instance:', {
        instanceIndex,
        totalInstances: alloyDatum.instances.length,
        types: alloyDataInstance.getTypes().length,
        atoms: alloyDataInstance.getAtoms().length,
        relations: alloyDataInstance.getRelations().length
      });

      // Step 3: Create SGraphQueryEvaluator for layout generation
      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance }); // Pass AlloyDataInstance, not raw XML
      
      console.log('Created SGraphQueryEvaluator for layout generation');

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
      const projections = {};
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance, projections);

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

      // Step 7: Render the layout with prior positions for temporal continuity
      if (graphElementRef.current && layoutResult.layout) {
        // Log the nodes in the new layout
        const newLayoutNodeIds = layoutResult.layout.nodes?.map((n: any) => n.id || n.name || n.label) || [];
        console.log('Nodes in new layout:', newLayoutNodeIds);
        
        // Check if we have prior positions to use
        const hasPriorPositions = priorPositions && (
          Array.isArray(priorPositions) ? priorPositions.length > 0 : Object.keys(priorPositions).length > 0
        );
        const renderOptions = hasPriorPositions ? { priorPositions } : undefined;
        
        // Debug: Check which prior position IDs match new layout node IDs
        if (hasPriorPositions && priorPositions) {
          const priorIds = Array.isArray(priorPositions) 
            ? priorPositions.map((p: NodePositionEntry) => p.id)
            : Object.keys(priorPositions);
          const matchingIds = priorIds.filter((id: string) => newLayoutNodeIds.includes(id));
          console.log('Prior position IDs:', priorIds);
          console.log('Matching IDs between prior positions and new layout:', matchingIds);
          console.log(`Match rate: ${matchingIds.length}/${newLayoutNodeIds.length} nodes have prior positions`);
          
          // Show actual position values for matching nodes
          if (Array.isArray(priorPositions)) {
            const matchingPositions = priorPositions.filter((p: NodePositionEntry) => newLayoutNodeIds.includes(p.id));
            console.log('Prior positions for matching nodes:', matchingPositions);
          }
        }
        
        console.log('Rendering with prior positions:', hasPriorPositions ? (Array.isArray(priorPositions) ? priorPositions.length : Object.keys(priorPositions!).length) + ' nodes' : 'none');
        
        // Render - the layout-complete event will capture final positions
        await graphElementRef.current.renderLayout(layoutResult.layout, renderOptions);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error rendering SpyTial graph:', err);
      setError(`Error rendering graph: ${err.message}`);
      setIsLoading(false);
    }
  }, [datum.data, datum.id, cndSpec, timeIndex, resetLayout, priorPositions]);

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

    // Listen for layout-complete event to capture FINAL positions after WebCola constraints
    // This is crucial for temporal consistency - we want positions AFTER constraints are applied
    const handleLayoutComplete = (e: CustomEvent) => {
      const detail = e.detail;
      console.log('Layout complete! Capturing final positions for temporal consistency.');
      
      if (detail.nodePositions && detail.nodePositions.length > 0) {
        console.log(`Captured ${detail.nodePositions.length} final node positions from layout-complete event`);
        // Log a few for debugging
        detail.nodePositions.slice(0, 3).forEach((p: NodePositionEntry) => {
          console.log(`  ${p.id}: x=${p.x.toFixed(2)}, y=${p.y.toFixed(2)}`);
        });
        
        // Call the callback with the captured positions
        if (onNodePositionsChangeRef.current) {
          onNodePositionsChangeRef.current(detail.nodePositions);
        }
      }
    };
    
    // Listen for node clicks (for synthesis mode)
    const handleNodeClick = (e: CustomEvent) => {
      if (synthesisMode && onSynthesisAtomClick) {
        const nodeId = e.detail?.nodeId || e.detail?.id;
        if (nodeId) {
          console.log('[SpyTialGraph] Node clicked in synthesis mode:', nodeId);
          onSynthesisAtomClick(nodeId);
        }
      }
    };

    // Listen for node drag end to update positions
    const handleNodeDragEnd = (e: CustomEvent) => {
      const detail = e.detail;
      if (detail.nodePositions && detail.nodePositions.length > 0) {
        console.log(`Node drag ended, updating ${detail.nodePositions.length} positions`);
        if (onNodePositionsChangeRef.current) {
          onNodePositionsChangeRef.current(detail.nodePositions);
        }
      }
    };

    graphElement.addEventListener('layout-complete', handleLayoutComplete as EventListener);
    graphElement.addEventListener('node-click', handleNodeClick as EventListener);
    graphElement.addEventListener('node-drag-end', handleNodeDragEnd as EventListener);
    // Also listen to click events on the SVG directly
    graphElement.addEventListener('click', (e: MouseEvent) => {
      if (synthesisMode && onSynthesisAtomClick) {
        // Try to find the clicked node from the event target
        const target = e.target as Element;
        const nodeGroup = target.closest('[data-node-id]') || target.closest('g.node');
        if (nodeGroup) {
          const nodeId = nodeGroup.getAttribute('data-node-id') || 
                        nodeGroup.getAttribute('id')?.replace('node-', '');
          if (nodeId) {
            console.log('[SpyTialGraph] Node clicked via SVG:', nodeId);
            onSynthesisAtomClick(nodeId);
          }
        }
      }
    });

    graphContainerRef.current.appendChild(graphElement);
    graphElementRef.current = graphElement;
    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      if (graphElementRef.current) {
        graphElementRef.current.removeEventListener('layout-complete', handleLayoutComplete as EventListener);
        graphElementRef.current.removeEventListener('node-drag-end', handleNodeDragEnd as EventListener);
        
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
      {/* Synthesis mode overlay */}
      {synthesisMode && (
        <div 
          className="absolute top-0 left-0 right-0 p-3 bg-blue-500 text-white text-sm font-medium shadow-md"
          style={{ zIndex: 15 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <span>Synthesis Mode: Click on nodes to select atoms</span>
            {synthesisSelectedAtoms.length > 0 && (
              <span className="ml-auto bg-white text-blue-600 px-2 py-1 rounded text-xs font-bold">
                {synthesisSelectedAtoms.length} selected
              </span>
            )}
          </div>
        </div>
      )}
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
