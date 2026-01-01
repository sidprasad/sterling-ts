import { DatumParsed, isDatumAlloy } from '@/sterling-connection';
import {
  useSterlingDispatch,
  useSterlingSelector
} from '../../../../../state/hooks';
import {
  selectGraphDrawerThemeRelationExpanded,
  selectGraphDrawerThemeTypeExpanded
} from '../../../../../state/selectors';
import { alloyRelationTree } from './alloyRelationTree';
import { alloyTypeTree } from './alloyTypeTree';
import { RelationStylePanel } from './RelationStylePanel';
import { StylesTree } from './tree/StylesTree';
import { DatumNode } from './tree/types';
import { TypeStylePanel } from './TypeStylePanel';

const StyleSection = ({ datum }: { datum: DatumParsed<any> }) => {
  const isAlloy = isDatumAlloy(datum);
  const typeTree = isAlloy ? alloyTypeTree(datum.parsed) : null;
  const relationTree = isAlloy ? alloyRelationTree(datum.parsed) : null;
  const dispatch = useSterlingDispatch();

  const typeIsOpen = (node: DatumNode): boolean => {
    return useSterlingSelector((state) =>
      selectGraphDrawerThemeTypeExpanded(state, datum, node.id)
    );
  };

  const relationIsOpen = (node: DatumNode): boolean => {
    return useSterlingSelector((state) =>
      selectGraphDrawerThemeRelationExpanded(state, datum, node.id)
    );
  };

  const onTypeToggle = (node: DatumNode) => {
    // no-op: theme drawer removed
    void node;
    void dispatch;
  };

  const onRelationToggle = (node: DatumNode) => {
    // no-op: theme drawer removed
    void node;
    void dispatch;
  };

  return (
    <div className='flex flex-col justify-middle'>
      <div className='prose prose-md font-bold mx-2 my-2 border-b'>Styles</div>
      {typeTree && (
        <StylesTree
          datum={datum}
          tree={typeTree}
          panel={TypeStylePanel}
          isOpen={typeIsOpen}
          onToggle={onTypeToggle}
        />
      )}
      {relationTree && (
        <StylesTree
          datum={datum}
          tree={relationTree}
          panel={RelationStylePanel}
          isOpen={relationIsOpen}
          onToggle={onRelationToggle}
        />
      )}
    </div>
  );
};

export { StyleSection };
