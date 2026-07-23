import React from 'react';
import { Cpu, Sparkles } from 'lucide-react';
import { AIModel } from '../services/aiModelService';

interface AIModelDropdownProps {
  models: AIModel[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  defaultModelId?: string;
  className?: string;
}

export const AIModelDropdown: React.FC<AIModelDropdownProps> = ({
  models,
  value,
  onChange,
  disabled = false,
  label = 'AI Model:',
  defaultModelId,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label className="text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
          {label}
        </label>
      )}
      <div className="relative inline-block text-left">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="px-2.5 py-1.5 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 text-slate-800 shadow-xs cursor-pointer pr-8"
        >
          {models.map((model) => {
            const isDefault = defaultModelId
              ? model.modelId === defaultModelId
              : model.isDefaultLevel1;
            return (
              <option key={model.id || model.modelId} value={model.modelId}>
                {model.name} {isDefault ? ' (Default)' : ''}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
};

export default AIModelDropdown;
