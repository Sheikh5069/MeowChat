import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  push, 
  onValue, 
  remove, 
  set
} from 'firebase/database';
import { 
  getStorage, 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

// Auto sign in anonymously
signInAnonymously(auth).catch((error) => {
  console.log('Firebase Auth Error:', error);
});

// Save message to Firebase
export const saveMessage = async (roomCode, messageData) => {
  try {
    const messagesRef = ref(database, `rooms/${roomCode}/messages`);
    await push(messagesRef, messageData);
    return true;
  } catch (error) {
    console.error('Error saving message:', error);
    return false;
  }
};

// Listen to messages in real-time
export const listenToMessages = (roomCode, callback) => {
  try {
    const messagesRef = ref(database, `rooms/${roomCode}/messages`);
    return onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageArray = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value,
        }));
        callback(messageArray);
      } else {
        callback([]);
      }
    });
  } catch (error) {
    console.error('Error listening to messages:', error);
  }
};

// Upload file to Firebase Storage
export const uploadFile = async (roomCode, file) => {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const fileRef = storageRef(storage, `rooms/${roomCode}/${fileName}`);
    
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

// Save user to room
export const saveUserToRoom = async (roomCode, userId, username) => {
  try {
    const userRef = ref(database, `rooms/${roomCode}/users/${userId}`);
    await set(userRef, {
      username: username,
      joinedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
};

// Remove user from room
export const removeUserFromRoom = async (roomCode, userId) => {
  try {
    const userRef = ref(database, `rooms/${roomCode}/users/${userId}`);
    await remove(userRef);
    return true;
  } catch (error) {
    console.error('Error removing user:', error);
    return false;
  }
};

// Delete message
export const deleteMessage = async (roomCode, messageId) => {
  try {
    const messageRef = ref(database, `rooms/${roomCode}/messages/${messageId}`);
    await remove(messageRef);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
};
