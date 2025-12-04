import { PaneTitle } from '@/sterling-ui';
import { useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

// Declare the window functions from SpyTial's react-component-integration
declare global {
  interface Window {
    CndCore?: {
      mountCndLayoutInterface?: (elementId: string, options?: CndLayoutInterfaceOptions) => void;
    };
    mountCndLayoutInterface?: (elementId?: string, options?: CndLayoutInterfaceOptions) => void;
    getCurrentCNDSpecFromReact?: () => string;
    // Error display functions from SpyTial
    mountErrorMessageModal?: (elementId?: string) => void;
    showParseError?: (message: string, context: string) => void;
    showGeneralError?: (message: string) => void;
    clearAllErrors?: () => void;
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
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [isErrorMounted, setIsErrorMounted] = useState(false);
  
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
  
  if (!datum) return null;

  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => selectCnDSpec(state, datum));

  // Mount the CnD Layout Interface from SpyTial
  useEffect(() => {
    // Mount the CnD editor with default directives
    if (cndEditorRef.current && !isEditorMounted) {
      // Default options with hideDisconnectedBuiltIns directive
      const defaultOptions: CndLayoutInterfaceOptions = {
        initialYamlValue: 'directives:\n  - flag: hideDisconnectedBuiltIns',
        initialDirectives: [{ flag: 'hideDisconnectedBuiltIns' }]
      };

      try {
        // Try CndCore.mountCndLayoutInterface first (newer API)
        if (window.CndCore?.mountCndLayoutInterface) {
          window.CndCore.mountCndLayoutInterface('cnd-editor-mount', defaultOptions);
          setIsEditorMounted(true);
          console.log('CnD Layout Interface mounted via CndCore with default directives');
        } else if (window.mountCndLayoutInterface) {
          // Fall back to window.mountCndLayoutInterface
          window.mountCndLayoutInterface('cnd-editor-mount', defaultOptions);
          setIsEditorMounted(true);
          console.log('CnD Layout Interface mounted with default directives');
        }
      } catch (err) {
        console.error('Failed to mount CnD Layout Interface:', err);
      }
    }
  }, [isEditorMounted]);

  // If there's a preloaded spec, we need to set it in the CnD interface
  // This would require SpyTial to expose a setter function
  useEffect(() => {
    if (preloadedSpec && preloadedSpec !== '' && isEditorMounted) {
      // SpyTial would need to expose window.setCNDSpecInReact or similar
      // For now, log that we have a preloaded spec
      console.log('Preloaded CnD spec available:', preloadedSpec.substring(0, 100) + '...');
    }
  }, [preloadedSpec, isEditorMounted]);

  const applyLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
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

  return (
    <div className='absolute inset-0 flex flex-col overflow-y-auto'>
      {/* Error display area - SpyTial mounts here, pushes content down */}
      <div 
        id="layout-error-mount"
        ref={errorMountRef}
        className="bg-white flex-shrink-0"
      />
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="sticky top-0 z-10 mb-4 rounded border bg-white/95 p-3 backdrop-blur-sm shadow-sm flex flex-col gap-2">
          <button 
            onClick={applyLayout} 
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Apply Layout
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
