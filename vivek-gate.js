/* 辨喜文集印地文讀書會登入門檻（比照三寶讀書會，簡化版：無後台面板、無使用統計；
   但 LINE 等內建瀏覽器處理不是簡化版，20261029-03 起比照三寶完整版：一鍵跳轉系統瀏覽器＋引導覆蓋層）
   Firebase 專案：my-chinese-sentence-bank-v3（與 V4 同專案，不同集合）
   申請：vivek_accessRequests/{uid}；核准：vivek_approvedUsers/{uid}
   管理員：f216002@gmail.com（免審核）
   另：V4 語橋學院已核准的老師（v4_approvedTeachers/{uid}，active=true）可直接進入。
   審核方式（簡化）：管理員在 Firebase Console → Firestore 直接建立／修改
   vivek_approvedUsers/{uid}（active=true），不另設後台面板；規則見 vivek-firestore-rules.txt。
   注意：GitHub Pages 是靜態託管，門檻擋的是一般瀏覽；
   懂技術的人直接抓 index.html 仍看得到內文，真正的「不公開」要靠：
   不公開散佈網址＋不公開 repo＋搜尋引擎 noindex（本站已設 noindex，見 index.html）。
   音檔即時合成（未來新卡用）：走 V4 Cloud Function synthesizeV4Source，
   該函式只認 V4 核准老師／管理員；僅本站核准、非 V4 核准者叫函式會被拒，
   播放鍵會自動退回裝置語音，這是函式端的限制，不是本站故障。 */
