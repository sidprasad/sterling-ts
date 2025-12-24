import { PaneTitle } from '@/sterling-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec, selectIsSynthesisActive } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { enterSynthesisMode } from '../../../../state/synthesis/synthesisSlice';
import { RiHammerFill } from 'react-icons/ri';
import { MdScience } from 'react-icons/md';
import { Icon } from '@chakra-ui/react';
import SynthesisModePanel from '../synthesis/SynthesisModePanel';

// Declare the window functions from SpyTial's react-component-integration
declare global {
  interface Window {
    mountCndLayoutInterface?: (elementId?: string, options?: CndLayoutInterfaceOptions) => void;
    getCurrentCNDSpecFromReact?: () => string;
    // Error display functions from SpyTial
    mountErrorMessageModal?: (elementId?: string) => void;
    showParseError?: (message: string, context: string) => void;
    showGeneralError?: (message: string) => void;
    clearAllErrors?: () => void;
    // Projection control functions
    mountProjectionControls?: (elementId: string, onChangeCallback: (type: string, atomId: string) => void) => void;
    updateProjectionData?: (projectionData: any[]) => void;
    // Store current projections globally (similar to webcola-demo.html)
    currentProjections?: Record<string, string>;
  }
}

// Options for mounting the CnD Layout Interface
interface CndLayoutInterfaceOptions {
  initialYamlValue?: string;
  initialIsNoCodeView?: boolean;
  initialConstraints?: any[];
  initialDirectives?: CndDirective[];
}

interface CndDirective {
  flag: string;
}

