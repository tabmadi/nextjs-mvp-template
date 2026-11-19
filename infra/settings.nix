# The values of this host, per ADR-0201. Change each one before the first install.
{
  hostName = "app-host";
  # The disk that the install erases, by its stable name in /dev/disk/by-id.
  disk = "/dev/disk/by-id/REPLACE-WITH-THE-DISK-ID";
  # The address that the deploy and the install connect to.
  address = "203.0.113.10";
  # The site address that Caddy serves. A public name gets a certificate from Let's Encrypt.
  site = "app.example.com";
  # The SSH public keys that log in as root.
  adminKeys = [ "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIReplaceWithTheKeyOfTheOwner owner" ];
}
