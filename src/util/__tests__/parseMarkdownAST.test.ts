import { ApiMessageEntityTypes } from '../../api/types';

import { parseMarkdownAST } from '../parseMarkdownAST';

describe('parseMarkdownAST', () => {
  // Basic formatting tests
  test('handles basic formatting', () => {
    const tests = [
      {
        input: '**bold text**',
        expected: {
          text: 'bold text',
          entities: [{ type: ApiMessageEntityTypes.Bold, offset: 0, length: 9 }],
        },
      },
      {
        input: '__italic text__',
        expected: {
          text: 'italic text',
          entities: [{ type: ApiMessageEntityTypes.Italic, offset: 0, length: 11 }],
        },
      },
      {
        input: '`code text`',
        expected: {
          text: 'code text',
          entities: [{ type: ApiMessageEntityTypes.Code, offset: 0, length: 9 }],
        },
      },
      {
        input: '~~strike text~~',
        expected: {
          text: 'strike text',
          entities: [{ type: ApiMessageEntityTypes.Strike, offset: 0, length: 11 }],
        },
      },
      {
        input: '||spoiler text||',
        expected: {
          text: 'spoiler text',
          entities: [{ type: ApiMessageEntityTypes.Spoiler, offset: 0, length: 12 }],
        },
      },
    ];

    tests.forEach(({ input, expected }) => {
      expect(parseMarkdownAST(input)).toEqual(expected);
    });
  });

  // Empty formatting tests
  test('handles empty formatting tokens as plain text', () => {
    const tests = [
      {
        input: '****',
        expected: { text: '****', entities: [] },
      },
      {
        input: '____',
        expected: { text: '____', entities: [] },
      },
      {
        input: '``',
        expected: { text: '``', entities: [] },
      },
      {
        input: '~~~~',
        expected: { text: '~~~~', entities: [] },
      },
      {
        input: '||||',
        expected: { text: '||||', entities: [] },
      },
    ];

    tests.forEach(({ input, expected }) => {
      expect(parseMarkdownAST(input)).toEqual(expected);
    });
  });

  // Code block tests
  test('handles code blocks', () => {
    const tests = [
      {
        input: '```python\ndef hello():\n    print("world")\n```',
        expected: {
          text: 'def hello():\n    print("world")\n',
          entities: [{
            type: ApiMessageEntityTypes.Pre,
            offset: 0,
            length: 32,
            language: 'python',
          }],
        },
      },
      {
        input: '```\nno language```',
        expected: {
          text: 'no language\n',
          entities: [{
            type: ApiMessageEntityTypes.Pre,
            offset: 0,
            length: 12,
            language: '',
          }],
        },
      },
      {
        input: '``````',
        expected: { text: '``````', entities: [] },
      },
    ];

    tests.forEach(({ input, expected }) => {
      expect(parseMarkdownAST(input)).toEqual(expected);
    });
  });

  // Newline preservation tests
  test('preserves newlines', () => {
    const input = '****\n____\n``\n~~~~\n||||';
    const expected = {
      text: '****\n____\n``\n~~~~\n||||',
      entities: [],
    };

    expect(parseMarkdownAST(input)).toEqual(expected);
  });

  // Mixed formatting tests
  test('handles mixed formatting in same line', () => {
    const input = '**bold** and __italic__ and `code`';
    const expected = {
      text: 'bold and italic and code',
      entities: [
        { type: ApiMessageEntityTypes.Bold, offset: 0, length: 4 },
        { type: ApiMessageEntityTypes.Italic, offset: 9, length: 6 },
        { type: ApiMessageEntityTypes.Code, offset: 20, length: 4 },
      ],
    };

    expect(parseMarkdownAST(input)).toEqual(expected);
  });

  // Invalid/unclosed formatting tests
  test('handles invalid or unclosed formatting as plain text', () => {
    const tests = [
      {
        input: '**bold text',
        expected: { text: '**bold text', entities: [] },
      },
      {
        input: 'unclosed format__',
        expected: { text: 'unclosed format__', entities: [] },
      },
      {
        input: '`code with no end',
        expected: { text: '`code with no end', entities: [] },
      },
    ];

    tests.forEach(({ input, expected }) => {
      expect(parseMarkdownAST(input)).toEqual(expected);
    });
  });

  // Cross-line formatting tests
  test('formatting must be on the same line', () => {
    const tests = [
      {
        input: '**bold\ntext**',
        expected: { text: '**bold\ntext**', entities: [] },
      },
      {
        input: '__italic\ntext__',
        expected: { text: '__italic\ntext__', entities: [] },
      },
      {
        input: '`code\ntext`',
        expected: { text: '`code\ntext`', entities: [] },
      },
      {
        // Code blocks are the exception
        input: '```\ncode block\n```',
        expected: {
          text: 'code block\n',
          entities: [{
            type: ApiMessageEntityTypes.Pre,
            offset: 0,
            length: 11,
            language: '',
          }],
        },
      },
    ];

    tests.forEach(({ input, expected }) => {
      expect(parseMarkdownAST(input)).toEqual(expected);
    });
  });
});