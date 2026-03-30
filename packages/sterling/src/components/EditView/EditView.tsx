import { Pane, PaneBody, PaneHeader, PaneTitle } from '@/sterling-ui';
import { useCallback, useRef, useState } from 'react';
import { useSterlingSelector } from '../../state/hooks';
import {
  selectActiveDatum,
  selectCnDSpec,
  selectTimeIndex,
  selectProjectionConfig,
  selectSequencePolicyName
} from '../../state/selectors';
import { SpyTialEditGraph } from './SpyTialEditGraph';
import type { LayoutState } from '../GraphView/SpyTialGraph';
import { getSpytialCore } from '../../utils/spytialCore';

const EditView = () => {
  const datum = useSterlingSelector(selectActiveDatum);
  const cndSpec = useSterlingSelector((state) =>
    datum ? selectCnDSpec(state, datum) : ''
  );
  const timeIndex = useSterlingSelector((state) =>
    datum ? selectTimeIndex(state, datum) : 0
  );
  const projectionConfig = useSterlingSelector((state) =>
    datum ? selectProjectionConfig(state, datum) : []
  ) || [];
  const sequencePolicyName = useSterlingSelector((state) =>
    datum ? selectSequencePolicyName(state, datum) : undefined
  );

  const layoutStateRef = useRef<LayoutState | undefined>(undefined);
  const graphElementRef = useRef<HTMLElementTagNameMap['structured-input-graph'] | null>(null);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleLayoutStateChange = useCallback((state: LayoutState) => {
    layoutStateRef.current = state;
  }, []);

  const handleDataExported = useCallback((data: string, format: string, reified: unknown) => {
    // The reified data is the inst string — copy to clipboard
    navigator.clipboard.writeText(data).then(() => {
      setExportFeedback('Copied to clipboard!');
      setTimeout(() => setExportFeedback(null), 2000);
    }).catch((err) => {
      console.error('Failed to copy to clipboard:', err);
      setExportFeedback('Failed to copy');
      setTimeout(() => setExportFeedback(null), 2000);
    });
  }, []);

  const handleExport = useCallback(() => {
    // Trigger the structured-input-graph's internal export (which calls reify())
    // by dispatching a synthetic action. The element's exportDataAsJSON is private,
    // so we trigger it via the built-in export button or directly invoke reify on the data instance.
    const el = graphElementRef.current as any;
    if (el && typeof el.exportDataAsJSON === 'function') {
      el.exportDataAsJSON();
    } else if (el?.dataInstance && typeof el.dataInstance.reify === 'function') {
      // Fallback: directly reify from the data instance
      const reified = el.dataInstance.reify();
      const exportString = typeof reified === 'string'
        ? reified
        : JSON.stringify(reified, null, 2);
      handleDataExported(exportString, typeof reified === 'string' ? 'text' : 'json', reified);
    }
  }, [handleDataExported]);

  const handleLoadFromInstance = useCallback(() => {
    if (!datum?.data || !graphElementRef.current) return;

    const core = getSpytialCore();
    if (!core) return;

    try {
      const alloyDatum = core.AlloyInstance.parseAlloyXML(datum.data);
      if (!alloyDatum.instances || alloyDatum.instances.length === 0) return;

      const instanceIndex = timeIndex !== undefined
        ? Math.min(timeIndex, alloyDatum.instances.length - 1)
        : 0;
      const alloyDataInstance = new core.AlloyDataInstance(alloyDatum.instances[instanceIndex]);

      if (graphElementRef.current.setDataInstance) {
        graphElementRef.current.setDataInstance(alloyDataInstance);
        // setDataInstance registers listeners but doesn't render — trigger layout explicitly
        const el = graphElementRef.current as any;
        if (typeof el.enforceConstraintsAndRegenerate === 'function') {
          el.enforceConstraintsAndRegenerate();
        }
      }
    } catch (err: any) {
      console.error('Failed to load instance:', err);
    }
  }, [datum, timeIndex]);

  return (
    <Pane className='grid grid-flow-col divide-x divide-dashed'>
      <div className='relative'>
        <Pane>
          <PaneHeader className='border-b'>
            <div className='w-full flex items-center px-2 space-x-2'>
              <PaneTitle className='text-gray-400'>Edit</PaneTitle>
              {datum && (
                <PaneTitle>{datum.parsed.command}</PaneTitle>
              )}
              <div className='grow' />
              {datum && (
                <button
                  type="button"
                  onClick={handleLoadFromInstance}
                  className="px-3 py-1 text-xs font-medium rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition"
                >
                  Load from Instance
                </button>
              )}
              <button
                type="button"
                onClick={handleExport}
                className="px-3 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-500 transition"
              >
                Export as inst
              </button>
              {exportFeedback && (
                <span className="text-xs text-green-600 font-medium">
                  {exportFeedback}
                </span>
              )}
            </div>
          </PaneHeader>
          <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-700 text-xs">
            Experimental feature — Edit mode is under active development.
          </div>
          <PaneBody>
            <SpyTialEditGraph
              datum={datum}
              cndSpec={cndSpec}
              timeIndex={timeIndex}
              priorState={layoutStateRef.current}
              onLayoutStateChange={handleLayoutStateChange}
              projectionConfig={projectionConfig}
              sequencePolicyName={sequencePolicyName}
              onDataExported={handleDataExported}
              graphElementRef={graphElementRef}
            />
          </PaneBody>
        </Pane>
      </div>
    </Pane>
  );
};

export { EditView };
