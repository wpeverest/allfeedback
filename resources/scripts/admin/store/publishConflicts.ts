type Listener = () => void;

const conflictedForms = new Map<number, string>();
const listeners       = new Set<Listener>();

const notify = () => { listeners.forEach((l) => l()); };

export const publishConflictStore = {
	set: (id: number, message: string) => {
		conflictedForms.set(id, message);
		notify();
	},
	clear: (id: number) => {
		conflictedForms.delete(id);
		notify();
	},
	get: (id: number): string | undefined => conflictedForms.get(id),
	snapshot: (): ReadonlyMap<number, string> => conflictedForms,
	subscribe: (listener: Listener): (() => void) => {
		listeners.add(listener);
		return () => { listeners.delete(listener); };
	},
};
