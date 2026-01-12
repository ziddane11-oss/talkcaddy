// 임시 useAuth 훅
export const useAuth = () => {
  return {
    user: null,
    isAuthenticated: false,
    login: async () => {},
    logout: async () => {}
  };
};

export default useAuth;
