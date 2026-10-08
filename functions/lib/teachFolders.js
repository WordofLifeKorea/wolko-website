export const FOLDERS_KEY = 'teach:folders:v1';
export const DEFAULT_TEACH_FOLDERS = ['WOLKO', 'Student Fusion Team Projects', '레슨플랜'];

export async function readTeachFolders(env) {
  const state = await env.CAMP_KV.get(FOLDERS_KEY, 'json');
  return { folders: Array.isArray(state?.folders) ? state.folders : [], removedDefaults: Array.isArray(state?.removedDefaults) ? state.removedDefaults : [] };
}

export function foldersForCamp(state, campId, items = []) {
  const folders = DEFAULT_TEACH_FOLDERS.filter(name => !state.removedDefaults.some(f => f.campId === campId && f.name === name))
    .map(name => ({ id: 'default:' + name, name, campId, ownerEmail: '', builtin: true }));
  folders.push(...state.folders.filter(f => f.campId === campId));
  for (const item of items) {
    if ((item.tab === 'teacher' || item.team) && item.team && item.campIds?.includes(campId) && !folders.some(f => f.name === item.team)) {
      folders.push({ id: 'legacy:' + item.team, name: item.team, campId, ownerEmail: '', builtin: true });
    }
  }
  return folders;
}
