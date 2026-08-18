'use client';

import React from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
export type FormattedTextVariant = 'paragraph' | 'bullets' | 'numbered' | 'steps';

interface FormattedTextProps {
  content: string | null | undefined;
  className?: string;
  variant?: FormattedTextVariant;
}

// ─── URL regex for linkification inside step text ───────────────────────────
const URL_RE = /https?:\/\/[^\s,)>"']+\.[a-zA-Z]{2,}[^\s,)>"']*/g;

function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(URL_RE.source, 'g');

  while ((match = regex.exec(text)) !== null) {
    const url = match[0].replace(/[.,;:]+$/, '');
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 break-all transition-colors"
      >
        {url}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// ─── Splitting helpers ──────────────────────────────────────────────────────

function splitStepsVariant(text: string): { preamble: string; items: string[] } {
  // Matches "Step-1", "Step 1:", "1.", "1)", etc.
  const stepRegex = /(?:^|\n|\s)(?:Step[\s-]?\d+\s*[.:]?|\d+[.)])/gi;
  
  const indices: { start: number; length: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = stepRegex.exec(text)) !== null) {
    const matchedStr = m[0];
    const leadingWhitespaceMatch = matchedStr.match(/^[\n\s]+/);
    const leadingWhitespaceLen = leadingWhitespaceMatch ? leadingWhitespaceMatch[0].length : 0;
    
    indices.push({ 
      start: m.index + leadingWhitespaceLen, 
      length: matchedStr.length - leadingWhitespaceLen 
    });
  }

  if (indices.length === 0) {
    const merged = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return { preamble: '', items: merged ? [merged] : [] };
  }

  const preamble = text.slice(0, indices[0].start).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const items: string[] = [];

  for (let i = 0; i < indices.length; i++) {
    const contentStart = indices[i].start + indices[i].length;
    const contentEnd = i + 1 < indices.length ? indices[i + 1].start : text.length;
    let chunk = text.slice(contentStart, contentEnd);
    chunk = chunk.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (chunk) {
      items.push(chunk);
    }
  }

  return { preamble, items };
}

function splitByNumberedPrefixes(text: string): string[] {
  const regex = /(?:^|\n)\s*(\d+)\s*[.)]\s+/g;
  const indices: { start: number; matchLength: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = regex.exec(text)) !== null) {
    indices.push({ start: m.index, matchLength: m[0].length });
  }

  if (indices.length < 2) return [];

  const items: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    const contentStart = indices[i].start + indices[i].matchLength;
    const contentEnd = i + 1 < indices.length ? indices[i + 1].start : text.length;
    const chunk = text.slice(contentStart, contentEnd).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (chunk) items.push(chunk);
  }

  return items;
}

function splitByBulletMarkers(text: string): string[] {
  const lines = text.split(/\n/);
  const items: string[] = [];
  let currentItem = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[-•*►●○]\s+/.test(trimmed)) {
      if (currentItem) items.push(currentItem.replace(/\s+/g, ' ').trim());
      currentItem = trimmed.replace(/^[-•*►●○]\s+/, '');
    } else if (currentItem) {
      currentItem += ' ' + trimmed;
    } else {
      currentItem = trimmed;
    }
  }
  if (currentItem) items.push(currentItem.replace(/\s+/g, ' ').trim());

  const bulletCount = text.split(/\n/).filter((l) => /^\s*[-•*►●○]\s+/.test(l)).length;
  return bulletCount >= 2 ? items : [];
}

function splitByNewlines(text: string): string[] {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.length >= 2 ? lines : [];
}

function splitBySentences(text: string): string[] {
  const parts = text.split(/\.\s+(?=[A-Z])/).map((s) => s.trim().replace(/\.$/, '').trim());
  return parts.filter((p) => p.length > 0);
}

