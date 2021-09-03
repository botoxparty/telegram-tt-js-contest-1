import React, {
  FC, useState, memo, useCallback, useRef,
} from '../../lib/teact/teact';
import { withGlobal } from '../../lib/teact/teactn';

import { ApiCountryCode } from '../../api/types';

import { ANIMATION_END_DELAY } from '../../config';
import searchWords from '../../util/searchWords';
import buildClassName from '../../util/buildClassName';
import renderText from '../common/helpers/renderText';
import useLang from '../../hooks/useLang';
import { isoToEmoji } from '../../util/emoji';
import useOnChange from '../../hooks/useOnChange';

import DropdownMenu from '../ui/DropdownMenu';
import MenuItem from '../ui/MenuItem';
import Spinner from '../ui/Spinner';

import './CountryCodeInput.scss';

type StateProps = {
  phoneCodeList: ApiCountryCode[];
};

type OwnProps = {
  id: string;
  value?: ApiCountryCode;
  isLoading?: boolean;
  onChange: (value: ApiCountryCode) => void;
};

const MENU_HIDING_DURATION = 200 + ANIMATION_END_DELAY;
const SELECT_TIMEOUT = 50;

const CountryCodeInput: FC<OwnProps & StateProps> = ({
  id,
  value,
  isLoading,
  onChange,
  phoneCodeList,
}) => {
  const lang = useLang();
  // eslint-disable-next-line no-null/no-null
  const inputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<string | undefined>();
  const [filteredList, setFilteredList] = useState<ApiCountryCode[]>([]);

  const updateFilter = useCallback((filterValue?: string) => {
    setFilter(filterValue);
    setFilteredList(getFilteredList(phoneCodeList, filterValue));
  }, [phoneCodeList]);

  useOnChange(([prevPhoneCodeList]) => {
    if (prevPhoneCodeList?.length === 0 && phoneCodeList.length > 0) {
      updateFilter(filter);
    }
  }, [phoneCodeList, updateFilter]);

  const handleChange = useCallback((e: React.SyntheticEvent<HTMLElement>) => {
    const { countryCode } = (e.currentTarget.firstElementChild as HTMLDivElement).dataset;
    const country = phoneCodeList.find((c) => c.countryCode === countryCode);

    if (country) {
      onChange(country);
    }

    setTimeout(() => updateFilter(undefined), MENU_HIDING_DURATION);
  }, [phoneCodeList, onChange, updateFilter]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    updateFilter(e.currentTarget.value);
  }, [updateFilter]);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode !== 8) {
      return;
    }

    const target = e.currentTarget;
    if (value && filter === undefined) {
      target.value = '';
    }

    updateFilter(target.value);
  }, [filter, updateFilter, value]);

  const CodeInput: FC<{ onTrigger: () => void; isOpen?: boolean }> = ({ onTrigger, isOpen }) => {
    const handleTrigger = () => {
      if (isOpen) {
        return;
      }

      setTimeout(() => {
        inputRef.current!.select();
      }, SELECT_TIMEOUT);

      onTrigger();

      const formEl = document.getElementById('auth-phone-number-form')!;
      formEl.scrollTo({ top: formEl.scrollHeight, behavior: 'smooth' });
    };

    const handleCodeInput = (e: React.FormEvent<HTMLInputElement>) => {
      handleInput(e);
      handleTrigger();
    };

    const inputValue = filter ?? (value?.name || value?.defaultName || '');

    return (
      <div className={buildClassName('input-group', value && 'touched')}>
        <input
          ref={inputRef}
          className={buildClassName('form-control', isOpen && 'focus')}
          type="text"
          id={id}
          value={inputValue}
          autoComplete="off"
          onClick={handleTrigger}
          onFocus={handleTrigger}
          onInput={handleCodeInput}
          onKeyDown={handleInputKeyDown}
        />
        <label>{lang('Login.SelectCountry.Title')}</label>
        {isLoading ? (
          <Spinner color="black" />
        ) : (
          <i onClick={handleTrigger} className={buildClassName('css-icon-down', isOpen && 'open')} />
        )}
      </div>
    );
  };

  return (
    <DropdownMenu
      className="CountryCodeInput"
      trigger={CodeInput}
    >
      {filteredList
        .map((country: ApiCountryCode) => (
          <MenuItem
            key={country.countryCode}
            className={value && country.iso2 === value.iso2 ? 'selected' : ''}
            onClick={handleChange}
          >
            <span data-country-code={country.countryCode} />
            <span className="country-flag">{renderText(isoToEmoji(country.iso2), ['hq_emoji'])}</span>
            <span className="country-name">{country.name || country.defaultName}</span>
            <span className="country-code">{country.countryCode}</span>
          </MenuItem>
        ))}
      {!filteredList.length && (
        <MenuItem
          key="no-results"
          className="no-results"
          disabled
        >
          <span>{lang('lng_country_none')}</span>
        </MenuItem>
      )}
    </DropdownMenu>
  );
};

function getFilteredList(countryList: ApiCountryCode[], filter = ''): ApiCountryCode[] {
  const filtered = filter.length
    ? countryList.filter((country) => (
      searchWords(country.defaultName, filter) || (country.name && searchWords(country.name, filter))
    )) : countryList;
  return filtered;
}

export default memo(withGlobal<OwnProps>(
  (global): StateProps => {
    const { countryList: { phoneCodes: phoneCodeList } } = global;
    return {
      phoneCodeList,
    };
  },
)(CountryCodeInput));
