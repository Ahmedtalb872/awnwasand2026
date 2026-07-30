import React, { useState } from 'react';
import { Search, User, X } from 'lucide-react';

export interface UserPickerValue {
  userId: string | null;
  name: string;
}

interface UserPickerProps {
  users: any[];
  value: UserPickerValue;
  onChange: (v: UserPickerValue) => void;
  isRTL: boolean;
}

export const UserPicker: React.FC<UserPickerProps> = ({ users, value, onChange, isRTL }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const matches = value.name.trim().length >= 2
    ? users.filter(u =>
        u.full_name?.toLowerCase().includes(value.name.toLowerCase()) ||
        u.phone?.includes(value.name)
      ).slice(0, 6)
    : [];

  return (
    <div className="relative">
      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
        {isRTL ? 'الاسم' : 'Name'} *
      </label>
      <div className="relative">
        {value.userId ? (
          <User className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-emerald-500" />
        ) : (
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
        )}
        <input
          type="text"
          required
          value={value.name}
          onChange={e => { onChange({ userId: null, name: e.target.value }); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="input-field ps-9 pe-9"
          placeholder={isRTL ? 'ابحث عن عضو أو اكتب اسماً جديداً' : 'Search a member or type a new name'}
        />
        {value.name && (
          <button
            type="button"
            onClick={() => onChange({ userId: null, name: '' })}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {value.userId && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
          {isRTL ? 'عضو مسجل' : 'Registered member'}
        </p>
      )}
      {!value.userId && showSuggestions && matches.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {matches.map(u => (
            <button
              type="button"
              key={u.id}
              onMouseDown={() => onChange({ userId: u.id, name: u.full_name })}
              className="w-full text-start px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col"
            >
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{u.full_name}</span>
              <span className="text-xs text-slate-400">{u.phone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
