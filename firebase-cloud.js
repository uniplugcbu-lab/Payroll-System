/* Firebase data layer for HR Payroll. Reads the `firebaseConfig` declared in firebase-config.js. */
(function () {
  "use strict";

  // Firestore rejects undefined, Infinity/NaN and nested arrays. JSON round-trip drops undefined and turns
  // Infinity/NaN into null; any array-inside-array is wrapped as {items: [...]} so the write cannot fail.
  function clean(value) {
    function fix(v) {
      if (Array.isArray(v)) return v.map(function (x) { return Array.isArray(x) ? { items: fix(x) } : fix(x); });
      if (v && typeof v === "object") { var o = {}; Object.keys(v).forEach(function (k) { o[k] = fix(v[k]); }); return o; }
      return v;
    }
    return fix(JSON.parse(JSON.stringify(value || {})));
  }

  window.HRPayrollCloud = {
    ready: false,
    db: null,
    auth: null,
    lastError: "",

    init: function () {
      this.lastError = "";
      if (!window.firebase) {
        this.lastError = "The Firebase SDK did not load (check your internet connection, or whether gstatic.com is blocked).";
        return false;
      }
      var c = window.HR_PAYROLL_FIREBASE_CONFIG;
      if (!c) {
        this.lastError = "firebase-config.js did not load or does not define HR_PAYROLL_FIREBASE_CONFIG.";
        return false;
      }
      if (!c.apiKey || !c.projectId || !c.appId) {
        this.lastError = "firebaseConfig is missing apiKey, projectId or appId.";
        return false;
      }
      try {
        if (!firebase.apps.length) firebase.initializeApp(c);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        try { this.db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { /* settings already applied */ }
        this.ready = true;
        return true;
      } catch (e) {
        console.error("Firebase initialization failed:", e);
        this.lastError = "Firebase initialization failed: " + (e && e.message || e);
        return false;
      }
    },

    organizationRef: function (uid) {
      return this.db.collection("organizations").doc(uid);
    },

    settingsRef: function (uid) {
      return this.organizationRef(uid).collection("data").doc("settings");
    },

    employeesRef: function (uid) {
      return this.organizationRef(uid).collection("employees");
    },

    payrollsRef: function (uid) {
      return this.organizationRef(uid).collection("payrolls");
    },

    statutoryUpdatesRef: function (uid) {
      return this.organizationRef(uid).collection("statutoryUpdates");
    },

    memberRef: function (uid) {
      return this.organizationRef(uid).collection("members").doc(uid);
    },

    saveOrganization: function (user, data) {
      return this.organizationRef(user.uid).set(
        Object.assign({}, clean(data), {
          ownerUid: user.uid,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }),
        { merge: true }
      );
    },

    saveMember: function (user, data) {
      return this.memberRef(user.uid).set(
        Object.assign({}, clean(data), {
          uid: user.uid,
          role: "owner",
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }),
        { merge: true }
      );
    },

    saveSettings: function (user, data) {
      return this.settingsRef(user.uid).set(
        Object.assign({}, clean(data), {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }),
        { merge: true }
      );
    },

    loadWorkspace: async function (user) {
      var orgSnap = await this.organizationRef(user.uid).get();
      var settingsSnap = await this.settingsRef(user.uid).get();
      var employeesSnap = await this.employeesRef(user.uid).orderBy("createdAt", "desc").get();
      var payrollsSnap = await this.payrollsRef(user.uid).orderBy("createdAt", "desc").get();
      var updatesSnap = await this.statutoryUpdatesRef(user.uid).orderBy("recordedAt", "desc").get();

      return {
        organization: orgSnap.exists ? orgSnap.data() : {},
        settings: settingsSnap.exists ? settingsSnap.data() : {},
        employees: employeesSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }),
        payrolls: payrollsSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }),
        statutoryUpdates: updatesSnap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); })
      };
    },

    addEmployee: function (user, employee) {
      return this.employeesRef(user.uid).add(Object.assign({}, clean(employee), {
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    },

    updateEmployee: function (user, id, employee) {
      return this.employeesRef(user.uid).doc(id).set(
        Object.assign({}, clean(employee), { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }),
        { merge: true }
      );
    },

    deleteEmployee: function (user, id) {
      return this.employeesRef(user.uid).doc(id).delete();
    },

    addPayroll: function (user, payroll) {
      return this.payrollsRef(user.uid).add(Object.assign({}, clean(payroll), {
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    },

    addStatutoryUpdate: function (user, update) {
      return this.statutoryUpdatesRef(user.uid).add(Object.assign({}, clean(update), {
        recordedAt: firebase.firestore.FieldValue.serverTimestamp()
      }));
    }
  };
})();