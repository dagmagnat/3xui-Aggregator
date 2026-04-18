// PATCHED buildOriginalSubUrl
function buildOriginalSubUrl(node, subId) {
  if (!subId) return '';
  const base = String(node.sub_base_url || node.panel_url || '')
    .trim()
    .replace(/\/$/, '');
  return `${base}/sub/${subId}`;
}
