import type { ApiMessageEntity } from '../api/types';
import { ApiMessageEntityTypes } from '../api/types';

interface MarkdownNode {
  type: 'text' | 'formatted';
  content: string;
  entityType?: ApiMessageEntityTypes;
  children?: MarkdownNode[];
  language?: string;
  start: number;
  end: number;
  length: number;
}

interface ParsedMarkdown {
  text: string;
  entities: ApiMessageEntity[];
}

const MARKDOWN_TOKENS = {
  bold: '**',
  italic: '__',
  code: '`',
  pre: '```',
  strike: '~~',
  spoiler: '||',
} as const;

export function parseMarkdownAST(markdown: string): ParsedMarkdown {
  const ast = buildAST(markdown);
  return generateFormattedText(ast);
}

function buildAST(markdown: string): MarkdownNode {
  const root: MarkdownNode = {
    type: 'text',
    content: markdown,
    children: [],
    start: 0,
    end: markdown.length,
    length: markdown.length,
  };

  let currentPosition = 0;
  const currentNode = root;

  while (currentPosition < markdown.length) {
    const nextToken = findNextToken(markdown, currentPosition);

    if (!nextToken) {
      if (currentPosition < markdown.length) {
        const remainingText = markdown.substring(currentPosition);
        currentNode.children!.push({
          type: 'text',
          content: remainingText,
          start: currentPosition,
          end: markdown.length,
          length: remainingText.length,
        });
      }
      break;
    }

    const { token, position, type } = nextToken;

    // Add text before the token if there's any
    if (position > currentPosition) {
      const precedingText = markdown.substring(currentPosition, position);
      currentNode.children!.push({
        type: 'text',
        content: precedingText,
        start: currentPosition,
        end: position,
        length: precedingText.length,
      });
    }

    // Handle empty formatting tokens
    const potentialClosingPosition = findClosingToken(markdown, token, position + token.length);
    if (potentialClosingPosition === position + token.length) {
      // This is an empty format, treat it as plain text
      currentNode.children!.push({
        type: 'text',
        content: token + token,
        start: position,
        end: position + (token.length * 2),
        length: (token + token).length,
      });
      currentPosition = position + (token.length * 2);
      continue;
    }

    // Handle code blocks
    if (token === MARKDOWN_TOKENS.pre) {
      const endPosition = markdown.indexOf(MARKDOWN_TOKENS.pre, position + 3);
      if (endPosition === -1 || endPosition === position + 3) {
        // Treat as regular text if it's empty or unclosed
        currentNode.children!.push({
          type: 'text',
          content: markdown.substring(position),
          start: position,
          end: markdown.length,
          length: markdown.length - position,
        });
        currentPosition = markdown.length;
        continue;
      }

      const firstNewline = markdown.indexOf('\n', position + 3);
      const language = firstNewline !== -1 && firstNewline < endPosition
        ? markdown.substring(position + 3, firstNewline).trim()
        : '';

      const contentStart = firstNewline !== -1 ? firstNewline + 1 : position + 3;
      let content = markdown.substring(contentStart, endPosition);

      // Ensure consistent newline handling
      content = content.trimEnd();
      if (content.length > 0) {
        content += '\n';
      }

      currentNode.children!.push({
        type: 'formatted',
        entityType: ApiMessageEntityTypes.Pre,
        content,
        language,
        start: position,
        end: endPosition + 3,
        length: content.length,
      });

      currentPosition = endPosition + 3;
      continue;
    }

    // Handle inline formatting
    const endPosition = findClosingToken(markdown, token, position + token.length);
    if (endPosition === -1) {
      currentNode.children!.push({
        type: 'text',
        content: markdown.substring(position),
        start: position,
        end: markdown.length,
        length: markdown.length - position,
      });
      currentPosition = markdown.length;
      continue;
    }

    // Don't allow formatting across newlines except for code blocks
    if (token !== MARKDOWN_TOKENS.pre) {
      const textBetween = markdown.substring(position, endPosition + token.length);
      if (textBetween.includes('\n')) {
        currentNode.children!.push({
          type: 'text',
          content: markdown.substring(position),
          start: position,
          end: markdown.length,
          length: markdown.length - position,
        });
        currentPosition = markdown.length;
        continue;
      }
    }

    const content = markdown.substring(position + token.length, endPosition);
    currentNode.children!.push({
      type: 'formatted',
      entityType: type,
      content,
      start: position,
      end: endPosition + token.length,
      length: content.length,
    });

    currentPosition = endPosition + token.length;
  }

  return root;
}

