import React, { createContext, ReactNode, useContext, useState } from 'react';

type LocalNextExpressionIdContextType = {
  expressionId: number;
  setExpressionId: (newValue: number) => void;
};

const LocalNextExpressionIdContext = createContext<LocalNextExpressionIdContextType | undefined>(undefined);

type LocalNextExpressionIdProviderProps = {
  children: ReactNode;
}

export function LocalNextExpressionIdProvider({ children }: LocalNextExpressionIdProviderProps) {
  const [expressionId, setExpressionId] = useState(0);
  return (
    <LocalNextExpressionIdContext.Provider value={{ expressionId, setExpressionId }}>
      {children}
    </LocalNextExpressionIdContext.Provider>
  );
}

export function useLocalNextExpressionId() {
  const context = useContext(LocalNextExpressionIdContext);
  if (!context) {
    throw new Error('useNextExpressionId must be used within a LocalNextExpressionIdProvider');
  }
  return context;
}