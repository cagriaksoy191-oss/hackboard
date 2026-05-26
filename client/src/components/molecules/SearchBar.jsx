/**
 * SearchBar — Molecule
 * Input + Search icon composition with debounce-ready onChange
 */
import React from 'react';
import Input from '../atoms/Input';

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const ClearIcon = ({ onClick }) => (
  <button
    onClick={onClick}
    className="hover:text-[var(--text-primary)] transition-colors duration-100 p-0.5"
    aria-label="Clear search"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  </button>
);

export default function SearchBar({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  size = 'md',
  className = '',
  ...props
}) {
  const handleClear = () => {
    if (onClear) onClear();
    else if (onChange) onChange({ target: { value: '' } });
  };

  return (
    <Input
      type="search"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size={size}
      icon={<SearchIcon />}
      iconRight={value ? <ClearIcon onClick={handleClear} /> : null}
      className={className}
      {...props}
    />
  );
}
