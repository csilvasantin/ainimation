// Only the Director page bootstraps a modal; importing the engine in Stock has no side effects.
const {mountCapsuleEditor}=await import('./capsule-editor.mjs'+new URL(import.meta.url).search);
mountCapsuleEditor();
