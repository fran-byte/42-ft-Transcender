export function errorHandler(err, req, res, next) {
  if (import.meta.env.DEV) {
  console.log('❌ Unhandled error:', err);}
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error en el servidor',
  });
}
