/* ====================================================================
   Prince Anthony Bart-Appiah — shared guestbook, photo & video uploads
   --------------------------------------------------------------------
   Messages and photos are stored in Firebase (Firestore) so EVERY
   visitor sees them, each stamped with the server date & time. Photos
   are shrunk in the browser and saved inside the database, so they
   only need Firestore. Videos are real files, so they're uploaded to
   Firebase Storage instead, with just a link saved in Firestore.

   >>> STEP 1: paste your own Firebase config just below. <<<
   (Full click-by-click instructions are in SETUP.md.)
   These keys are SAFE to be public — access is controlled by the
   Firestore/Storage security rules in SETUP.md, not by hiding the keys.
   ==================================================================== */

// This file is loaded as a plain <script> (not type="module"), and uses the
// Firebase "compat" libraries already loaded in index.html
// (firebase-app-compat.js / firebase-firestore-compat.js). Don't add
// `import ...` statements here — they'll throw a syntax error and silently
// break every feature below (Memory Wall, photo uploads, video uploads).

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBaOt7yC8y50umU5zmN7KROc7WOAvJtvBk",
  authDomain: "prince-anthony-memorial.firebaseapp.com",
  projectId: "prince-anthony-memorial",
  storageBucket: "prince-anthony-memorial.firebasestorage.app",
  messagingSenderId: "787022086834",
  appId: "1:787022086834:web:57993b010eebb13201bfab",
  measurementId: "G-4XRDPKGDXP"
};

/* Firebase is initialized below, via the compat libraries. */
/* ==================================================================== */

