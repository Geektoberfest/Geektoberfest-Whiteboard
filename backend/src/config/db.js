import mongoose from 'mongoose';

export async function connectToDatabase(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export async function disconnectFromDatabase() {
  await mongoose.disconnect();
}
