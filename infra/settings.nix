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
  # The repository of pgBackRest. This default keeps the backups on the database guest, so they do not survive the
  # loss of the host. Before the host holds real data, set an S3 bucket in another location, per ADR-0201:
  # repo1-type = "s3", repo1-path, repo1-s3-bucket, repo1-s3-endpoint, repo1-s3-region, and repo1-cipher-type.
  backup.repository = {
    repo1-type = "posix";
    repo1-path = "/var/lib/pgbackrest";
  };
  # The SMTP server of the alert mail. The receiver and the password are files in infra/secrets/.
  alerts = {
    smarthost = "smtp.example.com:587";
    from = "alerts@example.com";
    username = "alerts@example.com";
    requireTls = true;
  };
}
