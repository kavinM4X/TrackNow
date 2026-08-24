const mongoose = require('mongoose');

let connectPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow';

  connectPromise = mongoose
    .connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => mongoose.connection)
    .catch((err) => {
      connectPromise = null;
      console.error('MongoDB Connection Error:', err.message);
      if (mongoUri.includes('mongodb+srv')) {
        console.error(
          'Atlas tip: check IP whitelist (0.0.0.0/0 for Netlify), username/password, and database name.'
        );
      }
      throw err;
    });

  return connectPromise;
}

module.exports = { connectDB, mongoose };
