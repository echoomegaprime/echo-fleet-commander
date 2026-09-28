# rnd-26 — Increase TimeoutStartSec for `gs343-digest.service`

ECHO R&D Division proposal **#26** (risk class A). Ships through PR + CertForge
only — this document does **not** authorize live `systemctl` changes from the
builder sandbox.

## Problem

`gs343-digest.service` failed with `result=timeout` / exit 15 (SIGTERM). The
oneshot daily autoheal digest (generate rollup + Telegram delivery) can exceed
systemd's default `TimeoutStartSec` (~90s) under load. Journal shows repeated
`start operation timed out. Terminating.` messages.

## Change

Versioned unit + drop-in set:

```ini
TimeoutStartSec=120
TimeoutStopSec=30
```

Files:

- `systemd/gs343-digest.service`
- `systemd/gs343-digest.service.d/10-timeout.conf`
- `systemd/gs343-digest.timer` (unchanged schedule; tracked for completeness)

Policy helpers + tests live under `python/echo_gs343_digest/` and
`tests/python/test_gs343_digest_timeout.py`.

## Apply (ops — after merge / certification)

```bash
sudo install -d /etc/systemd/system/gs343-digest.service.d
sudo cp systemd/gs343-digest.service /etc/systemd/system/
sudo cp systemd/gs343-digest.service.d/10-timeout.conf \
  /etc/systemd/system/gs343-digest.service.d/
sudo systemctl daemon-reload
systemctl show gs343-digest.service -p TimeoutStartUSec -p TimeoutStopUSec
```

Do **not** restart production from this PR workflow; the oneshot timer will pick
up the new budget on the next start after `daemon-reload`.

## Rollback

1. Revert `/etc/systemd/system/gs343-digest.service` (remove `TimeoutStartSec` /
   `TimeoutStopSec` or restore previous values) and remove
   `/etc/systemd/system/gs343-digest.service.d/10-timeout.conf` (or restore the
   previous drop-in).
2. `sudo systemctl daemon-reload`
3. `sudo systemctl restart gs343-digest.service` to verify previous behavior
   (optional; next timer tick also applies).

## Success metric

`unit_active({"unit": "gs343-digest.service"})` → 1
(higher_is_better, tolerance 1.0%).

## Verification

```bash
python3 -B scripts/rnd_26_journey.py
python3 -B scripts/certforge_testkit.py tests/python/test_gs343_digest_timeout.py --sys-path python
```
