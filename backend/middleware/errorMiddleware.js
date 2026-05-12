export function errorHandler(err, req, res, next) {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error en el servidor',
  });
}
