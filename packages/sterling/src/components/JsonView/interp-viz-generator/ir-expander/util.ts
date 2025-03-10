import { ForgeUtil } from '../../forge-evaluator';
import { Tuple } from '../../forge-evaluator/forgeExprEvaluator';

// check if a value is a conditional
export function isConditional(value: any): boolean {
  return value && typeof value === 'object' && value.type === 'conditional';
}

// check if a value needs to be evaluated as a forge expression
export function isForgeExpression(value: any): boolean {
  return typeof value === 'string' && value.startsWith('~');
}

// checks if a string represents a boolean value in the
// format of the forge evaluator
export function isForgeBoolean(str: string): boolean {
  return str === '#t' || str === '#f';
}

// parse a string value returned by the forge evaluator to a boolean
export function parseBoolean(str: string): boolean {
  if (str.toLowerCase() === '#t') {
    return true;
  } else if (str.toLowerCase() === '#f') {
    return false;
  }
  throw new Error(`Invalid boolean string: ${str}`);
}

// checks if a string value is an integer value
export function isNumeric(str: string): boolean {
  return !isNaN(parseInt(str));
}

// checks if a var is referenced in the given string
export function usesVar(str: string, variable: string) {
  const start = str.indexOf('${');
  const end = str.substring(start).indexOf('}');

  if (start === -1 || end === -1) return false;

  if (str.substring(start, start + end).includes(variable)) return true;

  return usesVar(str.substring(start + end + 1), variable);
}

// applies a text renaming to a string
export function applyTextRename(
  currValue: string,
  textRenames: [string, string][]
): string {
  console.log(`applying text rename to ${currValue}`);
  console.log('textRenames', textRenames);
  const [_, replacedText] = textRenames.find(
    ([originalText, _]) => originalText === currValue
  ) || ['', currValue];
  console.log('replacedText', replacedText);
  return replacedText;
}

// evaluates a forge expression using the given forge evaluator util
export function evaluateForgeExpr(query: string, forgeUtil: ForgeUtil) {
  // return forgeUtil.evaluateExpression(query);
  const result = forgeUtil.evaluateExpression(query);
  if (isArray(result) && result.length === 0) {
    return '(())';
  }
  
  // if it is just a single value in a tuple, return the value
  if (isArray(result) && result.length === 1 && isArray(result[0]) && result[0].length === 1 && !isArray(result[0][0])) {
    return result[0][0];
  }
  return result;
}

// handles a conditional value by evaluating the condition and returning
// the appropriate branch (if the value is not a conditional, it is returned
// as is)
export function handleConditional(value: any, forgeUtil: ForgeUtil) {
  if (isConditional(value)) {
    const conditionResult = evaluateForgeExpr(
      value.condition.substring(1),
      forgeUtil
    );
    if (typeof conditionResult === 'string') {
      if (parseBoolean(conditionResult)) {
        return value.then;
      }
      return value.else;
    }
    console.log('conditionResult', conditionResult);
    throw new Error('Condition must evaluate to a boolean value, not tuples!');
  } else {
    return value;
  }
}

// evaluates a value as a forge expression if specified by the user
// (i.e. if the value is a string starting with '~')
// (if the value is not a forge expression, it is returned as is)
export function evaluateForgeProps(value: any, forgeUtil: ForgeUtil) {
  if (value !== undefined && isForgeExpression(value)) {
    return evaluateForgeExpr(value.substring(1), forgeUtil);
  }
  return value;
}

// gets an ordered trace (only works for arity-2 relations)
export function getOrderedTrace(traceData: Tuple[]): Array<string> {
  console.log('traceData', traceData);
  const pairs = traceData.map((tuple) => [tuple[0], tuple[1]]);

  // Create a map to store adjacency relationships
  const adjacencyMap = new Map<string, string>();
  const inDegree = new Map<string, number>();

  // Populate adjacency map and in-degree map
  pairs.forEach(([from, to]) => {
    adjacencyMap.set(from, to);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
    if (!inDegree.has(from)) {
      inDegree.set(from, 0);
    }
  });

  // Find the starting node (in-degree of 0)
  let start = '';
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      start = node;
      break;
    }
  }

  // Construct the linear order
  const result: string[] = [];
  let current = start;
  while (current) {
    result.push(current);
    current = adjacencyMap.get(current) || '';
  }

  return result;
}

// checks if a value is an array
export function isArray(value: any) {
  return Array.isArray(value);
}
