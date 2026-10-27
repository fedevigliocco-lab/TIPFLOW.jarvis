import { Fragment, type ReactNode } from "react";

// Un lettore di Markdown minimo per le bozze degli agenti: titoli, elenchi, grassetto, corsivo.
// Non usa HTML grezzo, quindi il testo degli agenti non può iniettare nulla nella pagina.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|(?<!\w)_[^_]+_(?!\w))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function lines(text: string): ReactNode[] {
  return text.split("\n").map((line, i, all) => (
    <Fragment key={i}>
      {inline(line)}
      {i < all.length - 1 && <br />}
    </Fragment>
  ));
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="doc">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) return <h2 key={i}>{inline(block.slice(3))}</h2>;
        if (block.startsWith("# ")) return <h1 key={i}>{inline(block.slice(2))}</h1>;
        const rows = block.split("\n");
        if (rows.every((r) => r.startsWith("- "))) {
          return <ul key={i}>{rows.map((r, j) => <li key={j}>{inline(r.slice(2))}</li>)}</ul>;
        }
        return <p key={i}>{lines(block)}</p>;
      })}
    </div>
  );
}
