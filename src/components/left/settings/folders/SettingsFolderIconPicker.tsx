import type { FC, RefObject } from '../../../../lib/teact/teact';
import React, {
  useCallback, useEffect, useRef, useState,
} from '../../../../lib/teact/teact';

import type { ApiSticker } from '../../../../api/types';

import Button from '../../../ui/Button';
import Menu from '../../../ui/Menu';
import Portal from '../../../ui/Portal';
import SettingsFolderIconEmojiTooltip from './SettingsFolderIconEmojiTooltip';
import { SETTINGS_FOLDERS_EMOJIS } from './SettingsFoldersEmojis';

interface OwnProps {
  value: string | undefined;
  onChange: (value: string) => void;
}

const SettingsFolderIconPicker: FC<OwnProps> = ({ value, onChange }) => {
  const [isEmojiTooltipOpen, setIsEmojiTooltipOpen] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>();

  const transformOriginX = useRef<number>();

  useEffect(() => {
    if (isEmojiTooltipOpen && buttonRef.current) {
      transformOriginX.current = buttonRef.current.getBoundingClientRect().right;
    }
  }, [isEmojiTooltipOpen]);

  const toggleEmojiTooltip = useCallback(() => {
    setIsEmojiTooltipOpen(!isEmojiTooltipOpen);
  }, [isEmojiTooltipOpen]);

  const handleCustomEmojiSelect = useCallback(
    (emoji: ApiSticker) => {
      const changedValue = emoji.emoji as string;
      onChange(changedValue);
      setIsEmojiTooltipOpen(false);
    },
    [onChange],
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      onChange(emoji);
      setIsEmojiTooltipOpen(false);
    },
    [onChange],
  );

  const handleAddRecentEmoji = useCallback(() => {
    // NOOP
  }, []);

  const handleAddRecentCustomEmoji = useCallback(() => {
    // NOOP
  }, []);

  return (
    <div>
      <Button
        ref={buttonRef as RefObject<HTMLButtonElement>}
        className="emoji-button"
        round
        color="translucent"
        onClick={toggleEmojiTooltip}
        ariaLabel="Choose folder emoticon"
      >
        {value || '📁'}
      </Button>
      <Portal>
        <Menu
          isOpen={isEmojiTooltipOpen}
          noCompact
          bubbleClassName="folder-icon-emoji-tooltip-menu"
          onClose={toggleEmojiTooltip}
          transformOriginX={transformOriginX.current}
        >
          <SettingsFolderIconEmojiTooltip
            isOpen={isEmojiTooltipOpen}
            emojis={SETTINGS_FOLDERS_EMOJIS}
            customEmojis={[]}
            onEmojiSelect={handleEmojiSelect}
            onCustomEmojiSelect={handleCustomEmojiSelect}
            onClose={toggleEmojiTooltip}
            addRecentEmoji={handleAddRecentEmoji}
            addRecentCustomEmoji={handleAddRecentCustomEmoji}
          />
        </Menu>
      </Portal>
    </div>
  );
};

export default SettingsFolderIconPicker;
