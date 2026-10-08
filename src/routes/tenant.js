'use strict';

const express = require('express');
const db = require('../db');
const { requireTenant } = require('../auth');
const { halamanDataDiri, halamanKamarSaya } = require('../views/tenant');

const router = express.Router();

function dataTenant(req) {
  return db
    .prepare(
      `SELECT t.*, r.nomor, r.tipe, r.harga, r.fasilitas,
              CASE WHEN r.id IS NULL THEN NULL
                   WHEN EXISTS (SELECT 1 FROM tenants x WHERE x.room_id = r.id) THEN 'terisi'
                   ELSE 'kosong' END AS status
         FROM tenants t
         LEFT JOIN rooms r ON r.id = t.room_id
        WHERE t.user_id = ?`
    )
    .get(req.user.id);
}

router.get('/penghuni', requireTenant, (req, res) => {
  res.send(halamanDataDiri({ user: req.user, tenant: dataTenant(req) }));
});

router.get('/penghuni/kamar', requireTenant, (req, res) => {
  const tenant = dataTenant(req);
  res.send(
    halamanKamarSaya({
      user: req.user,
      tenant,
      kamar: tenant && tenant.room_id
        ? {
            nomor: tenant.nomor,
            tipe: tenant.tipe,
            harga: tenant.harga,
            fasilitas: tenant.fasilitas,
            status: tenant.status,
          }
        : null,
    })
  );
});

module.exports = router;
