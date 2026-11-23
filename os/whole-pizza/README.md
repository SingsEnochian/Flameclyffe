# Whole Pizza OS: bootable Kinoite image candidate

This is the machine layer missing from Wayglass Whole Pizza #676. The image is
based on **Fedora Kinoite 45 x86_64**, which provides the real Linux kernel,
drivers, desktop, bootloader and filesystem. Wyrdrune owns the Wayglass
startup programme and higher-level ship runtime. This is not a standalone
WTL-written hardware kernel.

## Build

On PR #676's branch, use **Actions > Whole Pizza OS VM Image > Run workflow**.
The image job is deliberately manual to prevent PR/email floods. It packages
the existing authenticated Wayglass host, compiles WTL, builds a Kinoite-based
bootable container, and calls bootc-image-builder to produce a QCOW2 disk.

The source build excludes credentials, .env files, local private data and
databases. No production/cloud deployment, disk repartitioning or dual-boot
change is made. The image does not include owner login secrets or model
credentials. A supported first-boot user provisioning/login path still needs
verification inside the VM before this is considered user-ready.

On guest start the systemd unit runs the existing Wyrdrune interpreter on
the included boot.wtl and writes a source-bound local boot receipt at
/var/lib/wayglass/receipts/boot-latest.json. Only after a committed result does
the loopback-only host start on port 3000. After a KDE login, the Workbench
opens at http://127.0.0.1:3000/wayglass/?room=programs .

## Proof required before calling it booted

- QCOW2 artifact and its SHA-256 exist; qemu-img recognises the format.
- UEFI virtual machine boots Fedora Kinoite to a usable Plasma login.
- Wayglass host health endpoint responds locally.
- Native WTL produces a committed one-cycle receipt and real checkpoint
  output; no false claim that all eight lanes are assembled.
- Private state and a Return checkpoint survive a *cold* reboot.
- Feather, denied adapter permissions, missing host and failed Verify
  preserve accurate failure receipts.
- Image is never described as deployed until the VM and authorisation
  boundaries are verified.

The build workflow constructs a **candidate**, not evidence of a successful
guest boot. It does not automatically call models, start camera/microphone,
play sound or publish services. Keep a copy of each VM disk before testing.
