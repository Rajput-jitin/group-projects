'use client';

import React from 'react';
import FormattedText from '@/components/FormattedText';

export const MarkdownRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  return (
    <div className="markdown-body">
      <FormattedText content={markdown} variant="paragraph" />
    </div>
  );
};

export default MarkdownRenderer;