function findNextToken(text: string, startPosition: number) {
  let nearestPosition = Infinity;
  let foundToken = '';
  let entityType: ApiMessageEntityTypes | undefined;

  // For code blocks, we search the entire text
  const prePosition = text.indexOf(MARKDOWN_TOKENS.pre, startPosition);
  if (prePosition !== -1 && prePosition < nearestPosition) {
    nearestPosition = prePosition;
    foundToken = MARKDOWN_TOKENS.pre;
    entityType = ApiMessageEntityTypes.Pre;
  }

  // For all other tokens, search only until the next newline
  const nextNewline = text.indexOf('\n', startPosition);
  const searchEnd = nextNewline === -1 ? text.length : nextNewline;

  Object.entries(MARKDOWN_TOKENS).forEach(([format, token]) => {
    if (token === MARKDOWN_TOKENS.pre) return; // Skip pre, already handled

    let position = text.indexOf(token, startPosition);
    while (position !== -1 && position < searchEnd) {
      if (position < nearestPosition) {
        nearestPosition = position;
        foundToken = token;
        entityType = getEntityTypeFromToken(format);
        break;
      }
      position = text.indexOf(token, position + 1);
    }
  });

  if (nearestPosition === Infinity) return undefined;

  return {
    token: foundToken,
    position: nearestPosition,
    type: entityType,
  };
}

function findClosingToken(text: string, token: string, startPosition: number): number {
  // For code blocks, we search across lines
  if (token === MARKDOWN_TOKENS.pre) {
    const position = text.indexOf(token, startPosition);
    return position !== -1 ? position : -1;
  }

  // For all other tokens, search only until the next newline
  const nextNewline = text.indexOf('\n', startPosition);
  const searchEnd = nextNewline === -1 ? text.length : nextNewline;

  const position = text.indexOf(token, startPosition);
  return position !== -1 && position < searchEnd ? position : -1;
}

function getEntityTypeFromToken(format: string): ApiMessageEntityTypes {
  switch (format) {
    case 'bold':
      return ApiMessageEntityTypes.Bold;
    case 'italic':
      return ApiMessageEntityTypes.Italic;
    case 'code':
      return ApiMessageEntityTypes.Code;
    case 'pre':
      return ApiMessageEntityTypes.Pre;
    case 'strike':
      return ApiMessageEntityTypes.Strike;
    case 'spoiler':
      return ApiMessageEntityTypes.Spoiler;
    default:
      return ApiMessageEntityTypes.Unknown;
  }
}

function generateFormattedText(ast: MarkdownNode): ParsedMarkdown {
  const entities: ApiMessageEntity[] = [];
  let plainText = '';
  let offset = 0;

  function processNode(node: MarkdownNode) {
    if (node.type === 'text') {
      if (node.children && node.children.length > 0) {
        node.children.forEach(processNode);
      } else {
        plainText += node.content;
        offset += node.content.length;
      }
    } else if (node.type === 'formatted') {
      plainText += node.content;

      if (node.entityType === ApiMessageEntityTypes.Pre) {
        entities.push({
          type: ApiMessageEntityTypes.Pre,
          offset,
          length: node.length,
          language: node.language,
        });
      } else {
        entities.push({
          type: node.entityType!,
          offset,
          length: node.length,
        } as ApiMessageEntity);
      }

      offset += node.length;
    }
  }

  processNode(ast);

  return {
    text: plainText,
    entities: entities.sort((a, b) => a.offset - b.offset),
  };
}
