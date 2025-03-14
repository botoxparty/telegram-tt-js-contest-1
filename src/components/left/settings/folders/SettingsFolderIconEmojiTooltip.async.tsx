import type { FC } from '../../../lib/teact/teact';
import React from '../../../lib/teact/teact';

import type { OwnProps } from './SettingsFolderIconEmojiTooltip';

import { Bundles } from '../../../util/moduleLoader';

import useModuleLoader from '../../../hooks/useModuleLoader';

const SettingsFolderIconEmojiTooltipAsync: FC<OwnProps> = (props) => {
  const { isOpen } = props;
  const EmojiTooltip = useModuleLoader(Bundles.Extra, 'EmojiTooltip', !isOpen);

  // eslint-disable-next-line react/jsx-props-no-spreading
  return EmojiTooltip ? <EmojiTooltip {...props} /> : undefined;
};

export default SettingsFolderIconEmojiTooltipAsync;
