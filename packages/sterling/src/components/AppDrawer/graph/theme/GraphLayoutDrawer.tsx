import { PaneTitle } from '@/sterling-ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectActiveDatum, selectCnDSpec, selectSelectedProjections } from '../../../../state/selectors';
import { cndSpecSet, projectionAtomToggled, selectedProjectionsSet } from '../../../../state/graphs/graphsSlice';
import { RiHammerFill } from 'react-icons/ri';
import { Icon } from '@chakra-ui/react';

interface ProjectionTypeData {
  typeId: string;
  typeName: string;
  atoms: { id: string; label: string }[];
}

const GraphLayoutDrawer = () => {
  const dispatch = useSterlingDispatch();
  const datum = useSterlingSelector(selectActiveDatum);
  const cndEditorRef = useRef<HTMLDivElement>(null);
  const errorMountRef = useRef<HTMLDivElement>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const [isErrorMounted, setIsErrorMounted] = useState(false);
  
  // Projection data from SpyTial - populated via window.updateProjectionData callback
  const [projectionData, setProjectionData] = useState<ProjectionTypeData[]>([]);
  
  /** Load from XML (if provided) once. */
  const preloadedSpec = useSterlingSelector((state) => datum ? selectCnDSpec(state, datum) : undefined);
  const cndSpec = preloadedSpec || '';
  
  // Selected projections from Redux
  const selectedProjections = useSterlingSelector((state) =>
    datum ? selectSelectedProjections(state, datum) : {}
  );
  
  // Set up the callback IMMEDIATELY (not in useEffect) to avoid timing issues
  // This ensures we capture projection data even if SpyTialGraph renders first
  if (typeof window !== 'undefined') {
    const existingHandler = window.updateProjectionData;
    // Only set if not already our handler
    if (!existingHandler || !(existingHandler as any).__isMultiSelectHandler) {
      const handler = (data: any[]) => {
        console.log('GraphLayoutDrawer received RAW projection data:', JSON.stringify(data, null, 2));
        
        // Normalize the data structure - CndCore uses:
        // { type: "X", projectedAtom: "X0", atoms: ["X0", "X1", "X2"] }
        const normalizedData: ProjectionTypeData[] = data.map(typeData => {
          // CndCore uses "type" field for the type name
          const typeName = typeData.type || typeData.typeName || typeData.name || typeData.typeId || '';
          const typeId = typeName; // Use typeName as typeId for consistency
          
          // CndCore atoms is an array of strings, not objects
          const rawAtoms = typeData.atoms || [];
          const atoms = rawAtoms.map((atom: any) => {
            // Handle both string atoms and object atoms
            if (typeof atom === 'string') {
              return { id: atom, label: atom };
            } else {
              return {
                id: atom.id || atom.atomId || atom.name || atom.label || '',
                label: atom.label || atom.name || atom.id || atom.atomId || ''
              };
            }
          });
          
          console.log(`Normalized type: ${typeName}, atoms:`, atoms);
          
          return { typeId, typeName, atoms };
        });
        
        // Store on window for later access
        (window as any).__lastProjectionData = normalizedData;
        // Try to trigger React update via custom event
        window.dispatchEvent(new CustomEvent('projectionDataUpdated', { detail: normalizedData }));
      };
      (handler as any).__isMultiSelectHandler = true;
      window.updateProjectionData = handler;
    }
  }
  
  // Listen for projection data updates
  useEffect(() => {
    const handleProjectionData = (event: CustomEvent<ProjectionTypeData[]>) => {
      const data = event.detail;
      setProjectionData(data);
      
      // Initialize selections if empty
      if (datum && data.length > 0) {
        data.forEach(typeData => {
          const currentSelections = selectedProjections[typeData.typeId] || [];
          if (currentSelections.length === 0 && typeData.atoms.length > 0) {
            dispatch(selectedProjectionsSet({
              datum,
              projectionType: typeData.typeId,
              selectedAtoms: [typeData.atoms[0].id]
            }));
            if (!window.currentProjections) {
              window.currentProjections = {};
            }
            window.currentProjections[typeData.typeId] = typeData.atoms[0].id;
          }
        });
      }
    };
    
    window.addEventListener('projectionDataUpdated', handleProjectionData as EventListener);
    
    // Check if data was already received before this component mounted
    const existingData = (window as any).__lastProjectionData;
    if (existingData && existingData.length > 0) {
      handleProjectionData({ detail: existingData } as CustomEvent<ProjectionTypeData[]>);
    }
    
    return () => {
      window.removeEventListener('projectionDataUpdated', handleProjectionData as EventListener);
    };
  }, [datum, selectedProjections, dispatch]);
  
  // Reset projections when datum changes
  useEffect(() => {
    setProjectionData([]);
    if (window.currentProjections) {
      window.currentProjections = {};
    }
  }, [datum]);
  
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

  // Handle toggling a projection atom selection
  const handleAtomToggle = useCallback((typeId: string, atomId: string) => {
    if (!datum) return;
    
    dispatch(projectionAtomToggled({
      datum,
      projectionType: typeId,
      atomId
    }));
    
    // Update window.currentProjections for SpyTial
    const currentSelections = selectedProjections[typeId] || [];
    const newSelections = currentSelections.includes(atomId)
      ? currentSelections.filter(id => id !== atomId)
      : [...currentSelections, atomId];
    
    if (!window.currentProjections) {
      window.currentProjections = {};
    }
    // For single graph mode, use first selected atom
    window.currentProjections[typeId] = newSelections[0] || '';
    
    // Trigger re-layout
    const cndSpecText = window.getCurrentCNDSpecFromReact?.() || cndSpec;
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
  }, [datum, dispatch, selectedProjections, cndSpec]);
  
  // Select all atoms for a type
  const handleSelectAll = useCallback((typeId: string, atoms: { id: string }[]) => {
    if (!datum) return;
    
    const currentSelections = selectedProjections[typeId] || [];
    const allSelected = currentSelections.length === atoms.length;
    
    const newSelections = allSelected ? [atoms[0].id] : atoms.map(a => a.id);
    
    dispatch(selectedProjectionsSet({
      datum,
      projectionType: typeId,
      selectedAtoms: newSelections
    }));
    
    // Update window.currentProjections
    if (!window.currentProjections) {
      window.currentProjections = {};
    }
    window.currentProjections[typeId] = newSelections[0] || '';
    
    const cndSpecText = window.getCurrentCNDSpecFromReact?.() || cndSpec;
    dispatch(cndSpecSet({ datum, spec: cndSpecText }));
  }, [datum, dispatch, selectedProjections, cndSpec]);

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
        {/* Multi-Select Projection Controls - shows when projectionData is available */}
        {projectionData.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">Projections</span>
              <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Multi-select
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Click atoms to toggle. Multiple selections show separate graphs.
            </p>
            
            {projectionData.map(typeData => {
              const typeSelections = selectedProjections[typeData.typeId] || [];
              const allSelected = typeSelections.length === typeData.atoms.length;
              
              return (
                <div key={typeData.typeId} className="mb-3 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      {typeData.typeName}
                    </label>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(typeData.typeId, typeData.atoms)}
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      {allSelected ? 'Select one' : 'Select all'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {typeData.atoms.map(atom => {
                      const isSelected = typeSelections.includes(atom.id);
                      return (
                        <button
                          key={atom.id}
                          type="button"
                          onClick={() => handleAtomToggle(typeData.typeId, atom.id)}
                          className={`
                            px-2.5 py-1 text-xs rounded-md transition-all font-medium
                            ${isSelected 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                            }
                          `}
                        >
                          {atom.label}
                        </button>
                      );
                    })}
                  </div>
                  {typeSelections.length > 1 && (
                    <p className="text-xs text-indigo-600 mt-1.5 font-medium">
                      ✓ {typeSelections.length} selected — showing {typeSelections.length} graphs
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
