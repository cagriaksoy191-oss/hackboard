export const DISMISS_KEY_PREFIX = 'hackboard-dismiss:';

export function evaluateRecovery(snap, health) {
  if (!snap || !health) return false;

  const snapFingerprint = snap.meta?.fingerprint;
  const serverFingerprint = health.fingerprint;

  if (!snapFingerprint || !serverFingerprint) return false;

  if (snapFingerprint === serverFingerprint) return false;

  const dismissKey = DISMISS_KEY_PREFIX + serverFingerprint + ":" + snapFingerprint;
  if (localStorage.getItem(dismissKey)) return false;

  const snapTotal = snap.meta?.totalRecords || 0;
  const serverTotal = health.totalRecords || 0;
  const serverLooksSeed = health.looksLikeSeedData || false;

  const snapDate = snap.exportedAt ? new Date(snap.exportedAt) : null;
  const serverLatest = health.latestDataAt ? new Date(health.latestDataAt) : null;
  const snapshotIsNewer = snapDate && serverLatest ? snapDate > serverLatest : false;

  if (serverTotal === 0 && snapTotal > 0) return true;

  if (serverLooksSeed && snapTotal > 0) return true;

  if (snapshotIsNewer && snapTotal >= serverTotal) return true;

  if (snapTotal > serverTotal) return true;

  return false;
}
