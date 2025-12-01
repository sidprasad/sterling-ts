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
      ForgeEvaluator: new () => {
        initialize: (context: { sourceData: string }) => void;
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
    };
    mountErrorMessageModal?: (elementId: string) => void;
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
      renderLayout: (layout: any) => Promise<void>;
      addToolbarControl?: (element: HTMLElement) => void;
      clear?: () => void;
    };
  }
}

interface SpyTialGraphProps {
  datum: DatumParsed<any>;
  cndSpec: string;
  onCndSpecChange?: (spec: string) => void;
}

const SpyTialGraph = (props: SpyTialGraphProps) => {
  const { datum, cndSpec } = props;
  // Separate ref for the graph container - this div is NOT managed by React's children
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const graphElementRef = useRef<HTMLElementTagNameMap['webcola-cnd-graph'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const layoutRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

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

      // Step 2: Create AlloyDataInstance
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[0]);
      console.log('Created Alloy Data Instance:', {
        types: alloyDataInstance.getTypes().length,
        atoms: alloyDataInstance.getAtoms().length,
        relations: alloyDataInstance.getRelations().length
      });

      // Step 3: Create ForgeEvaluator
      const evaluationContext = { sourceData: alloyXml };
      const forgeEvaluator = new window.CndCore.ForgeEvaluator();
      forgeEvaluator.initialize(evaluationContext);

      // Step 4: Parse layout specification (use empty string if no spec provided)
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
        // Continue with empty layout spec
        layoutSpec = window.CndCore.parseLayoutSpec('');
      }

      // Step 5: Create LayoutInstance
      const ENABLE_ALIGNMENT_EDGES = true;
      const instanceNumber = 0;
      const layoutInstance = new window.CndCore.LayoutInstance(
        layoutSpec,
        forgeEvaluator,
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

      // Step 7: Render the layout
      if (graphElementRef.current && layoutResult.layout) {
        await graphElementRef.current.renderLayout(layoutResult.layout);
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Error rendering SpyTial graph:', err);
      setError(`Error rendering graph: ${err.message}`);
      setIsLoading(false);
    }
  }, [datum.data, cndSpec, resetLayout]);

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

    graphContainerRef.current.appendChild(graphElement);
    graphElementRef.current = graphElement;
    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      if (graphElementRef.current) {
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

  // Load graph when datum or cndSpec changes
  useEffect(() => {
    if (graphElementRef.current) {
      loadGraph();
    }
  }, [datum.data, cndSpec, loadGraph]);

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
          minHeight: '400px'
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
