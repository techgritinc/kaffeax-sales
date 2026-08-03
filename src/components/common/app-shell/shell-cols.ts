/** Grid templates for the [sidebar | main | chat] shell, one per layout state. */
const SHELL_COLS = {
  sidebarChat:
    'grid-cols-[260px_minmax(0,1fr)_340px] max-bp1100:grid-cols-[220px_minmax(0,1fr)_300px] max-bp900:grid-cols-[minmax(0,1fr)]',
  sidebarOnly:
    'grid-cols-[260px_minmax(0,1fr)] max-bp1100:grid-cols-[220px_minmax(0,1fr)] max-bp900:grid-cols-[minmax(0,1fr)]',
  railChat:
    'grid-cols-[56px_minmax(0,1fr)_340px] max-bp1100:grid-cols-[56px_minmax(0,1fr)_300px] max-bp900:grid-cols-[56px_minmax(0,1fr)]',
  railOnly: 'grid-cols-[56px_minmax(0,1fr)] max-bp900:grid-cols-[56px_minmax(0,1fr)]',
};

/** Pick the shell's grid template from whether the sidebar and chat are showing. */
export function shellColsFor(sidebarOpen: boolean, chatVisible: boolean): string {
  if (sidebarOpen) return chatVisible ? SHELL_COLS.sidebarChat : SHELL_COLS.sidebarOnly;
  return chatVisible ? SHELL_COLS.railChat : SHELL_COLS.railOnly;
}
