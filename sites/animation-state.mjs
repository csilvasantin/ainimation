import {ANIMATIONS} from './model.mjs?v=20261105-names-1';
const configuredPresets=new Set(ANIMATIONS.filter(preset=>preset!=='none'));
export const hasConfiguredAnimation=item=>configuredPresets.has(item?.animation);
