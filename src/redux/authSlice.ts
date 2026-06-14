import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isAdminLoggedIn: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAdminLogin(state) {
      state.isAdminLoggedIn = true;
    },
    setAdminLogout(state) {
      state.isAdminLoggedIn = false;
    },
  },
});

export const { setAdminLogin, setAdminLogout } = authSlice.actions;
export default authSlice.reducer;