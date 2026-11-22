# Stellify on Firebase (stellifyprep.net)

The website is the `sat/` folder. Firebase hosts it and provides the optional Google sign-in (Authentication) and
saved progress (Cloud Firestore). Project: `stellify-e1fd0`. Settings are in `firebase.json`, `.firebaserc` and
`firestore.rules` in this folder.

## One-time setup in the Firebase console (console.firebase.google.com → stellify-e1fd0)

1. **Authentication → Get started → Sign-in method → Google → Enable.** Pick a support email and save.
2. **Firestore Database → Create database →** production mode, a location near your students (for example `nam5`).
3. **Authentication → Settings → Authorized domains:** add `stellifyprep.net` and `www.stellifyprep.net`
   (`localhost`, `stellify-e1fd0.web.app` and `stellify-e1fd0.firebaseapp.com` are there already).
4. Do **not** turn on Google Analytics for the web app: the Privacy page promises no analytics.

## Publishing (from this folder, on your computer)

    npm install -g firebase-tools
    firebase login
    firebase deploy --only firestore:rules,hosting

That publishes the security rules and the site. The site is then at https://stellify-e1fd0.web.app.

## Your domain

**Hosting → Add custom domain →** `stellifyprep.net` (and `www.stellifyprep.net`). Firebase shows DNS records (a TXT
record and A records). Add them at your registrar's DNS settings; HTTPS turns on by itself within a few hours.

## After a change to the app

    cd stellify && npm run build:web && cd .. && firebase deploy --only hosting

## Testing sign-in locally (no real accounts are touched)

    firebase emulators:start --only auth,firestore --project stellify-e1fd0
    cd stellify && npx playwright test e2e/cloud.spec.ts --trace off