const GraphLayoutDrawer = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const isSynthesisActive = useSterlingSelector(selectIsSynthesisActive);
  const cndEditorRef = useRef<HTMLDivElement>(null);
  const errorMountRef = useRef<HTMLDivElement>(null);
  const projectionMountRef = useRef<HTMLDivElement>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [isErrorMounted, setIsErrorMounted] = useState(false);
  const [isProjectionMounted, setIsProjectionMounted] = useState(false);
  const [currentProjections, setCurrentProjections] = useState<Record<string, string>>({});
  
  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => datum ? selectCnDSpec(state, datum) : undefined);
  
  // Reset projections when datum changes
  useEffect(() => {
    setCurrentProjections({});
    if (window.currentProjections) {
      window.currentProjections = {};
    }
    console.log('Projections reset for new datum');
  }, [datum]);
  
  // The embedded SpyTial UI expects Bootstrap styling; load it here to avoid an unstyled mount.
  useEffect(() => {
    const existingBootstrap = document.getElementById('spytial-bootstrap-stylesheet');
    if (!existingBootstrap) {
      const link = document.createElement('link');
      link.id = 'spytial-bootstrap-stylesheet';
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css';
      link.integrity = 'sha384-9ndCyUaIbzAi2FUVXJi0CjmCapSmO7SnpJef0486qhLnuZ2cdeRhO02iuK6FUUVM';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    }
  }, []);

  // Mount the SpyTial error modal in the layout drawer
  useEffect(() => {
    if (errorMountRef.current && window.mountErrorMessageModal && !isErrorMounted) {
      try {
        window.mountErrorMessageModal('layout-error-mount');
        setIsErrorMounted(true);
        console.log('SpyTial Error Modal mounted in Layout Drawer');
      } catch (err) {
        console.error('Failed to mount SpyTial Error Modal:', err);
      }
    }
  }, [isErrorMounted]);

  // Handler for projection changes
  const handleProjectionChange = useCallback((type: string, atomId: string) => {
    console.log(`Projection changed: ${type} -> ${atomId}`);
    
    // Update local state
    setCurrentProjections(prev => ({
      ...prev,
      [type]: atomId
    }));
    
    // Update global state (for compatibility with SpyTial)
    if (!window.currentProjections) {
      window.currentProjections = {};
    }
    window.currentProjections[type] = atomId;
    
    // Trigger layout re-generation with new projections
    if (datum) {
      // Re-apply the layout with updated projections
      // The projections will be picked up by SpyTialGraph via window.currentProjections
      const cndSpecText = window.getCurrentCNDSpecFromReact?.() || '';
      dispatch(cndSpecSet({ datum, spec: cndSpecText }));
    }
  }, [datum, dispatch]);

  // Mount projection controls - remount when datum changes to get fresh projection data
  useEffect(() => {
    if (projectionMountRef.current && window.mountProjectionControls && datum && !isSynthesisActive) {
      try {
        window.mountProjectionControls('layout-projection-mount', handleProjectionChange);
        setIsProjectionMounted(true);
        console.log('Projection Controls mounted in Layout Drawer');
      } catch (err) {
        console.error('Failed to mount Projection Controls:', err);
      }
    }
    // Reset mount state when datum changes to allow remounting
    return () => {
      setIsProjectionMounted(false);
    };
  }, [datum, isSynthesisActive, handleProjectionChange]);

  // Mount the CnD Layout Interface from SpyTial
  useEffect(() => {
    // Mount the CnD editor with preloaded spec (if available) or default directives
    if (cndEditorRef.current && !isEditorMounted && datum && !isSynthesisActive) {
      // Use preloaded spec if available, otherwise use default directive
      const defaultSpec = 'directives:\n  - flag: hideDisconnectedBuiltIns';
      const initialSpec = (preloadedSpec && preloadedSpec !== '') ? preloadedSpec : defaultSpec;
      
      const options: CndLayoutInterfaceOptions = {
        initialYamlValue: initialSpec,
        initialDirectives: (preloadedSpec && preloadedSpec !== '') ? undefined : [{ flag: 'hideDisconnectedBuiltIns' }]
      };

      try {
        // Try CndCore.mountCndLayoutInterface first (newer API)
        if (window.CndCore?.mountCndLayoutInterface) {
          window.CndCore.mountCndLayoutInterface('cnd-editor-mount', options);
          setIsEditorMounted(true);
          console.log('CnD Layout Interface mounted via CndCore' + (preloadedSpec ? ' with preloaded spec' : ' with default directives'));
        } else if (window.mountCndLayoutInterface) {
          // Fall back to window.mountCndLayoutInterface
          window.mountCndLayoutInterface('cnd-editor-mount', options);
          setIsEditorMounted(true);
          console.log('CnD Layout Interface mounted' + (preloadedSpec ? ' with preloaded spec' : ' with default directives'));
        }
      } catch (err) {
        console.error('Failed to mount CnD Layout Interface:', err);
      }
    }
  }, [isEditorMounted, datum, isSynthesisActive, preloadedSpec]);

  const applyLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!datum) return;
    
    // Clear any existing errors before applying new layout
    if (window.clearAllErrors) {
      window.clearAllErrors();
    }
    
    // Get the CnD spec from the React component
    const cndSpecText = window.getCurrentCNDSpecFromReact?.() || '';
    
    // Update the CnD spec in Redux state - this will trigger SpyTialGraph to re-render
    // Any parse errors or layout errors will be shown via the SpyTial error modal
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!datum) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        // When SpyTial exposes a setter, we can use it here
        // For now, we'll apply directly
        dispatch(cndSpecSet({ datum, spec: text }));
      };
      reader.readAsText(file);
    }
  };
  
  // If synthesis mode is active, show synthesis panel instead
  if (isSynthesisActive) {
    return <SynthesisModePanel />;
  }
  
  // If no datum, render nothing
  if (!datum) {
    return null;
  }

  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto'>
      {/* Error display area - SpyTial mounts here, pushes content down */}
      <div 
        id="layout-error-mount"
        ref={errorMountRef}
        className="bg-white flex-shrink-0"
      />
      
      <div className="p-4 flex-1 flex flex-col">
        {/* Projection Controls (shows when there are projections) */}
        <div 
          id="layout-projection-mount"
          ref={projectionMountRef}
          className="mb-3"
        />
        
        <div className="sticky top-0 z-10 mb-4 rounded border bg-white/95 p-3 backdrop-blur-sm shadow-sm flex flex-col gap-2">
          <button 
            onClick={applyLayout} 
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Apply Layout
          </button>
          <button 
            onClick={() => dispatch(enterSynthesisMode({ numInstances: 3, selectorType: 'unary' }))} 
            className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center gap-2"
          >
            <Icon as={MdScience} />
            Synthesize Selector
          </button>
          <label className="flex items-center justify-between text-xs text-gray-600">
            <span className="sr-only">Upload CnD layout file</span>
            <span className="text-[11px] text-gray-500">Upload .cnd</span>
            <input 
              type="file" 
              accept=".cnd" 
              onChange={handleFileUpload}
              className="block w-full text-[11px] text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-200 file:bg-white file:text-xs file:font-medium hover:file:bg-gray-50"
            />
          </label>
        </div>
        
        {/* CnD Layout Interface mount point */}
        <div 
          id="cnd-editor-mount" 
          ref={cndEditorRef}
          className="flex-1 min-h-[300px] mt-4"
        />
        
        {!isEditorMounted && (
          <div className="text-gray-500 text-sm mt-2">
            Loading CnD Layout Editor...
          </div>
        )}
      </div>
    </div>
  );
};

export default GraphLayoutDrawer;

const GraphLayoutDrawerHeader = () => {
  return (
    <div className='w-full flex items-center px-2 space-x-2'>
      <Icon as={RiHammerFill} />
      <PaneTitle>Layout</PaneTitle>
    </div>
  );
};

export { GraphLayoutDrawer, GraphLayoutDrawerHeader };
