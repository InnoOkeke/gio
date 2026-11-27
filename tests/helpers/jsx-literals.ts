import ts from 'typescript';

export interface Literal {
  line: number;
  kind: 'text' | 'attr' | 'expr';
  text: string;
}

/** Attributes whose string value a child reads or a screen reader says. */
const ATTRS = new Set(['aria-label', 'title', 'placeholder', 'alt', 'aria-description', 'aria-roledescription']);
const LETTER = /\p{L}/u;

/**
 * Finds user-visible English literals in a TSX file: JSX text nodes, string literals in
 * aria-label/title/placeholder/alt attributes, and string literals (or template pieces) placed
 * straight in JSX as `{'text'}`. Anything that goes through t(...) is not a literal.
 */
export function scanLiterals(fileName: string, source: string): Literal[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Literal[] = [];
  const at = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const visit = (n: ts.Node) => {
    if (ts.isJsxText(n)) {
      const text = n.text.replace(/\s+/g, ' ').trim();
      if (text && LETTER.test(text)) out.push({ line: at(n), kind: 'text', text });
    } else if (ts.isJsxAttribute(n) && ATTRS.has(n.name.getText(sf)) && n.initializer) {
      const init = n.initializer;
      if (ts.isStringLiteral(init) && LETTER.test(init.text)) out.push({ line: at(n), kind: 'attr', text: init.text });
      else if (ts.isJsxExpression(init) && init.expression) {
        const e = init.expression;
        if ((ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && LETTER.test(e.text)) out.push({ line: at(n), kind: 'attr', text: e.text });
        else if (ts.isTemplateExpression(e)) {
          const pieces = [e.head.text, ...e.templateSpans.map((s) => s.literal.text)].join(' ').trim();
          if (LETTER.test(pieces)) out.push({ line: at(n), kind: 'attr', text: pieces });
        }
      }
    } else if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const e = n.expression;
      if ((ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) && LETTER.test(e.text) && e.text.trim().length > 0) {
        out.push({ line: at(n), kind: 'expr', text: e.text });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}
