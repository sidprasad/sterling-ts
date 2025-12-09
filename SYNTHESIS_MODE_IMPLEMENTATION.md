# Selector Synthesis Mode - Implementation Summary

## Overview
Implemented a complete selector synthesis workflow in Sterling that allows users to automatically generate selector expressions by providing examples across multiple instances.

## Architecture

### State Management (`/state/synthesis/`)
- **synthesis.ts**: Core state types and interfaces
  - `SynthesisExample`: Captures user selections per instance
  - `SynthesisResult`: Synthesized selector with match data
  - `SynthesisState`: Overall workflow state
- **synthesisReducers.ts**: Redux reducers for all synthesis actions
- **synthesisSlice.ts**: Redux toolkit slice
- **synthesisSelectors.ts**: Memoized selectors for component consumption
- Integrated into main store as `state.synthesis`

### UI Components (`/components/AppDrawer/graph/synthesis/`)
- **SynthesisModePanel.tsx**: Main orchestrator
  - Progress tracking
  - Step navigation
  - Synthesis API integration
  - Error handling
  
- **SynthesisSetupStep.tsx**: Initial configuration
  - Number of instances selector (2-10)
  - Instance batch loading
  - Workflow explanation
  
- **SynthesisExampleStep.tsx**: Example collection
  - Atom selection interface
  - Per-instance example tracking
  - Visual feedback for selections
  
- **SynthesisResultStep.tsx**: Results display
  - Synthesized selector preview
  - Match comparison across instances
  - Diff visualization (exact vs partial matches)
  - Accept/reject actions

### Integration
- **GraphLayoutDrawer.tsx**: Entry point
  - "Synthesize Selector" button
  - Mode switching (editor ↔ synthesis)
  - CnD spec integration

- **SpyTialGraph.tsx**: Type declarations
  - Extended `window.CndCore` with synthesis APIs
  - `synthesizeAtomSelector()`
  - `synthesizeAtomSelectorWithExplanation()`
  - `SGraphQueryEvaluator` for evaluation

## User Workflow

### 1. Enter Synthesis Mode
- User clicks "Synthesize Selector" in Layout Drawer
- Prompted to choose number of instances (default: 3)
- System loads N instances from Alloy XML

### 2. Collect Examples
- For each instance (1 to N):
  - User selects atoms that should match the selector
  - Can select multiple atoms per instance
  - Progress bar shows completion status
  - Navigation: Previous/Next buttons

### 3. Synthesize
- After all N examples collected:
  - "Synthesize Selector" button enabled
  - Calls `CndCore.synthesizeAtomSelectorWithExplanation()`
  - Generates selector expression (e.g., `Student & Adult`)

### 4. Review Results
- Shows synthesized selector prominently
- Displays matches per instance:
  - ✓ **Exact**: Matches exactly what user selected
  - ⚠ **Partial**: Matches some atoms, but not all
  - Shows extra matches that weren't selected
- Explanation/provenance available

### 5. Accept or Reject
- **Accept**: Inserts selector into CnD spec as comment
- **Reject**: Exits synthesis mode, can try again
- Selector ready to use in constraints/directives

## Key Features

### Multi-Instance Analysis
- Loads N instances upfront (batch loading)
- Ensures selector generalizes across multiple examples
- Prevents overfitting to single instance

### Progressive Disclosure
- Step-by-step workflow
- Clear progress indicators
- Contextual instructions at each step

### Diff Visualization
- Shows what user selected vs what selector matches
- Highlights discrepancies
- Helps user understand selector behavior

### Error Handling
- Synthesis failures gracefully handled
- Clear error messages
- Allows retry

## Technical Details

### APIs Used
```typescript
// From SpyTial-Core (window.CndCore)
synthesizeAtomSelectorWithExplanation(
  examples: Array<{
    atoms: any[];
    dataInstance: AlloyDataInstance;
  }>,
  maxDepth?: number
): {
  expression: string;
  examples: Array<{ why: any }>;
}

// Evaluation for verification
SGraphQueryEvaluator.evaluate(expression: string)
```

### Redux Actions
- `enterSynthesisMode(numInstances)` - Start workflow
- `exitSynthesisMode()` - Cancel/exit
- `synthesisInstancesLoaded(instances)` - Batch load complete
- `addSynthesisExample(example)` - User confirms selection
- `updateSynthesisExample(instanceIndex, atomIds)` - Modify selection
- `setSynthesisResult(result)` - Synthesis complete
- `setSynthesisError(error)` - Handle failures
- `synthesisStepBack()` - Navigate backward

### State Shape
```typescript
synthesis: {
  isActive: boolean;
  numInstances: number;
  currentStep: number; // 0=setup, 1-N=collection, N+1=results
  examples: SynthesisExample[];
  loadedInstances: AlloyDataInstance[];
  result: SynthesisResult | null;
  error: string | null;
  isLoading: boolean;
}
```

## Future Enhancements

### Potential Additions
1. **Binary selectors**: Support for relation/edge synthesis
2. **Negative examples**: "Don't match these atoms"
3. **Interactive refinement**: Adjust synthesis parameters
4. **Selector library**: Save/reuse common selectors
5. **Visual graph selection**: Click atoms directly in rendered graph
6. **Batch synthesis**: Generate multiple selectors at once
7. **Export/import**: Share synthesis examples

### UX Improvements
1. **Instance preview**: Show graph previews during selection
2. **Undo/redo**: Per-instance selection history
3. **Keyboard shortcuts**: Fast navigation
4. **Synthesis hints**: Suggest when synthesis might help
5. **Performance**: Handle larger instance counts (>10)

## Testing Considerations

### Test Scenarios
- [ ] Load 2, 5, 10 instances successfully
- [ ] Select atoms across all instances
- [ ] Successful synthesis with exact matches
- [ ] Partial matches handled correctly
- [ ] Synthesis failure error handling
- [ ] Exit mode at each step
- [ ] Navigate backward through steps
- [ ] Accept selector and verify CnD spec update
- [ ] Reject and retry workflow

### Edge Cases
- No atoms in instance
- All atoms selected
- Empty selection in one instance
- Synthesis times out
- CndCore not available
- Invalid Alloy XML

## Documentation

User-facing documentation should cover:
1. When to use synthesis (complex selectors)
2. How many instances to use (3-5 typical)
3. What makes good examples (diverse, representative)
4. How to read synthesis results (match accuracy)
5. Using synthesized selectors in specs

## Performance Notes
- Synthesis complexity: O(grammar_size^maxDepth)
- Default maxDepth=3 is reasonable for most cases
- Larger maxDepth may timeout (consider async with progress)
- Instance loading is synchronous (could parallelize)

---

**Status**: ✅ Fully implemented, ready for testing
**Branch**: `diff` (or appropriate feature branch)
**Next Steps**: Integration testing, user documentation, demo video
