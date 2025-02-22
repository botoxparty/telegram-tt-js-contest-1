import type { RefObject } from '../../../../lib/teact/teact';
import { useEffect, useRef } from '../../../../lib/teact/teact';

import { getCaretPosition, setCaretPosition } from '../../../../util/selection';

interface SelectionState {
  start: number;
  end: number;
  isCollapsed: boolean;
}

interface HistoryEntry {
  html: string;
  selectionState: SelectionState;
}

interface ChatHistory {
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  lastSavedHtml: string;
}

export function useEditorHistory(inputRef: RefObject<HTMLDivElement | null>, chatId: string) {
  const chatHistoryRef = useRef<Record<string, ChatHistory>>({});
  const isProcessingActionRef = useRef(false);
  const saveTimeoutIdRef = useRef<number>();

  const maxStackSize = 100;
  const debounceTime = 100;

  // Initialize history for new chats
  useEffect(() => {
    if (!chatHistoryRef.current[chatId]) {
      chatHistoryRef.current[chatId] = {
        undoStack: [{
          html: '',
          selectionState: { start: 0, end: 0, isCollapsed: true },
        }],
        redoStack: [],
        lastSavedHtml: '',
      };
    }
  }, [chatId]);

  // Cleanup old chat histories to prevent memory leaks
  useEffect(() => {
    const maxStoredChats = 10; // Only keep history for the 10 most recent chats
    const chatIds = Object.keys(chatHistoryRef.current);

    if (chatIds.length > maxStoredChats) {
      const chatIdsToRemove = chatIds
        .filter((id) => id !== chatId) // Don't remove current chat
        .slice(0, chatIds.length - maxStoredChats);

      chatIdsToRemove.forEach((id) => {
        delete chatHistoryRef.current[id];
      });
    }
  }, [chatId]);

  const saveCurrentState = () => {
    const input = inputRef.current;
    const selection = window.getSelection();
    if (!input || !selection) return;

    const currentHtml = input.innerHTML;
    const chatHistory = chatHistoryRef.current[chatId];
    if (!chatHistory || currentHtml === chatHistory.lastSavedHtml) return;

    const selectionState = {
      start: getCaretPosition(input),
      end: selection.rangeCount
        ? selection.getRangeAt(0).endOffset
        : getCaretPosition(input),
      isCollapsed: selection.isCollapsed,
    };

    const maxEntrySize = 100000; // Prevent storing extremely large entries
    if (currentHtml.length > maxEntrySize) {
      return; // Skip saving if content is too large
    }

    const lastEntry = chatHistory.undoStack[chatHistory.undoStack.length - 1];
    if (!lastEntry || currentHtml !== lastEntry.html) {
      chatHistory.undoStack.push({ html: currentHtml, selectionState });

      if (chatHistory.undoStack.length > maxStackSize) {
        chatHistory.undoStack.shift();
      }

      chatHistory.redoStack = [];
      chatHistory.lastSavedHtml = currentHtml;
    }
  };

  const saveState = () => {
    if (isProcessingActionRef.current) return;

    window.clearTimeout(saveTimeoutIdRef.current);
    saveTimeoutIdRef.current = window.setTimeout(
      saveCurrentState,
      debounceTime,
    );
  };

  const restoreSelection = (selectionState: SelectionState) => {
    const input = inputRef.current;
    if (!input) return;

    try {
      setCaretPosition(input, selectionState.start);

      if (!selectionState.isCollapsed) {
        const selection = window.getSelection();
        if (!selection) return;

        const range = document.createRange();
        let currentNode = input.firstChild;
        let currentPos = 0;

        while (currentNode && currentPos < selectionState.end) {
          if (currentNode.nodeType === Node.TEXT_NODE) {
            const nodeLength = currentNode.textContent?.length || 0;
            if (currentPos + nodeLength >= selectionState.end) {
              range.setEnd(currentNode, selectionState.end - currentPos);
              break;
            }
            currentPos += nodeLength;
          }
          currentNode = currentNode.nextSibling;
        }

        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (err) {
      const range = document.createRange();
      const selection = window.getSelection();
      if (!selection) return;

      range.selectNodeContents(input);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const applyState = (state: HistoryEntry) => {
    isProcessingActionRef.current = true;
    const input = inputRef.current;

    if (!input) {
      isProcessingActionRef.current = false;
      return;
    }

    input.innerHTML = state.html;
    const chatHistory = chatHistoryRef.current[chatId];
    chatHistory.lastSavedHtml = state.html;

    requestAnimationFrame(() => {
      try {
        restoreSelection(state.selectionState);
      } catch (err) {
        input.focus();
      }
      isProcessingActionRef.current = false;
    });
  };

  const getCurrentState = (): HistoryEntry | undefined => {
    const input = inputRef.current;
    if (!input) return undefined;

    const selection = window.getSelection();
    if (!selection) return undefined;

    return {
      html: input.innerHTML,
      selectionState: {
        start: getCaretPosition(input),
        end: selection.rangeCount
          ? selection.getRangeAt(0).endOffset
          : getCaretPosition(input),
        isCollapsed: selection.isCollapsed,
      },
    };
  };

  const undo = () => {
    const chatHistory = chatHistoryRef.current[chatId];
    if (!chatHistory) return;

    if (chatHistory.undoStack.length <= 1) {
      const emptyState = chatHistory.undoStack[0];
      const currentState = getCurrentState();
      if (currentState) {
        chatHistory.redoStack.push(currentState);
      }
      applyState(emptyState);
      return;
    }

    const currentState = getCurrentState();
    if (!currentState) return;

    chatHistory.redoStack.push(currentState);
    chatHistory.undoStack.pop();
    const previousState = chatHistory.undoStack[chatHistory.undoStack.length - 1];
    applyState(previousState);
  };

  const redo = () => {
    const chatHistory = chatHistoryRef.current[chatId];
    if (!chatHistory || chatHistory.redoStack.length === 0) return;

    const redoState = chatHistory.redoStack.pop()!;
    const currentState = getCurrentState();

    if (currentState) {
      chatHistory.undoStack.push(currentState);
    }

    applyState(redoState);
  };

  return {
    undo,
    redo,
    saveState,
  };
}
