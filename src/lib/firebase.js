import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBodoqlBo8MjVN2UN4_kI--Sr35kOQnPY8",
  authDomain: "wolko-crs.firebaseapp.com",
  databaseURL: "https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wolko-crs",
  storageBucket: "wolko-crs.firebasestorage.app",
  messagingSenderId: "391180747277",
  appId: "1:391180747277:web:031d2d76b082ea8d438b44"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
