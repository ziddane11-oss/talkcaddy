import { useState } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);

  return {
    user,
    isAuthenticated: !!user,
    login: async () => console.log("Mock login"),
    logout: async () => console.log("Mock logout"),
    token: null
  };
};

export default useAuth;
