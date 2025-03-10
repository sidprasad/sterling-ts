import { ForgeUtil } from "../forge-evaluator";

type Predicate = {
  name: string;
  args?: string[]; // list of argument names
  body: string[]; // list of conjunctions (each conjunction is a single expr)
}

// extract predicates
export function extractPredicates(fileContent: string): string[] {
  // TODO: implement this
  console.log('fileContent:', fileContent);

  const predicateRegex = /pred\s+(\w+)(\[[^\]]*\])?\s*\{([\s\S]*?)\}/g;
  let match;
  let predicates: string[] = [];

  while ((match = predicateRegex.exec(fileContent)) !== null) {
      const name = match[1]; // Predicate name
      const args = match[2] || ''; // Arguments (optional)
      let body = match[3]; // Predicate body
      console.log('body:', body);

      // filter out all occurrences of "&#xA;" from the body
      body = body.replaceAll('&#xA;', '');

      // filter out occurrences of "// " from the body
      body = body.replaceAll('// ', '');

      predicates.push(`pred ${name}${args} {${body}}`);
  }

  console.log('predicates:', predicates);

  // look at the first predicate as an example:
  const firstPred = predicates[0];
  console.log(firstPred);

  return predicates;
}