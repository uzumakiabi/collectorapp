export const AVATAR_OPTIONS = [
  { file: 'male.svg', label: 'Male' },
  { file: 'female.svg', label: 'Female' },
];

export function isValidAvatar(avatar: unknown): avatar is string {
  return typeof avatar === 'string' && AVATAR_OPTIONS.some(a => a.file === avatar);
}
