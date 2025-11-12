const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.verifyCertificate = functions.https.onRequest(async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).send({ ok: false, error: 'Missing id' });
    }
    const snap = await admin.firestore().doc(`certificates/${id}`).get();
    if (!snap.exists) {
      return res.status(404).send({ ok: false, valid: false });
    }
    const data = snap.data();
    return res.status(200).send({ ok: true, valid: true, data });
  } catch (error) {
    return res.status(500).send({ ok: false, error: String(error) });
  }
});
