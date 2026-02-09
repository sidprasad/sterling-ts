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

  // Listen for projection data updates
  useEffect(() => {
    const handleProjectionData = (event: CustomEvent<ProjectionTypeData[]>) => {
      const data = event.detail;
      setProjectionData(data);
    };

    window.addEventListener('projectionDataUpdated', handleProjectionData as EventListener);

    // Check if data was already received before this component mounted
    const existingData = (window as any).__lastProjectionData;
    if (existingData && existingData.length > 0) {
      handleProjectionData({ detail: existingData } as CustomEvent<ProjectionTypeData[]>);
    } else {
      setProjectionData([]);
    }

    return () => {
      window.removeEventListener('projectionDataUpdated', handleProjectionData as EventListener);
    };
  }, [datum]);

  // Reset local state when datum changes
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
