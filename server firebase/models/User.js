import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  firebaseUid: { type: String, required: true, unique: true },
  email:       { type: String, required: true },
  firstName:   String,
  lastName:    String,
  photoURL:    String,
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

export default model('User', userSchema);