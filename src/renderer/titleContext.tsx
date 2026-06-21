import React, { createContext, useContext } from 'react';

interface TitleBarContextValue {
  setExtras: (node: React.ReactNode) => void;
}

export const TitleBarContext = createContext<TitleBarContextValue>({
  setExtras: () => {},
});

export function useTitleBar() {
  return useContext(TitleBarContext);
}
