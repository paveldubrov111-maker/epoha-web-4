import React, { useState, useEffect } from 'react';

interface LocalNumberInputProps {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: string;
}

const LocalNumberInput: React.FC<LocalNumberInputProps> = ({
  value,
  onChange,
  className,
  step = "any"
}) => {
  const [localValue, setLocalValue] = useState(value.toString());

  useEffect(() => {
    if (Number(localValue) !== Number(value)) {
      setLocalValue(value.toString());
    }
  }, [value]);

  return (
    <input
      type="number"
      step={step}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed)) {
          onChange(parsed);
        } else if (e.target.value === '') {
          onChange(0);
        }
      }}
      onBlur={() => setLocalValue(value.toString())}
      className={className}
    />
  );
};

export default LocalNumberInput;