(function () {
  var NOT_CONFIGURED = String(firebaseConfig.apiKey).indexOf("PASTE") === 0;
  function $(id) { return document.getElementById(id); }

  /* Format a Firestore timestamp as "Month D, YYYY at H:MM AM" */
  function fmt(ts) {
    var d = (ts && ts.toDate) ? ts.toDate() : new Date();
    return d.toLocaleString(undefined, {
      year: "numeric", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  }

  /* --- Form toggles (work even before Firebase is connected) --- */
  var writeBtn = $("writeBtn"), mform = $("mform");
  if (writeBtn && mform) {
    writeBtn.addEventListener("click", function () {
      var open = mform.classList.toggle("open");
      writeBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) $("mName").focus();
    });
  }
  var addPhotoBtn = $("addPhotoBtn"), pform = $("pform");
  if (addPhotoBtn && pform) {
    addPhotoBtn.addEventListener("click", function () {
      var open = pform.classList.toggle("open");
      addPhotoBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var addVideoBtn = $("addVideoBtn"), vform = $("vform");
  if (addVideoBtn && vform) {
    addVideoBtn.addEventListener("click", function () {
      var open = vform.classList.toggle("open");
      addVideoBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* =====================  LIGHTBOX (works even before Firebase loads) ===================== */
  var lightbox = $("lightbox"), lightboxImg = $("lightboxImg"), lightboxClose = $("lightboxClose");
  function openLightbox(src, alt) {
    lightboxImg.src = src; lightboxImg.alt = alt || "";
    lightbox.hidden = false;
    document.addEventListener("keydown", onLightboxKey);
  }
  function closeLightbox() {
    lightbox.hidden = true; lightboxImg.src = "";
    document.removeEventListener("keydown", onLightboxKey);
  }
  function onLightboxKey(e) { if (e.key === "Escape") closeLightbox(); }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) lightbox.addEventListener("click", function (e) { if (e.target === lightbox) closeLightbox(); });

  /* Family gallery tiles (static, already in the HTML) */
  document.querySelectorAll(".gallery-item").forEach(function (btn) {
    btn.addEventListener("click", function () { openLightbox(btn.dataset.src); });
  });

  /* Attach the lightbox to any <img> the visitor-uploaded grids create */
  function makeClickable(img) {
    img.style.cursor = "pointer";
    img.addEventListener("click", function () { openLightbox(img.src, img.alt); });
  }

  /* If the config hasn't been filled in yet, show a gentle notice and stop. */
  if (NOT_CONFIGURED) {
    var note = 'Shared guestbook not connected yet — add your Firebase keys in ' +
               '<strong>firebase-app.js</strong> (see SETUP.md).';
    ["memory", "photos"].forEach(function (secId) {
      var sec = $(secId); if (!sec) return;
      var rule = sec.querySelector(".sec-rule");
      var div = document.createElement("div");
      div.className = "fb-notice"; div.innerHTML = note;
      if (rule) rule.insertAdjacentElement("afterend", div);
    });
    return;
  }

  firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var storage = firebase.storage();
  var auth = firebase.auth();
  function serverTime() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* =====================  VISITOR IDENTITY (silent, no login)  ===================== */
  var myUid = null;
  function ensureUid(cb) {
    if (auth.currentUser) { cb(auth.currentUser.uid); return; }
    auth.signInAnonymously().then(function (cred) { cb(cred.user.uid); })
      .catch(function (err) { console.error("sign-in:", err); alert("Couldn't verify you as a visitor — please refresh and try again."); });
  }

  auth.onAuthStateChanged(function (user) {
    myUid = user ? user.uid : null;
    if (!user) auth.signInAnonymously().catch(function (err) { console.error("anon auth:", err); });
    renderWall(); renderPhotos(); renderVideos();
  });
   /* =====================  MEMORY WALL  ===================== */
  var wall = $("wall");
  var latestTributes = [];

  function renderWall() {
    wall.innerHTML = "";
    if (!latestTributes.length) {
      wall.innerHTML = '<p class="empty">Be the first to leave a tribute.</p>';
      return;
    }
    latestTributes.forEach(function (item) {
      var id = item.id, m = item.data;
      var el = document.createElement("div"); el.className = "memory";
      var date = document.createElement("div"); date.className = "date"; date.textContent = fmt(m.createdAt);
      el.appendChild(date);

      if (m.attachUrl) {
        var wrap = document.createElement("div"); wrap.className = "attachment";
        if (m.attachType === "video") {
          var v = document.createElement("video"); v.src = m.attachUrl; v.controls = true; v.setAttribute("playsinline", "");
          wrap.appendChild(v);
        } else {
          var im = document.createElement("img"); im.src = m.attachUrl; im.loading = "lazy"; im.alt = "";
          makeClickable(im);
          wrap.appendChild(im);
        }
        el.appendChild(wrap);
      }

      var msg = document.createElement("p"); msg.className = "msg"; msg.textContent = m.message;
      el.appendChild(msg);
      var from = document.createElement("div"); from.className = "from"; from.textContent = m.name;
      el.appendChild(from);

     if (myUid && m.uid === myUid) {
  var actions = document.createElement("div"); actions.className = "owner-actions";
  var editBtn = document.createElement("button"); editBtn.type = "button"; editBtn.textContent = "Edit";
  var delBtn = document.createElement("button"); delBtn.type = "button"; delBtn.textContent = "Delete"; delBtn.className = "danger";
  editBtn.addEventListener("click", function () { startEditTribute(el, id, m); });
  delBtn.addEventListener("click", function () {
    if (!confirm("Delete your tribute? This can't be undone.")) return;
    db.collection("tributes").doc(id).delete().then(function () {
      if (m.attachPath) storage.ref(m.attachPath).delete().catch(function () {});
    }).catch(function (err) { alert("Couldn't delete."); console.error(err); });
  });
  actions.appendChild(editBtn); actions.appendChild(delBtn);
  el.appendChild(actions);
}

      wall.appendChild(el);
    });
  }

  function startEditTribute(el, id, m) {
    var msgEl = el.querySelector(".msg");
    var textarea = document.createElement("textarea");
    textarea.className = "edit-msg-area"; textarea.value = m.message;
    msgEl.replaceWith(textarea);
    var actions = el.querySelector(".owner-actions");
    actions.innerHTML = "";
    var save = document.createElement("button"); save.type = "button"; save.textContent = "Save";
    var cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel";
    save.addEventListener("click", function () {
      db.collection("tributes").doc(id).update({ message: textarea.value.trim() })
        .catch(function (err) { alert("Couldn't save changes."); console.error(err); });
    });
    cancel.addEventListener("click", renderWall);
    actions.appendChild(save); actions.appendChild(cancel);
  }

  db.collection("tributes").orderBy("createdAt", "desc").onSnapshot(function (snap) {
    latestTributes = snap.docs.map(function (d) { return { id: d.id, data: d.data() }; });
    renderWall();
  }, function (err) { console.error("tributes:", err); });

  mform.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("mName").value.trim(), message = $("mMsg").value.trim();
    var file = ($("mFile").files || [])[0];
    var status = $("mStatus");
    if (!name || !message) return;
    var btn = mform.querySelector('button[type="submit"]'); btn.disabled = true;

     ensureUid(function () {

    function saveTribute(attach) {
      var payload = { name: name, message: message, createdAt: serverTime() uid: myUid };
      if (attach) { payload.attachUrl = attach.url; payload.attachType = attach.type; if (attach.path) payload.attachPath = attach.path; }
      return db.collection("tributes").add(payload);
    }

    var work;
    if (!file) {
      work = saveTribute(null);
    } else if (file.type.indexOf("image/") === 0) {
      status.textContent = "Uploading photo…";
      work = shrink(file).then(function (dataUrl) { return saveTribute({ url: dataUrl, type: "image" }); });
    } else if (file.type.indexOf("video/") === 0) {
      var path = "tribute-videos/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "-" + file.name;
      work = new Promise(function (resolve, reject) {
        var task = storage.ref().child(path).put(file, { contentType: file.type });
        task.on("state_changed", function (snap) {
          status.textContent = "Uploading video… " + Math.round((snap.bytesTransferred / snap.totalBytes) * 100) + "%";
        }, reject, function () {
          task.snapshot.ref.getDownloadURL().then(function (url) { resolve(saveTribute({ url: url, type: "video", path: path })); }).catch(reject);
        });
      });
    } else {
      status.textContent = "Attachments must be a photo or video file.";
      btn.disabled = false;
      return;
    }

     function ensureUidPromise() {
    return new Promise(function (resolve) { ensureUid(resolve); });
  }

    work.then(function () {
      mform.reset(); mform.classList.remove("open");
      writeBtn.setAttribute("aria-expanded", "false");
      status.textContent = "";
    }).catch(function (err) {
      status.textContent = "Sorry, your message couldn't be posted. Please try again.";
      console.error(err);
    }).finally(function () { btn.disabled = false; });
  });
});

  /* =====================  PHOTOS  ===================== */
  var uploadWrap = $("uploadWrap"), uploadGrid = $("uploadGrid");
  var latestPhotos = [];

  function renderPhotos() {
    uploadGrid.innerHTML = "";
    uploadWrap.hidden = !latestPhotos.length;
    latestPhotos.forEach(function (item) {
      var id = item.id, p = item.data;
      var fig = document.createElement("figure"); fig.className = "up-tile";
      var im = document.createElement("img"); im.src = p.image; im.loading = "lazy";
      im.alt = p.caption || "Shared photo of Prince Anthony Bart-Appiah";
      makeClickable(im);
      var cap = document.createElement("figcaption");
      var who = p.name ? p.name : "Anonymous";
      cap.textContent = (p.caption ? p.caption + " — " : "") + who + " · " + fmt(p.createdAt);
      fig.appendChild(im); fig.appendChild(cap);

     if (myUid && p.uid === myUid) {
  var actions = document.createElement("div"); actions.className = "owner-actions";
  var delBtn = document.createElement("button"); delBtn.type = "button"; delBtn.textContent = "Delete"; delBtn.className = "danger";
  delBtn.addEventListener("click", function () {
    if (!confirm("Delete your photo? This can't be undone.")) return;
    db.collection("photos").doc(id).delete().catch(function (err) { alert("Couldn't delete."); console.error(err); });
  });
  actions.appendChild(delBtn);
  fig.appendChild(actions);
}

      uploadGrid.appendChild(fig);
    });
  }

  db.collection("photos").orderBy("createdAt", "desc").onSnapshot(function (snap) {
    latestPhotos = snap.docs.map(function (d) { return { id: d.id, data: d.data() }; });
    renderPhotos();
  }, function (err) { console.error("photos:", err); });

  pform.addEventListener("submit", function (e) {
    e.preventDefault();
    var file = ($("pFile").files || [])[0];
    var status = $("pStatus");
    if (!file) return;
    if (file.type.indexOf("image/") !== 0) { status.textContent = "Please choose an image file."; return; }
    shrink(file).then(function (image) {
      return ensureUidPromise().then(function (uid) {
        return db.collection("photos").add({
         image: image,
         name: $("pName").value.trim(),
         caption: $("pCaption").value.trim(),
         createdAt: serverTime(),
         uid: uid
    });
  });
})
       .then(function () {
      pform.reset(); pform.classList.remove("open");
      addPhotoBtn.setAttribute("aria-expanded", "false");
      status.textContent = "";
    }).catch(function (err) {
      status.textContent = "Sorry, that photo couldn't be uploaded. Try a smaller or different one.";
      console.error(err);
    }).finally(function () { btn.disabled = false; });
  });

  /* =====================  VIDEOS  ===================== */
  var MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150 MB — keep phone uploads reasonable
  var videoGrid = $("videoGrid"), videoEmpty = $("videoEmpty");
  var latestVideos = [];

  function renderVideos() {
    videoGrid.innerHTML = "";
    videoEmpty.hidden = !!latestVideos.length;
    latestVideos.forEach(function (item) {
      var id = item.id, v = item.data;
      var fig = document.createElement("figure"); fig.className = "video-tile";
      var vid = document.createElement("video");
      vid.src = v.url; vid.controls = true; vid.preload = "metadata";
      vid.setAttribute("playsinline", "");
      fig.appendChild(vid);
      var cap = document.createElement("figcaption");
      var who = v.name ? v.name : "Anonymous";
      cap.textContent = (v.caption ? v.caption + " — " : "") + who + " · " + fmt(v.createdAt);
      fig.appendChild(cap);

    if (myUid && v.uid === myUid) {
  var actions = document.createElement("div"); actions.className = "owner-actions";
  var delBtn = document.createElement("button"); delBtn.type = "button"; delBtn.textContent = "Delete"; delBtn.className = "danger";
  delBtn.addEventListener("click", function () {
    if (!confirm("Delete your video? This can't be undone.")) return;
    db.collection("videos").doc(id).delete().then(function () {
      if (v.path) storage.ref(v.path).delete().catch(function () {});
    }).catch(function (err) { alert("Couldn't delete."); console.error(err); });
  });
  actions.appendChild(delBtn);
  fig.appendChild(actions);
}

      videoGrid.appendChild(fig);
    });
  }

  db.collection("videos").orderBy("createdAt", "desc").onSnapshot(function (snap) {
    latestVideos = snap.docs.map(function (d) { return { id: d.id, data: d.data() }; });
    renderVideos();
  }, function (err) { console.error("videos:", err); });

  vform.addEventListener("submit", function (e) {
    e.preventDefault();
    var file = ($("vFile").files || [])[0];
    var status = $("vStatus");
    if (!file) return;
    if (file.type.indexOf("video/") !== 0) { status.textContent = "Please choose a video file."; return; }
    if (file.size > MAX_VIDEO_BYTES) { status.textContent = "That video is over 150 MB — please choose a shorter clip."; return; }

    var btn = vform.querySelector('button[type="submit"]'); btn.disabled = true;
    var name = $("vName").value.trim(), caption = $("vCaption").value.trim();
    var path = "videos/" + Date.now() + "-" + Math.random().toString(36).slice(2) + "-" + file.name;
    var task = storage.ref().child(path).put(file, { contentType: file.type, customMetadata: { uid: myUid || "" } });

    task.on("state_changed", function (snap) {
      var pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      status.textContent = "Uploading… " + pct + "%";
    }, function (err) {
      status.textContent = "Sorry, that video couldn't be uploaded. Please try again.";
      console.error(err);
      btn.disabled = false;
    }, function () {
      task.snapshot.ref.getDownloadURL().then(function (url) {
  return ensureUidPromise().then(function (uid) {
    return db.collection("videos").add({ url: url, path: path, name: name, caption: caption, createdAt: serverTime(), uid: uid });
  });
}).then(function () {
        vform.reset(); vform.classList.remove("open");
        addVideoBtn.setAttribute("aria-expanded", "false");
        status.textContent = "";
      }).catch(function (err) {
        status.textContent = "Sorry, that video couldn't be shared. Please try again.";
        console.error(err);
      }).finally(function () { btn.disabled = false; });
    });
  });

  /* Shrink & compress an image to a small JPEG so it fits in one
     Firestore document (< 1 MB). Keeps uploads fast on phones. */
  function shrink(file, maxDim) {
    maxDim = maxDim || 1400;
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.width, h = img.height;
        if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
        else if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
        var c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        var q = 0.82, data = c.toDataURL("image/jpeg", q);
        while (data.length > 900000 && q > 0.4) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
        resolve(data);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
      img.src = url;
    });
  }
})();
