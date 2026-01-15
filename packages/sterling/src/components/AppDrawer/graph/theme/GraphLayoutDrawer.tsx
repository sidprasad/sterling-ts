import { PaneTitle } from '@/sterling-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

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
    if (projectionMountRef.current && window.mountProjectionControls && datum) {
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
  }, [datum, handleProjectionChange]);

  // Mount the CnD Layout Interface from SpyTial
  useEffect(() => {
    // Mount the CnD editor with preloaded spec (if available) or default directives
    if (cndEditorRef.current && !isEditorMounted && datum) {
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
  }, [isEditorMounted, datum, preloadedSpec]);

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
  
  // If no datum, render nothing
  if (!datum) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-slate-50/90 text-slate-900">
      {/* Error display area - SpyTial mounts here, pushes content down */}
      <div
        id="layout-error-mount"
        ref={errorMountRef}
        className="flex-shrink-0"
        aria-live="polite"
      />

      <div className="flex-1 space-y-4 p-4">
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white/80 p-3 backdrop-blur shadow-sm">
          <div
            id="layout-projection-mount"
            ref={projectionMountRef}
            className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-2"
          />

          <div className="grid gap-2">
            <button
              type="button"
              onClick={applyLayout}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:from-indigo-500 hover:to-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Apply Layout
            </button>
          </div>

          <label className="group relative flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-700 shadow-inner transition hover:border-slate-400 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-200">
            <span className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
              Upload .cnd file here
            </span>
            <input
              type="file"
              accept=".cnd"
              onChange={handleFileUpload}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Upload .cnd layout file"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm p-4">
          <div
            id="cnd-editor-mount"
            ref={cndEditorRef}
            className="min-h-[360px] overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/80 shadow-inner"
          />
        </div>
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