function splitContent(text: string, variant: FormattedTextVariant): { preamble: string; items: string[] } {
  if (variant === 'paragraph') return { preamble: '', items: [] };

  let processed = text.replace(/\\n/g, '\n');

  if (variant === 'steps') {
    const stepsData = splitStepsVariant(processed);
    if (stepsData.items.length >= 2) return stepsData;
    if (stepsData.items.length === 1 && stepsData.preamble) return stepsData;
  }

  const byNumbers = splitByNumberedPrefixes(processed);
  if (byNumbers.length >= 2) return { preamble: '', items: byNumbers };

  const byBullets = splitByBulletMarkers(processed);
  if (byBullets.length >= 2) return { preamble: '', items: byBullets };

  const byNewlines = splitByNewlines(processed);
  if (byNewlines.length >= 2) return { preamble: '', items: byNewlines };

  const bySentences = splitBySentences(processed);
  if (bySentences.length >= 2) return { preamble: '', items: bySentences };

  const merged = processed.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  return { preamble: '', items: merged ? [merged] : [] };
}

function cleanItem(item: string): string {
  return item
    .replace(/^[\s\-•*►●○]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^Step\s*\d+\s*[.:]?\s*/i, '')
    .replace(/[.,;:]+$/, '')
    .trim();
}

function preprocess(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/&lt;p&gt;/gi, '\n')
    .replace(/&lt;\/p&gt;/gi, '\n')
    .replace(/&lt;li&gt;/gi, '\n• ')
    .replace(/&lt;\/li&gt;/gi, '')
    .replace(/&lt;ul&gt;/gi, '')
    .replace(/&lt;\/ul&gt;/gi, '')
    .replace(/&lt;ol&gt;/gi, '')
    .replace(/&lt;\/ol&gt;/gi, '')
    .replace(/&lt;b&gt;/gi, '')
    .replace(/&lt;\/b&gt;/gi, '')
    .replace(/&lt;strong&gt;/gi, '')
    .replace(/&lt;\/strong&gt;/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?p>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<\/?[uo]l>/gi, '')
    .replace(/<\/?(?:b|strong)>/gi, '');
}

export default function FormattedText({
  content,
  className = '',
  variant = 'paragraph',
}: FormattedTextProps) {
  if (!content) return null;

  const processed = preprocess(content);
  
  if (variant === 'paragraph') {
    const paragraphs = processed
      .split(/\n\n+/)
      .map((p) => p.replace(/\n/g, ' ').trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) paragraphs.push(processed.trim());

    return (
      <div className={`space-y-3 ${className}`}>
        {paragraphs.map((para, idx) => (
          <p key={idx} className="text-sm leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    );
  }

  const { preamble, items } = splitContent(processed, variant);

  const renderItems = () => {
    if (variant === 'bullets') {
      return (
        <ul className={`space-y-3 ${className}`}>
          {items.map((item, idx) => {
            const cleaned = cleanItem(item);
            if (!cleaned) return null;
            return (
              <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                <span>{cleaned}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    if (variant === 'numbered') {
      return (
        <ol className={`space-y-3 ${className}`}>
          {items.map((item, idx) => {
            const cleaned = cleanItem(item);
            if (!cleaned) return null;
            return (
              <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed">
                <span className="mt-0.5 w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{cleaned}</span>
              </li>
            );
          })}
        </ol>
      );
    }

    if (variant === 'steps') {
      return (
        <ol className={`space-y-4 ${className}`}>
          {items.map((item, idx) => {
            const cleaned = cleanItem(item);
            if (!cleaned) return null;
            return (
              <li key={idx} className="flex items-start gap-4 text-sm leading-relaxed">
                <span className="mt-0.5 w-7 h-7 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-400 flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-1">{linkify(cleaned)}</span>
              </li>
            );
          })}
        </ol>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      {preamble && (
        <p className={`text-sm font-semibold leading-relaxed text-slate-300 ${className}`}>
          {preamble}
        </p>
      )}
      {items.length > 0 && renderItems()}
    </div>
  );
}
