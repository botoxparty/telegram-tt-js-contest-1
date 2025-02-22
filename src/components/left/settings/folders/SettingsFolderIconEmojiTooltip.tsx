import type { FC, RefObject } from '../../../../lib/teact/teact';
import React, { memo, useRef } from '../../../../lib/teact/teact';

import type { ApiSticker } from '../../../../api/types';

import animateHorizontalScroll from '../../../../util/animateHorizontalScroll';
import buildClassName from '../../../../util/buildClassName';
import findInViewport from '../../../../util/findInViewport';
import isFullyVisible from '../../../../util/visibility/isFullyVisible';

import useEffectWithPrevDeps from '../../../../hooks/useEffectWithPrevDeps';
import useHorizontalScroll from '../../../../hooks/useHorizontalScroll';
import { useIntersectionObserver } from '../../../../hooks/useIntersectionObserver';
import useLastCallback from '../../../../hooks/useLastCallback';
import useMouseInside from '../../../../hooks/useMouseInside';
import usePrevDuringAnimation from '../../../../hooks/usePrevDuringAnimation';
import useShowTransitionDeprecated from '../../../../hooks/useShowTransitionDeprecated';
import { useKeyboardNavigation } from '../../../middle/composer/hooks/useKeyboardNavigation';

import CustomEmojiButton from '../../../middle/composer/CustomEmojiButton';
import EmojiButton from '../../../middle/composer/EmojiButton';
import Loading from '../../../ui/Loading';

import './SettingsFolderIconEmojiTooltip.scss';

const VIEWPORT_MARGIN = 8;
const EMOJI_BUTTON_WIDTH = 44;
const CLOSE_DURATION = 350;
const BUFFER_HEIGHT = 20; // pixels for buffer zone

function setItemVisible(index: number, containerRef: Record<string, any>) {
  const container = containerRef.current!;
  if (!container) {
    return;
  }

  const { visibleIndexes, allElements } = findInViewport(
    container,
    '.EmojiButton',
    VIEWPORT_MARGIN,
    true,
    true,
    true,
  );

  if (!allElements.length || !allElements[index]) {
    return;
  }
  const first = visibleIndexes[0];
  if (
    !visibleIndexes.includes(index)
    || (index === first && !isFullyVisible(container, allElements[first], true))
  ) {
    const position = index > visibleIndexes[visibleIndexes.length - 1] ? 'start' : 'end';
    const newLeft = position === 'start' ? index * EMOJI_BUTTON_WIDTH : 0;

    animateHorizontalScroll(container, newLeft);
  }
}

export type OwnProps = {
  isOpen: boolean;
  emojis: Emoji[];
  customEmojis: ApiSticker[];
  onEmojiSelect: (text: string) => void;
  onCustomEmojiSelect: (emoji: ApiSticker) => void;
  onClose: NoneToVoidFunction;
  addRecentEmoji: ({ emoji }: { emoji: string }) => void;
  addRecentCustomEmoji: ({ documentId }: { documentId: string }) => void;
};

const INTERSECTION_THROTTLE = 200;

const SettingsFolderIconEmojiTooltip: FC<OwnProps> = ({
  isOpen,
  emojis,
  customEmojis,
  onClose,
  onEmojiSelect,
  onCustomEmojiSelect,
  addRecentEmoji,
  addRecentCustomEmoji,
}) => {
  const containerRef = useRef<HTMLDivElement | undefined>(undefined);
  const [handleMouseEnter, handleMouseLeave] = useMouseInside(isOpen, onClose);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(
    isOpen,
    undefined,
    undefined,
    false,
  );
  const listEmojis: (Emoji | ApiSticker)[] = usePrevDuringAnimation(
    emojis.length ? [...customEmojis, ...emojis] : undefined,
    CLOSE_DURATION,
  ) || [];

  useHorizontalScroll(containerRef as RefObject<HTMLDivElement>);

  const { observe: observeIntersection } = useIntersectionObserver({
    rootRef: containerRef as RefObject<HTMLDivElement>,
    throttleMs: INTERSECTION_THROTTLE,
    isDisabled: !isOpen,
  });

  const handleSelectEmoji = useLastCallback((emoji: Emoji) => {
    onEmojiSelect(emoji.native);
    addRecentEmoji({ emoji: emoji.id });
  });

  const handleCustomEmojiSelect = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
    addRecentCustomEmoji({ documentId: emoji.id });
  });

  const handleSelect = useLastCallback((emoji: Emoji | ApiSticker) => {
    if ('native' in emoji) {
      handleSelectEmoji(emoji);
    } else {
      handleCustomEmojiSelect(emoji);
    }
  });

  const handleClick = useLastCallback((native: string, id: string) => {
    onEmojiSelect(native);
    addRecentEmoji({ emoji: id });
  });

  const handleCustomEmojiClick = useLastCallback((emoji: ApiSticker) => {
    onCustomEmojiSelect(emoji);
    addRecentCustomEmoji({ documentId: emoji.id });
  });

  const selectedIndex = useKeyboardNavigation({
    isActive: isOpen,
    isHorizontal: true,
    items: listEmojis,
    shouldRemoveSelectionOnReset: true,
    onSelect: handleSelect,
    onClose,
  });

  useEffectWithPrevDeps(
    ([prevSelectedIndex]) => {
      if (prevSelectedIndex === undefined || prevSelectedIndex === -1) {
        return;
      }

      setItemVisible(selectedIndex, containerRef);
    },
    [selectedIndex],
  );

  const className = buildClassName(
    'EmojiTooltip SettingsFolderIconEmojiTooltip composer-tooltip custom-scroll-x',
    transitionClassNames,
  );

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="emoji-tooltip-buffer"
        style={{
          position: 'absolute',
          top: `-${BUFFER_HEIGHT}px`,
          left: 0,
          right: 0,
          height: `${BUFFER_HEIGHT}px`,
        }}
        onMouseEnter={handleMouseEnter}
      />
      {shouldRender && listEmojis ? (
        listEmojis.map((emoji, index) => ('native' in emoji ? (
          <EmojiButton
            key={emoji.id}
            emoji={emoji}
            focus={selectedIndex === index}
            onClick={handleClick}
          />
        ) : (
          <CustomEmojiButton
            key={emoji.id}
            emoji={emoji}
            focus={selectedIndex === index}
            onClick={handleCustomEmojiClick}
            observeIntersection={observeIntersection}
          />
        )))
      ) : shouldRender ? (
        <Loading />
      ) : undefined}
    </div>
  );
};

export default memo(SettingsFolderIconEmojiTooltip);
