import React from 'react';

interface TextRenamingComponentProps {
  textRenames: [string, string][]; // [original text, replaced text]
  setTextRenames: React.Dispatch<React.SetStateAction<[string, string][]>>;
}

export default function TextRenamingComponent(props: TextRenamingComponentProps) {
  const { textRenames, setTextRenames } = props;

  const handleAddTextRename = (original: string, replaced: string) => {
    setTextRenames((prevTextRenames) => [...prevTextRenames, [original, replaced]]);
  }

  const handleRemoveTextRename = (idx: number) => {
    setTextRenames((prevTextRenames) => prevTextRenames.filter((_, i) => i !== idx));
  }

  const handleEditTextRename = (idx: number, original: string, replaced: string) => {
    setTextRenames((prevTextRenames) => prevTextRenames.map((textRename, i) => i === idx ? [original, replaced] : textRename));
  }

  return (
    <div className='py-1 mt-4'>
      <p className='text-lg font-semibold'>Configure Text Renamings</p>
      <div className='mt-2 space-y-2'>
        {textRenames.map(([original, replaced], idx) => (
          <div key={idx} className='flex items-center space-x-2'>
            <input
              type='text'
              value={original}
              onChange={(e) => handleEditTextRename(idx, e.target.value, replaced)}
              className='px-2 py-1 border border-gray-300 rounded'
            />
            <span className='text-lg'>→</span>
            <input
              type='text'
              value={replaced}
              onChange={(e) => handleEditTextRename(idx, original, e.target.value)}
              className='px-2 py-1 border border-gray-300 rounded'
            />
            <button
              onClick={() => handleRemoveTextRename(idx)}
              className='px-2 py-1 bg-red-500 text-white rounded'
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className='mt-2'>
        <button
          onClick={() => handleAddTextRename('', '')}
          className='px-2 py-1 bg-blue-500 text-white rounded'
        >
          Add
        </button>
      </div>
    </div>
  )
}