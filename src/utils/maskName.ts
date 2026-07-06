// Masks a full name for privacy in public/pre-payment contexts, e.g. "Pratik Thapa" -> "Pra... Tha..."
export function maskCustomerName(fullName?: string): string {
  const name = (fullName || '').trim();
  if (!name) return 'Someone';
  return name
    .split(/\s+/)
    .map((word) => `${word.slice(0, 3)}...`)
    .join(' ');
}
