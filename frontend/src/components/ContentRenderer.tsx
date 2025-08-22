// src/components/ContentRenderer.tsx
'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Minimal prop types so we don't depend on react-markdown's internal paths */
type CodeBlockProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  node?: unknown;
};

type PreBlockProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLPreElement>,
  HTMLPreElement
> & {
  node?: unknown;
};

/** Convert "bullet walls" to paragraphs where lines are just "- text" */
function stripLeadingDashes(md: string) {
  const lines = md.split('\n');
  let dashCount = 0;
  for (const ln of lines) if (ln.trim().startsWith('- ')) dashCount++;
  if (dashCount >= Math.max(5, Math.floor(lines.length * 0.5))) {
    return lines.map(l => l.trim().replace(/^- +/, '')).join('\n');
  }
  return md;
}

export default function ContentRenderer({ markdown }: { markdown: string }) {
  const [showCode, setShowCode] = useState(false);
  const cleaned = useMemo(() => stripLeadingDashes(markdown ?? ''), [markdown]);

  /** Inline code stays visible; fenced code visibility is controlled by <pre> */
  const Code = ({ inline, className, children, ...props }: CodeBlockProps) => {
    if (inline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    // For block code, we still render <code>, but <pre> wrapper controls visibility via CSS.
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };

  const Pre = ({ className, ...props }: PreBlockProps) => (
    <pre className={(showCode ? 'show ' : '') + (className ?? '')} {...props} />
  );

  const components: Components = {
    h1({ node, ...props }) {
      return <h2 {...props} />;
    },
    h2({ node, ...props }) {
      return <h3 {...props} />;
    },
    h3({ node, ...props }) {
      return <h3 {...props} />;
    },
    ul({ node, ...props }) {
      return <ul {...props} />;
    },
    ol({ node, ...props }) {
      return <ol {...props} />;
    },
    pre: Pre as any, // cast keeps TS happy across react-markdown versions
    code: Code as any,
  };

  return (
    <div className="content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleaned}
      </ReactMarkdown>

      {/* Toggle for code blocks to avoid random Python for non-coding lessons */}
      <div style={{ marginTop: 10 }} className="small text-muted">
        <button className="btn ghost" onClick={() => setShowCode(s => !s)}>
          {showCode ? 'Hide code snippets' : 'Show code snippets'}
        </button>
      </div>
    </div>
  );
}
