/** The Stellify Firebase web-app settings. These are public identifiers, not secrets: Firebase security rules and App Check protect the project. */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDEqC0iRFfaNOu32jtJ8QA6q8-x6E9GfNQ',
  // on Firebase Hosting, sign in through this site's own address (Firebase serves its sign-in helper there too):
  // the pop-up and the page are then the same site, which browsers that block cross-site storage need
  authDomain: typeof location !== 'undefined' && /^stellify-e1fd0\.(web\.app|firebaseapp\.com)$/.test(location.hostname) ? location.host : 'stellify-e1fd0.firebaseapp.com',
  projectId: 'stellify-e1fd0',
  storageBucket: 'stellify-e1fd0.firebasestorage.app',
  messagingSenderId: '85768509009',
  appId: '1:85768509009:web:41e8cd8085c01bb93f0a70',
};
