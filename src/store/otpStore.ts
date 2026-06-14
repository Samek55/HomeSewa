let _confirmation: any = null;

export const setOtpConfirmation = (confirmation: any) => {
  _confirmation = confirmation;
};

export const getOtpConfirmation = () => _confirmation;

export const clearOtpConfirmation = () => {
  _confirmation = null;
};
