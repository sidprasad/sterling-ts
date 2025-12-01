# sterling-ts

https://sterling-docs.vercel.app/

## How to run

```
yarn install
```
and then either:
* `yarn run dev:forge` (run in dev mode for Forge)
* `yarn run dev:alloy` (run in dev mode for Alloy; this is needed if you use the mock provider).

Now Sterling runs on localhost:8081. If you're running versus Forge, note the instance-provider port and append it to the URL for dev Sterling. E.g., `localhost:8081/?62703` if the provider port is `62703`. In Forge, you can use the `sterling_port` option to set the provider port to something constant, so you can avoid having to edit the Sterling URL every run.

```

### How to load a mock trace directly 

Go to `Manual Datum` near the bottom of the screen and paste in Alloy-style instance XML. 

### Notes on locations 

- For layout/theme changes:
  - RelationStylePanel.tsx
  - `alloy-graph/srcnew` + `generateGraph.ts` is the new graph layout (and this is where the theme is applied)
  
- **SpyTial/CnD Integration**: The Graph view now uses SpyTial (Cope and Drag) for visualization instead of DAGRE
  - `GraphView/SpyTialGraph.tsx` - The React component that wraps the SpyTial `webcola-cnd-graph` custom element
  - `AppDrawer/graph/theme/GraphLayoutDrawer.tsx` - The layout drawer where you can edit and apply CnD specifications
  - CnD specifications are stored in Redux state and trigger re-renders of the SpyTial graph




## How to build

To build:
* `yarn run build:forge` (use this if updating Forge) or 
* `yarn run build:alloy`. 

Building will produce many files in `dist` (there are subfolders). To update Forge, copy these into the `sterling/build` folder, after deleting everything that is already there (including subfolders).

