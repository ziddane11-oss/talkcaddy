import React, { createContext, useState, ReactNode } from 'react';
import { DefaultTheme } from './DefaultTheme';

// 테마 컨텍스트 생성
export const ThemeContext = createContext(DefaultTheme);

// 빌드 에러를 해결할 핵심 부품: ThemeProvider
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState(DefaultTheme);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
