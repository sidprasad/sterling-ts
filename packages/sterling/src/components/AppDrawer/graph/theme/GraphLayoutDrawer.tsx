import { PaneTitle } from '@/sterling-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec, selectSelectedProjections, selectTimeIndex, selectProjectionConfig, selectSequencePolicyName } from '../../../../state/selectors';
import { cndSpecSet, selectedProjectionsSet } from '../../../../state/graphs/graphsSlice';
import { parseCndFile } from '../../../../utils/cndPreParser';

const GraphLayoutDrawer = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const cndEditorRef = useRef<HTMLDivElement>(null);
  const errorMountRef = useRef<HTMLDivElement>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [isErrorMounted, setIsErrorMounted] = useState(false);

  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => datum ? selectCnDSpec(state, datum) : undefined);
  const selectedProjections = useSterlingSelector((state) =>
    datum ? selectSelectedProjections(state, datum) : {}
  );
  const timeIndex = useSterlingSelector((state) =>
    datum ? selectTimeIndex(state, datum) : 0
  );

  const refreshProjectionData = useCallback((specText: string) => {
    if (!datum?.data) return;
    if (!window.CndCore?.AlloyInstance?.parseAlloyXML || !window.CndCore?.AlloyDataInstance) return;

    try {
      const alloyDatum = window.CndCore.AlloyInstance.parseAlloyXML(datum.data);
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) return;

      const instanceIndex = Math.min(timeIndex, alloyDatum.instances.length - 1);
      const alloyDataInstance = new window.CndCore.AlloyDataInstance(alloyDatum.instances[instanceIndex]);

      const sgraphEvaluator = new window.CndCore.SGraphQueryEvaluator();
      sgraphEvaluator.initialize({ sourceData: alloyDataInstance });

      // Use parseCndFile to strip projection/sequence blocks before passing to parseLayoutSpec
      const parsedCnd = parseCndFile(specText || '');
      let layoutSpec = null;
      try {
        layoutSpec = window.CndCore.parseLayoutSpec(parsedCnd.layoutYaml);
      } catch {
        layoutSpec = window.CndCore.parseLayoutSpec('');
      }

      const layoutInstance = new window.CndCore.LayoutInstance(
        layoutSpec,
        sgraphEvaluator,
        instanceIndex,
        true
      );

      // Single-arg generateLayout (projections handled via applyProjectionTransform elsewhere)
      const layoutResult = layoutInstance.generateLayout(alloyDataInstance);

      // If CND spec has projections, use applyProjectionTransform to get choices
      if (parsedCnd.projections.length > 0 && typeof window.CndCore.applyProjectionTransform === 'function') {
        try {
          // Convert selectedProjections (Record<string, string[]>) to Record<string, string>
          // by taking the first selected atom per type
          const singleSelections: Record<string, string> = {};
          for (const [typeId, atoms] of Object.entries(selectedProjections)) {
            if (Array.isArray(atoms) && atoms.length > 0) {
              singleSelections[typeId] = atoms[0];
            }
          }
          const projResult = window.CndCore.applyProjectionTransform(
            alloyDataInstance,
            parsedCnd.projections,
            singleSelections,
            {
              evaluateOrderBy: (selector: string) => {
                try {
                  return sgraphEvaluator.evaluate(selector).selectedTwoples();
                } catch {
                  return [];
                }
              }
            }
          );
          if (window.updateProjectionData) {
            const choices = (projResult && Array.isArray(projResult.choices)) ? projResult.choices : [];
            window.updateProjectionData(choices);
          }
        } catch (err) {
          console.error('Failed to get projection choices:', err);
          if (window.updateProjectionData) {
            window.updateProjectionData([]);
          }
        }
      } else {
        if (window.updateProjectionData) {
          const projData = (layoutResult && Array.isArray(layoutResult.projectionData))
            ? layoutResult.projectionData
            : [];
          window.updateProjectionData(projData);
        }
      }
    } catch (err) {
      console.error('Failed to refresh projection data:', err);
    }
  }, [datum, timeIndex, selectedProjections]);

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

    const cndSpecText = window.getCurrentCNDSpecFromReact?.() || '';
    refreshProjectionData(cndSpecText);

    // Collapse to single-graph view before re-applying layout.
    if (!window.currentProjections) {
      window.currentProjections = {};
    }
    Object.entries(selectedProjections).forEach(([projectionType, atoms]) => {
      dispatch(selectedProjectionsSet({
        datum,
        projectionType,
        selectedAtoms: []
      }));
      if (window.currentProjections && window.currentProjections[projectionType]) {
        delete window.currentProjections[projectionType];
      }
    });

    if (window.clearAllErrors) {
      window.clearAllErrors();
    }
    
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!datum) return;
    
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        refreshProjectionData(text);
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
      <PaneTitle>Layout</PaneTitle>
    </div>
  );
};

export { GraphLayoutDrawer, GraphLayoutDrawerHeader };
