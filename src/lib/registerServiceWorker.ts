// Runs once per page load when this module is first imported (module-level init, not an Effect).
// Production only: in dev the worker would cache stale modules and fight HMR.
if (
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  import.meta.env.PROD
) {
  void navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .catch(() => {
      // Offline support is an enhancement: a failed registration must never break the app.
    })
}
