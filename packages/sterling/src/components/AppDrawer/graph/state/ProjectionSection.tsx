import { DatumParsed } from '@/sterling-connection';
import { useCallback, useEffect, useState } from 'react';
import { useSterlingDispatch, useSterlingSelector } from '../../../../state/hooks';
import { selectCnDSpec, selectSelectedProjections } from '../../../../state/selectors';
import { cndSpecSet, projectionAtomToggled, selectedProjectionsSet } from '../../../../state/graphs/graphsSlice';

interface ProjectionTypeData {
  typeId: string;
  typeName: string;
  atoms: { id: string; label: string }[];
}

interface ProjectionSectionProps {
  datum: DatumParsed<any>;
}

const ProjectionSection = ({ datum }: ProjectionSectionProps) => {
  const dispatch = useSterlingDispatch();
  
  // Projection data from SpyTial - populated via window.updateProjectionData callback
  const [projectionData, setProjectionData] = useState<ProjectionTypeData[]>([]);
  
  const cndSpec = useSterlingSelector((state) => selectCnDSpec(state, datum)) || '';
  
  // Selected projections from Redux
  const selectedProjections = useSterlingSelector((state) =>
    selectSelectedProjections(state, datum)
  );
  
  // Set up the callback IMMEDIATELY (not in useEffect) to avoid timing issues
  // This ensures we capture projection data even if SpyTialGraph renders first
  if (typeof window !== 'undefined') {
    const existingHandler = window.updateProjectionData;
    // Only set if not already our handler
    if (!existingHandler || !(existingHandler as any).__isMultiSelectHandler) {
      const handler = (data: any[]) => {
        console.log('ProjectionSection received RAW projection data:', JSON.stringify(data, null, 2));
        
        // Normalize the data structure - CndCore uses: { type: "X", projectedAtom: "X0", atoms: ["X0", "X1", "X2"] }
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
      
      // When projection directives are removed (data is empty), clear all selected projections
      // This resets the view back to single graph mode
      if (data.length === 0) {
        // Clear all selected projections for this datum
        Object.keys(selectedProjections).forEach(projectionType => {
          dispatch(selectedProjectionsSet({
            datum,
            projectionType,
            selectedAtoms: []
          }));
        });
        // Also clear window.currentProjections
        if (window.currentProjections) {
          window.currentProjections = {};
        }
        return;
      }
      
      // Initialize selections if empty
      if (data.length > 0) {
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
        
        // Also clean up any old projection types that are no longer in the data
        const validTypeIds = new Set(data.map(d => d.typeId));
        Object.keys(selectedProjections).forEach(projectionType => {
          if (!validTypeIds.has(projectionType)) {
            dispatch(selectedProjectionsSet({
              datum,
              projectionType,
              selectedAtoms: []
            }));
            if (window.currentProjections && window.currentProjections[projectionType]) {
              delete window.currentProjections[projectionType];
            }
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

  // Handle toggling a projection atom selection
  const handleAtomToggle = useCallback((typeId: string, atomId: string) => {
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

  // Don't render if no projection data
  if (projectionData.length === 0) {
    return null;
  }

  return (
    <div className="mx-2 my-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
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
  );
};

export { ProjectionSection };
