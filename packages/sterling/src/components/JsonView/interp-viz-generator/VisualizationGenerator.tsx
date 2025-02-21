import React, { useEffect, useState } from "react";
import { JsonEntry, VisualizationComponents } from "./ir-expander/ir-expander";
import { DatumParsed } from "@/sterling-connection";

interface VisualizationGeneratorProps {
  datum: DatumParsed<any>;
  jsonIR: JsonEntry[];
  textRenames: [string, string][];
}

export default function VisualizationGenerator(props : VisualizationGeneratorProps) {
  const [VisualizationComponent, setVisualizationComponent] = useState<JSX.Element | null>(null);
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const { datum, jsonIR, textRenames } = props;
  if (!datum) return null;

  useEffect(() => {
    if (jsonIR.length !== 0) {
      try {
        // use the count as a key so that the components have a different key when they are re-rendered
        // from here (from the parent component). this is important since it leads to the stateful
        // variables of the component having their values reset at re-renders from this point
        // (but not when the components are re-rendered due to changes in the value of the stateful
        // variables themselves). since we're enabling the editing of the components from the editing
        // pane, it is important to enable this.
        console.log("json IR being used:", jsonIR);
        const vizComponent = <VisualizationComponents jsonIR={jsonIR} datum={datum} textRenames={textRenames} key={count} />
        setVisualizationComponent((_) => vizComponent);
        setCount(count + 1);
        setError(null);
      } catch (e) {
        console.error("Error generating visualization:", e);
        setError(`Failed to generate visualization: ${e}`);
      }
    } else {
      setVisualizationComponent(null);
      setCount(count + 1);
    }
  }, [jsonIR])

  return (
    <div>
      {error && <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>}

      <div style={{ marginTop: "2rem" }}>{VisualizationComponent}</div>
    </div>
  );
}

// interface VisualizationGeneratorProps {
//   datum: DatumParsed<any>;
// }

// export default function VisualizationGenerator(props : VisualizationGeneratorProps) {
//   const [jsonIRString, setJsonIRString] = useState<string>(""); // Holds the user-provided JSON IR
//   const [VisualizationComponent, setVisualizationComponent] = useState<JSX.Element | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const { datum } = props;
//   if (!datum) return null;

//   const handleGenerateVisualization = async () => {
//     try {
//       // Parse the JSON IR
//       const jsonIR: JsonEntry[] = JSON.parse(jsonIRString);

//       // Generate React components
//       if (jsonIRString.length !== 0) {
//         const vizComponent = <VisualizationComponents jsonIR={jsonIR} datum={datum} />;
//         setVisualizationComponent((prev) => vizComponent);
//       }

//       setError(null);
//     } catch (e) {
//       console.error("Error generating visualization:", e);
//       setError(`Failed to generate visualization: ${e}`);
//     }
//   };

//   return (
//     <div>
//       {VisualizationComponent === null && (
//         <div>
//           <h1>Visualization Generator</h1>

//           <textarea
//             rows={10}
//             cols={50}
//             value={jsonIRString}
//             onChange={(e) => setJsonIRString(e.target.value)}
//             placeholder="Enter JSON IR here..."
//             style={{ marginBottom: "1rem", fontFamily: "monospace" }}
//           />

//           <div>
//             <button onClick={handleGenerateVisualization}>
//               Generate Visualization
//             </button>
//           </div>
//         </div>
//       )}

//       {error && <div style={{ color: "red", marginTop: "1rem" }}>{error}</div>}

//       <div style={{ marginTop: "2rem" }}>{VisualizationComponent}</div>
//     </div>
//   );
// }
