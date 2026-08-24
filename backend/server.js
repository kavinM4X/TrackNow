const { app, initApp } = require('./app');

const PORT = process.env.PORT || 5000;

initApp()
  .then(() => {
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other backend first:`);
        console.error(`  netstat -ano | findstr :${PORT}`);
        console.error('  Stop-Process -Id <PID> -Force');
      } else {
        console.error('Failed to start server:', err.message);
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
