const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value));
}

/** Apply id filter to a Supabase products query (legacy_id or uuid). */
function filterByProductParam(query, idParam) {
  const id = String(idParam);
  if (isUuid(id)) {
    return query.eq('id', id);
  }
  const legacyId = parseInt(id, 10);
  if (!Number.isNaN(legacyId)) {
    return query.eq('legacy_id', legacyId);
  }
  return query.eq('legacy_id', -1);
}

module.exports = { isUuid, filterByProductParam };
