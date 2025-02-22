import type { ChangeEvent } from 'react';
import type { FC, RefObject } from '../../../../lib/teact/teact';
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from '../../../../lib/teact/teact';

import EmojiPicker from '../../../middle/composer/EmojiPicker';
import InputText from '../../../ui/InputText';
import Menu from '../../../ui/Menu';
import Portal from '../../../ui/Portal';

import './SettingsFolderNameInput.scss';

interface OwnProps {
  value: string;
  error?: string;
  label: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

const FolderNameInput: FC<OwnProps> = ({
  value,
  error,
  label,
  onChange,
  className,
}) => {
  const buttonRef = useRef<HTMLButtonElement>();
  const inputRef = useRef<HTMLInputElement | undefined>(undefined);
  const transformOriginX = useRef<number>();

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // Update transform origin when menu opens
  useEffect(() => {
    if (isEmojiPickerOpen && buttonRef.current) {
      transformOriginX.current = buttonRef.current.getBoundingClientRect().right;
    }
  }, [isEmojiPickerOpen]);

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (!inputRef.current) return;

      const input = inputRef.current;
      const cursorPosition = input.selectionStart || 0;
      const newText = `${value.slice(0, cursorPosition)}${emoji}${value.slice(
        cursorPosition,
      )}`;

      const event = {
        currentTarget: {
          value: newText,
        },
      } as ChangeEvent<HTMLInputElement>;

      onChange(event);

      setIsEmojiPickerOpen(false);

      // Restore focus and set cursor position after the inserted emoji
      requestAnimationFrame(() => {
        input.focus();
        const newPosition = cursorPosition + emoji.length;
        input.setSelectionRange(newPosition, newPosition);
      });
    },
    [value, onChange],
  );

  const handleClose = useCallback(() => {
    setIsEmojiPickerOpen(false);
  }, []);

  return (
    <div className="folder-name-input-wrapper">
      <InputText
        ref={inputRef as RefObject<HTMLInputElement>}
        value={value}
        error={error}
        label={label}
        onChange={onChange}
        className={`folder-name-input ${className || ''}`}
      />
      <Portal>
        <Menu
          isOpen={isEmojiPickerOpen}
          noCompact
          bubbleClassName="folder-name-emoji-tooltip-menu"
          onClose={handleClose}
          transformOriginX={transformOriginX.current}
        >
          <EmojiPicker
            className="picker-tab"
            onEmojiSelect={handleEmojiSelect}
          />
        </Menu>
      </Portal>
    </div>
  );
};

export default FolderNameInput;
