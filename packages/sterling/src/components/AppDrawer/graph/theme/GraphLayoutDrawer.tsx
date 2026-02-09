import { PaneTitle } from '@/sterling-ui';
import { useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec } from '../../../../state/selectors';
import { cndSpecSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

const GraphLayoutDrawer = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const cndEditorRef = useRef<HTMLDivElement>(null);
  const errorMountRef = useRef<HTMLDivElement>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [isErrorMounted, setIsErrorMounted] = useState(false);

  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => datum ? selectCnDSpec(state, datum) : undefined);

  // Load Bootstrap for SpyTial UI
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

  // Mount SpyTial error modal
  useEffect(() => {
    if (errorMountRef.current && window.mountErrorMessageModal && !isErrorMounted) {
      try {
        window.mountErrorMessageModal('layout-error-mount');
        setIsErrorMounted(true);
      } catch (err) {
        console.error('Failed to mount SpyTial Error Modal:', err);
      }
    }
  }, [isErrorMounted]);

  // Mount the CnD Layout Interface from SpyTial
  useEffect(() => {
    if (cndEditorRef.current && !isEditorMounted && datum) {
      const defaultSpec = 'directives:\n  - flag: hideDisconnectedBuiltIns';
      const initialSpec = (preloadedSpec && preloadedSpec !== '') ? preloadedSpec : defaultSpec;
      
      const options: CndLayoutInterfaceOptions = {
        initialYamlValue: initialSpec,
        initialDirectives: (preloadedSpec && preloadedSpec !== '') ? undefined : [{ flag: 'hideDisconnectedBuiltIns' }]
      };

      try {
        if (window.CndCore?.mountCndLayoutInterface) {
          window.CndCore.mountCndLayoutInterface('cnd-editor-mount', options);
          setIsEditorMounted(true);
        } else if (window.mountCndLayoutInterface) {
          window.mountCndLayoutInterface('cnd-editor-mount', options);
          setIsEditorMounted(true);
        }
      } catch (err) {
        console.error('Failed to mount CnD Layout Interface:', err);
      }
    }
  }, [isEditorMounted, datum, preloadedSpec]);

  const applyLayout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!datum) return;
    
    if (window.clearAllErrors) {
      window.clearAllErrors();
    }
    
    const cndSpecText = window.getCurrentCNDSpecFromReact?.() || '';
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!datum) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        dispatch(cndSpecSet({ datum, spec: text }));
      };
      reader.readAsText(file);
    }
  };
  
  if (!datum) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-slate-50/90 text-slate-900">
      {/* Error display area */}
      <div
        id="layout-error-mount"
        ref={errorMountRef}
        className="flex-shrink-0"
        aria-live="polite"
      />

      <div className="flex-1 space-y-3 p-3">
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
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600">
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
