import { PaneTitle } from '@/sterling-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';
// CndCore types are declared in ../../types/cndcore.d.ts

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
      {/* Error display area - SpyTial mounts here */}
      <div
        id="layout-error-mount"
        ref={errorMountRef}
        className="flex-shrink-0"
        aria-live="polite"
      />

      <div className="flex-1 space-y-3 p-3">
        {/* Projection Controls */}
        <div
          id="layout-projection-mount"
          ref={projectionMountRef}
          className="rounded-lg border border-slate-200 bg-white/90 p-2 shadow-sm"
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyLayout}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Apply Layout
          </button>
          
          <label className="group relative flex-1 cursor-pointer">
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload .cnd
            </div>
            <input
              type="file"
              accept=".cnd"
              onChange={handleFileUpload}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Upload .cnd layout file"
            />
          </label>
        </div>

        {/* Editor */}
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm p-3">
          <div
            id="cnd-editor-mount"
            ref={cndEditorRef}
            className="min-h-[360px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
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