(function () {
  'use strict';
  var ADMIN = 'f216002@gmail.com';
  var msg = document.getElementById('vivekGateMsg');
  var userBox = document.getElementById('vivekGateUser');
  var signInBtn = document.getElementById('vivekSignIn');
  var applyBtn = document.getElementById('vivekApply');
  var applyForm = document.getElementById('vivekApplyForm');
  var applyName = document.getElementById('vivekApplyName');
  var applySubmit = document.getElementById('vivekApplySubmit');
  var applyCancel = document.getElementById('vivekApplyCancel');
  var signOutBtn = document.getElementById('vivekSignOut');
  var utilUser = document.getElementById('vivekUtilUser');
  var utilSignOut = document.getElementById('vivekUtilSignOut');
  var utilRefresh = document.getElementById('vivekUtilRefresh');
  function setMsg(t) { if (msg) msg.textContent = t; }
  function show(el, on) { if (el) el.style.display = on ? '' : 'none'; }
  function openGate() {
    document.body.classList.add('vivek-approved');
    var g = document.getElementById('vivekGate');
    if (g) g.style.display = 'none';
  }
  var auth, db;
  try {
    if (!window.firebase) throw new Error('Firebase SDK 載入失敗');
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp({
        apiKey: 'AIzaSyChpInXumwIWaOrR4cU8KhNm1NK5-RdgQw',
        authDomain: 'my-chinese-sentence-bank-v3.firebaseapp.com',
        projectId: 'my-chinese-sentence-bank-v3',
        storageBucket: 'my-chinese-sentence-bank-v3.firebasestorage.app',
        messagingSenderId: '178850974896',
        appId: '1:178850974896:web:f1d40b2ed4e7218b553f75'
      });
    }
    auth = window.firebase.auth();
    db = window.firebase.firestore();
    window.VIVEK_DB = db;
    window.VIVEK_AUTH = auth;
  } catch (e) {
    setMsg('登入功能暫時無法使用，請重新整理頁面。');
    return;
  }
  var provider = new window.firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  function isAdmin(user) {
    return user && String(user.email || '').toLowerCase() === ADMIN;
  }
  function checkApproval(user) {
    if (isAdmin(user)) { openGate(); return; }
    db.collection('vivek_approvedUsers').doc(user.uid).get().then(function (doc) {
      if (doc.exists && doc.data().active === true) { openGate(); return true; }
      return false;
    }).catch(function () { return false; }).then(function (ok) {
      if (ok) return;
      return db.collection('v4_approvedTeachers').doc(user.uid).get().then(function (doc) {
        if (doc.exists && doc.data().active === true) { openGate(); return; }
        setMsg('已登入（' + (user.email || '') + '），但尚未核准。請按「申請加入讀書會」，等管理員核准後重新整理即可閱讀。');
        show(applyBtn, true);
      });
    }).catch(function (err) {
      setMsg('無法確認核准狀態（' + (err.code || err.message) + '）。若你是管理員，請先到 Firebase Console 發布辨喜規則（見 vivek-firestore-rules.txt）。');
      show(applyBtn, true);
    });
  }
  /* ---- 內建瀏覽器偵測（比照三寶讀書會 sanbao-gate.js，2026-10-27 Cheng 回報 LINE 內無法登入；比照 V4 v4-auth.js） ----
     LINE / Facebook / Instagram / WeChat 等 App 內建瀏覽器會隔離儲存空間，
     Google 彈出視窗登入在裡面跑不起來（Safari 本人則可以登入）。
     偵測到就把登入鍵改為一鍵跳轉系統瀏覽器，跳不過去就顯示引導覆蓋層。 */
  function detectInAppBrowser() {
    var ua = navigator.userAgent || '';
    if (/Line\//i.test(ua)) return 'LINE';
    if (/FBAN\/|FBAV\//i.test(ua)) return 'Facebook';
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/MicroMessenger/i.test(ua)) return 'WeChat';
    return null;
  }
  function showWebviewGuide(appName, escapeAttempted) {
    var oldGuide = document.getElementById('vivekWebviewGuide');
    if (oldGuide) oldGuide.remove();
    var siteUrl = location.origin + location.pathname;
    var overlay = document.createElement('div');
    overlay.id = 'vivekWebviewGuide';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:24px;';
    var card = document.createElement('div');
    card.style.cssText = 'background:#fffdf8;border-radius:16px;max-width:420px;width:100%;' +
      'padding:24px;color:#2b2620;font-size:.95rem;line-height:1.7;';
    card.innerHTML =
      '<h3 style="margin:0 0 10px;font-size:1.1rem;">' +
      (escapeAttempted ? '沒有自動跳轉嗎？請手動開啟' : '請用 Safari / Chrome 開啟再登入') + '</h3>' +
      '<p style="margin:0 0 10px;">您正在「' + appName + '」的內建瀏覽器中，Google 登入在這裡無法使用，這是 App 本身的限制，不是網站故障。</p>' +
      '<p style="margin:0 0 6px;font-weight:700;">' +
      (escapeAttempted ? '剛才已嘗試自動開啟系統瀏覽器，若沒有反應，請這樣做：' : '請這樣做：') + '</p>' +
      '<ol style="margin:0 0 12px;padding-left:22px;">' +
      '<li>先複製本站網址（按下面按鈕）</li>' +
      '<li>iPhone 打開 Safari，Android 手機打開 Chrome</li>' +
      '<li>在網址列貼上網址，開啟網站後再登入</li>' +
      '</ol>' +
      '<p style="margin:0 0 12px;word-break:break-all;font-size:.82rem;color:#8a7f6a;">' + siteUrl + '</p>';
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = '複製網站網址';
    copyBtn.style.cssText = 'font:inherit;cursor:pointer;border-radius:10px;border:1px solid #d8cdb4;' +
      'background:#fff;color:#2b2620;padding:10px 20px;width:100%;margin-bottom:8px;';
    var copyMsg = document.createElement('div');
    copyMsg.style.cssText = 'font-size:.85rem;color:#2e7d32;min-height:1.4em;margin-bottom:8px;text-align:center;';
    copyBtn.addEventListener('click', function () {
      function done(ok) {
        copyMsg.textContent = ok ? '已複製！去 Safari／Chrome 貼上開啟吧。' : '複製失敗，請長按上方網址手動複製。';
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(siteUrl).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = siteUrl;
        ta.style.cssText = 'position:fixed;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        try { done(document.execCommand('copy')); } catch (e) { done(false); }
        ta.remove();
      }
    });
    card.appendChild(copyBtn);
    card.appendChild(copyMsg);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '我知道了';
    btn.style.cssText = 'font:inherit;cursor:pointer;border-radius:10px;border:1px solid #d8cdb4;' +
      'background:#2b2620;color:#fff;padding:10px 20px;width:100%;';
    btn.addEventListener('click', function () { overlay.remove(); });
    card.appendChild(btn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }
  function openInSystemBrowser() {
    var appName = detectInAppBrowser();
    var url = location.origin + location.pathname;
    var ua = navigator.userAgent || '';
    var target = null;
    if (/iPad|iPhone|iPod/.test(ua)) {
      target = 'x-safari-' + url;
    } else if (/Android/.test(ua)) {
      target = 'intent://' + location.host + location.pathname + '#Intent;scheme=https;end';
    }
    if (target) {
      location.href = target;
      showWebviewGuide(appName, true);
    } else {
      showWebviewGuide(appName, false);
    }
  }
  if (detectInAppBrowser()) {
    signInBtn.textContent = '在瀏覽器中開啟並登入';
  }
  signInBtn.onclick = function () {
    if (detectInAppBrowser()) { openInSystemBrowser(); return; }
    signInBtn.disabled = true;
    setMsg('正在開啟 Google 登入…');
    /* 看門狗（比照三寶；比照行事曆）：彈窗若 30 秒還沒回應（例如卡在主畫面 App 或內建瀏覽器），
       恢復按鍵並提示改用 Safari／Chrome；使用者若還在選帳號可繼續，不受影響。 */
    var watchdog = setTimeout(function () {
      if (!auth.currentUser) {
        signInBtn.disabled = false;
        setMsg('登入還沒有完成：如果你正在選擇帳號請繼續；如果畫面卡住了，請按右上角「重新整理」後再試，或改用 Safari／Chrome 直接開啟本站。');
      }
    }, 30000);
    auth.signInWithPopup(provider).catch(function (err) {
      if (err.code === 'auth/popup-blocked') setMsg('彈出視窗被阻擋，請允許本網站的彈出視窗後再試一次。');
      else if (err.code === 'auth/popup-closed-by-user') setMsg('已關閉 Google 登入視窗。');
      else if (err.code === 'auth/cancelled-popup-request') setMsg('登入被中斷，請再按一次登入。');
      else if (err.code === 'auth/unauthorized-domain') setMsg('此網域尚未在 Firebase 授權，請聯繫管理員（Firebase Console → Authentication → Authorized domains 加入 f216002.github.io）。');
      else if (err.code === 'auth/operation-not-supported-in-this-environment') setMsg('請用 Safari 或 Chrome 直接開啟本網站再登入。');
      else setMsg('Google 登入失敗：' + (err.message || err.code));
    }).finally(function () {
      clearTimeout(watchdog);
      if (!auth.currentUser) signInBtn.disabled = false;
    });
  };
  function submitApplication() {
    var user = auth.currentUser;
    if (!user) return;
    var name = applyName.value.trim();
    if (!name) { setMsg('請填寫姓名。'); applyName.focus(); return; }
    db.collection('vivek_accessRequests').doc(user.uid).set({
      uid: user.uid, email: user.email || '', name: name,
      status: 'pending', createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      setMsg('申請已送出，請等管理員核准後重新整理頁面。');
      show(applyBtn, false); show(applyForm, false);
    }).catch(function (err) {
      setMsg('申請送出失敗：' + (err.code || err.message) + '（請先發布辨喜規則）');
    });
  }
  applyBtn.onclick = function () { show(applyBtn, false); show(applyForm, true); applyName.focus(); };
  if (applyCancel) applyCancel.onclick = function () { show(applyForm, false); show(applyBtn, true); };
  if (applySubmit) applySubmit.onclick = submitApplication;
  function signOutNow() { auth.signOut(); }
  signOutBtn.onclick = signOutNow;
  if (utilSignOut) utilSignOut.onclick = signOutNow;
  if (utilRefresh) utilRefresh.onclick = function () { location.reload(); };
  auth.onAuthStateChanged(function (user) {
    if (!user) {
      document.body.classList.remove('vivek-approved');
      var g = document.getElementById('vivekGate');
      if (g) g.style.display = '';
      setMsg('本教材不公開，僅供核准學員閱讀。請先用 Google 帳號登入。V4 語橋學院已核准的老師可直接進入，不用再申請。');
      show(signInBtn, true); show(applyBtn, false); show(signOutBtn, false); show(applyForm, false);
      if (userBox) userBox.style.display = 'none';
      if (utilUser) utilUser.style.display = 'none';
      return;
    }
    show(signInBtn, false); show(signOutBtn, true);
    if (userBox) { userBox.style.display = ''; userBox.textContent = '已登入：' + (user.displayName || '') + '（' + (user.email || '') + '）'; }
    if (utilUser) { utilUser.style.display = ''; utilUser.textContent = (user.displayName || user.email || ''); }
    if (isAdmin(user)) { openGate(); } else { checkApproval(user); }
  });
  /* ---------- 即時合成（未來新卡用；本批 238 張已有預合成靜態檔，優先用靜態檔） ---------- */
  var AZ_SEG_CACHE = new Map();
  var AZ_IDB = null;
  function azIdb() {
    return new Promise(function (res) {
      if (AZ_IDB) { res(AZ_IDB); return; }
      if (!('indexedDB' in window)) { res(null); return; }
      try {
        var rq = indexedDB.open('vivek-audio-cache', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('audio'); };
        rq.onsuccess = function () { AZ_IDB = rq.result; res(AZ_IDB); };
        rq.onerror = function () { res(null); };
      } catch (e) { res(null); }
    });
  }
  function azIdbGet(key) {
    return azIdb().then(function (db) {
      if (!db) return null;
      return new Promise(function (res) {
        try {
          var q = db.transaction('audio', 'readonly').objectStore('audio').get(key);
          q.onsuccess = function () { res(q.result || null); };
          q.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }
  function azIdbPut(key, val) {
    azIdb().then(function (db) {
      if (!db) return;
      try { db.transaction('audio', 'readwrite').objectStore('audio').put(val, key); } catch (e) {}
    });
  }
  var AZ_SYNTH_FN = null;
  window.VIVEK_getAzureSegment = async function (locale, text) {
    var key = locale + '\n' + text;
    if (AZ_SEG_CACHE.has(key)) return AZ_SEG_CACHE.get(key);
    var local = await azIdbGet(key);
    if (local) { AZ_SEG_CACHE.set(key, local); return local; }
    if (!window.firebase || !window.firebase.app || !window.firebase.app().functions) throw new Error('no-functions');
    if (!AZ_SYNTH_FN) AZ_SYNTH_FN = window.firebase.app().functions('us-east1').httpsCallable('synthesizeV4Source', { timeout: 60000 });
    var style = locale === 'zh-TW' ? 'gentle' : '';
    var r = await AZ_SYNTH_FN({ locale: locale, text: text, rate: '-20%', style: style });
    var d = (r && r.data) || {};
    if (!d.audioBase64) throw new Error('empty-audio');
    var url = 'data:' + (d.contentType || 'audio/mpeg') + ';base64,' + d.audioBase64;
    AZ_SEG_CACHE.set(key, url); azIdbPut(key, url);
    return url;
  };
})();
