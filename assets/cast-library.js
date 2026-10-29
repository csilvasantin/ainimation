/* Cast view only: keep source indexes and leave the saved movie untouched. */
(() => {
  const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const collator = new Intl.Collator('es', {numeric: true, sensitivity: 'base'});
  function entries(plan, view = {}, category = member => member.mediaType || 'asset') {
    const cast = plan.cast || [];
    const usedKeys = new Set(cast.filter(m => m.instanceOf && m.src && m.imported && m.onStage !== false).map(m => String(m.instanceOf)));
    const available = cast.map((member, index) => ({member, index}))
      .filter(({member}) => !member.instanceOf && (member.imported || member.src))
      .map(entry => ({...entry, used: Boolean(entry.member.src && entry.member.imported && entry.member.onStage !== false) || usedKeys.has(String(entry.member.id || entry.member.src || `cast-${entry.index}`))}));
    const words = normalize(view.query).trim().split(/\s+/).filter(Boolean);
    const visible = available.filter(({member, used}) => {
      if (view.types?.length && !view.types.includes(category(member))) return false;
      if (view.usage === 'used' && !used || view.usage === 'unused' && used) return false;
      const text = normalize([member.name, member.fileName, member.role, member.type, member.mediaType, member.source, category(member)].filter(Boolean).join(' '));
      return words.every(word => text.includes(word));
    });
    if (['name', 'type', 'grouped'].includes(view.sort)) visible.sort((a, b) => {
      const byType = view.sort !== 'name' ? collator.compare(category(a.member), category(b.member)) : 0;
      return byType || collator.compare(a.member.name || '', b.member.name || '') || a.index - b.index;
    });
    const totals = new Map();
    for (const {member} of available) totals.set(category(member), (totals.get(category(member)) || 0) + 1);
    const grouped = new Map();
    for (const entry of visible) {
      const key = category(entry.member);
      if (!grouped.has(key)) grouped.set(key, {category: key, total: totals.get(key), items: []});
      grouped.get(key).items.push(entry);
    }
    return {available, visible, groups: [...grouped.values()]};
  }
  globalThis.ainCastLibrary = Object.freeze({entries});
})();
