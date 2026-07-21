// Strips anything that isn't a letter (any script, e.g. English or Nepali) or a
// space, so name fields can't be filled with emails, numbers, or symbols like
// "nj@gguuhl77" while still allowing multi-word full names.
export const sanitizeNameInput = (value: string): string => value.replace(/[^\p{L}\s]/gu, '');
