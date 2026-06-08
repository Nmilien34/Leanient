export function shouldShowVerdictCardAction(args: { mini?: boolean; onAction?: () => void }): boolean {
  return !args.mini && Boolean(args.onAction);
}
