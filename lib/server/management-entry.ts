// Server-only configuration. Never import this module into a client component.
export function managementEntries() {
  const manage = process.env.TOWN_MANAGE_ENTRY || "";
  const system = process.env.TOWN_SYSTEM_ENTRY || "";
  const valid = (value: string) => /^gate-[a-f0-9]{32}$/.test(value);
  if (!valid(manage) || !valid(system) || manage === system) return null;
  return {manage: `/${manage}`, system: `/${system}`};
}
