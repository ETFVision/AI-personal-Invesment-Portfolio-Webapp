export function isCronSecretValid(configuredSecret: string | undefined, providedSecret: string | null | undefined) {
  return Boolean(configuredSecret && providedSecret && configuredSecret === providedSecret);
}
