(function () {
  "use strict";

  /* -----------------------------  BACK TO TOP  ---------------------------- */
  var toTop = document.getElementById("toTop");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("show", window.scrollY > 500);
    });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* -------------------------------  LIGHTBOX  ------------------------------
     Clicking any gallery photo, service program image, or video tile opens it
     full-size over the page with a Back button (and Escape / backdrop click /
     the phone's own back gesture, via history.pushState below). */
  var lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  var lbImg = document.getElementById("lightboxImg");
  var lbVideo = document.getElementById("lightboxVideo");
  var lbBack = document.getElementById("lightboxBack");
  var openedViaHistory = false;

  function show() {
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    if (!openedViaHistory) {
      history.pushState({ memorialLightbox: true }, "");
      openedViaHistory = true;
    }
  }

  function openImage(src, alt) {
    lbVideo.pause();
    lbVideo.hidden = true;
    lbVideo.removeAttribute("src");
    lbVideo.load();
    lbImg.src = src;
    lbImg.alt = alt || "";
    lbImg.hidden = false;
    show();
  }

  function openVideo(src) {
    lbImg.hidden = true;
    lbImg.removeAttribute("src");
    lbVideo.src = src;
    lbVideo.hidden = false;
    show();
    lbVideo.play().catch(function () {});
  }

  function close(fromPopstate) {
    if (lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.style.overflow = "";
    lbVideo.pause();
    lbVideo.removeAttribute("src");
    lbVideo.load();
    lbImg.removeAttribute("src");
    if (openedViaHistory) {
      openedViaHistory = false;
      if (!fromPopstate) history.back();
    }
  }

  lbBack.addEventListener("click", function () { close(false); });
  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) close(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") close(false);
  });
  window.addEventListener("popstate", function () { close(true); });

  document.addEventListener("click", function (e) {
    /* Family photos + service program images: direct <a><img></a> links */
    var link = e.target.closest(".gallery > a[href], .card.service > a[href]");
    if (link) {
      e.preventDefault();
      var linkedImg = link.querySelector("img");
      openImage(link.getAttribute("href"), linkedImg ? linkedImg.alt : "");
      return;
    }

    /* Visitor-shared photos, rendered by firebase-app.js */
    var photoTile = e.target.closest(".up-tile");
    if (photoTile) {
      var tileImg = photoTile.querySelector("img");
      if (tileImg) openImage(tileImg.src, tileImg.alt);
      return;
    }

    /* Video tiles, rendered by firebase-app.js */
    var videoTile = e.target.closest(".video-tile");
    if (videoTile && videoTile.dataset.src) {
      openVideo(videoTile.dataset.src);
      return;
    }
  });
})();
