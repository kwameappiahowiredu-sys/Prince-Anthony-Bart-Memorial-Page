# Setup — shared guestbook, photo uploads & publishing

This memorial lets **anyone who visits** leave a message or add a photo, and
everyone sees them in real time with the date & time they were added.

To make that work you do two one-time things:

1. **Connect a free Firebase database** (stores the messages & photos)
2. **Publish the site online** (so people can visit it)

Both are free. Budget about 15 minutes. No coding required — just copy & paste.

---

## Part 1 — Firebase (the shared database)

### Step 1: Create a project
1. Go to **https://console.firebase.google.com** and sign in with a Google account.
2. Click **Add project**.
3. Name it something like `prince-anthony-memorial` → **Continue**.
4. Google Analytics is optional — you can switch it **off** → **Create project**.
5. Wait for it to finish, then click **Continue**.

### Step 2: Register the website
1. On the project home, click the **web icon** `</>` ("Add app").
2. Give it a nickname (e.g. `memorial`) → **Register app**.
   (Leave "Firebase Hosting" unchecked for now.)
3. You'll see a block of code containing **`const firebaseConfig = { ... }`**.
   Keep this tab open — you'll copy these values next.

### Step 3: Paste your keys into the site
1. Open **`firebase-app.js`** in a text editor.
2. Near the top, replace the `PASTE_...` values with the ones from Firebase:

   ```js
   var firebaseConfig = {
     apiKey:            "AIza...your value...",
     authDomain:        "your-project.firebaseapp.com",
     projectId:         "your-project",
     storageBucket:     "your-project.appspot.com",
     messagingSenderId: "1234567890",
     appId:             "1:1234...:web:abcd..."
   };
   ```
3. Save the file.
   > These keys are **safe to be public** — Firebase is designed this way.
   > Access is controlled by the rules in Step 5, not by hiding the keys.

### Step 4: Turn on the database
1. In Firebase, left menu → **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** → **Next**.
4. Pick a location close to you → **Enable**.

### Step 5: Set the security rules
1. In Firestore, open the **Rules** tab.
2. Replace everything there with the rules below, then click **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       match /tributes/{id} {
         allow read: if true;
         allow create: if request.resource.data.name is string
                       && request.resource.data.message is string
                       && request.resource.data.name.size() <= 80
                       && request.resource.data.message.size() <= 3000;
         allow update, delete: if false;
       }

       match /photos/{id} {
         allow read: if true;
         allow create: if request.resource.data.image is string
                       && request.resource.data.image.size() < 1400000;
         allow update, delete: if false;
       }

       match /videos/{id} {
         allow read: if true;
         allow create: if request.resource.data.url is string
                       && request.resource.data.url.size() <= 2000;
         allow update, delete: if false;
       }
     }
   }
   ```

   These rules let anyone **read and add** messages/photos, but **no one can
   edit or delete** them from the site. To remove an inappropriate post, delete
   it yourself in the Firestore console (Data tab).

That's the database done. ✅

### Step 6: Turn on Storage (needed for video uploads)

Visitor-uploaded **videos** are actual video files, too large to store in
Firestore the way photos are, so they need Firebase's file storage product.

1. Left menu → **Build → Storage** → **Get started**.
2. Choose **Start in production mode** → pick the same location as your
   Firestore database → **Done**.
3. You'll be prompted to **upgrade to the Blaze (pay-as-you-go) plan** — as of
   February 2026 this is required by Google for *any* use of Cloud Storage,
   even free-tier usage. You'll need to link a credit card, but a memorial
   site's traffic stays well within the free monthly quota (5 GB stored,
   1 GB downloaded/day), so the bill is normally **$0**. If you'd rather not
   link a card, skip this step — photos and the guestbook still work fine,
   only video uploads will be unavailable.
4. Once Storage is on, open the **Rules** tab and replace everything with:

   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /videos/{allPaths=**} {
         allow read: if true;
         allow write: if request.resource.contentType.matches('video/.*')
                      && request.resource.size < 150 * 1024 * 1024;
       }
     }
   }
   ```

   This lets anyone **read and upload** videos (under 150 MB, video files
   only), but no one can overwrite or delete them from the site.

---

## Part 2 — Publish the site (free)

The easiest option is **Netlify Drop** — no account setup headaches, just drag
and drop.

1. Make sure these are all in **one folder** (they already are):
   `index.html`, `styles.css`, `script.js`, `firebase-app.js`, and the
   `images` folder.
2. Go to **https://app.netlify.com/drop**.
3. Drag the whole **folder** onto the page.
4. In a few seconds you get a public link like
   `https://gentle-otter-1234.netlify.app` — that's your live memorial. Share it.
5. To rename it, sign in (free) → **Site settings → Change site name**.
6. To **update the site later**, just drag the folder onto Netlify Drop again.

> Tip: the shared guestbook only works on the **published (https) link**, and
> also when you open `index.html` directly on your own computer. If a photo is
> very large it's automatically shrunk before uploading.

---

## Everyday use / moderation

- **See submissions:** Firebase console → Firestore Database → **Data** tab →
  `tributes`, `photos`, and `videos` collections.
- **Delete a post/photo/video:** hover the document there and click the trash icon.
- **Costs:** the free "Spark" plan is generous (plenty for a memorial). You do
  not need to enter a credit card.

Questions or want me to change anything (limits, moderation, layout)? Just ask.
