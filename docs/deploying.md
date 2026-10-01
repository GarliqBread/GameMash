# Deploying gamemash.io

Production runs on one Linux server with Docker, defined in `deploy/compose.yml`: Redis, the API and Caddy. Caddy handles HTTPS and serves the app on `play.gamemash.io`, the landing page on `gamemash.io`, and redirects `www.` and any other domains to the landing page. We use an OVHcloud VPS-2 with Ubuntu 24.04.

Every push to `main` that passes CI builds the `api` and `web` images, pushes them to `ghcr.io/garliqbread/gamemash-*` and deploys them: GitHub Actions copies `deploy/compose.yml` to `/opt/gamemash` on the server over SSH, pulls the new images and restarts. The server never builds anything and doesn't need the source code.

## DNS (Namecheap)

In Domain List → Manage → Advanced DNS for `gamemash.io`, delete the default parking records (the `www` CNAME and the URL redirect), then add:

| Type | Host               | Value             |
| ---- | ------------------ | ----------------- |
| A    | `@`                | the server's IPv4 |
| A    | `play`             | the server's IPv4 |
| A    | `www`              | the server's IPv4 |
| AAAA | `@`, `play`, `www` | the server's IPv6 |

For every other domain, add the same A and AAAA records for `@` and `www`, and list them in `REDIRECT_DOMAINS`.

## Server (once)

1. In the OVHcloud panel, install Ubuntu 24.04 with your SSH key, then log in: `ssh ubuntu@<server-ip>`.
2. Update it and allow only SSH, HTTP and HTTPS:
   ```sh
   sudo apt update && sudo apt full-upgrade -y
   sudo ufw allow OpenSSH && sudo ufw allow 80,443/tcp && sudo ufw allow 443/udp && sudo ufw enable
   ```
3. Turn off password and root logins. OVH's `50-cloud-init.conf` turns password logins on and SSH keeps the first value it reads, so the file has to sort before it:
   ```sh
   printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin no\n' | sudo tee /etc/ssh/sshd_config.d/00-hardening.conf
   sudo sshd -t && sudo systemctl reload ssh
   ```
   Check with `sudo sshd -T | grep -E "passwordauth|permitroot"` and log in from a second terminal before closing the first.
4. Install Docker: `curl -fsSL https://get.docker.com | sudo sh`.
5. Create the user GitHub Actions deploys as, and its folder:
   ```sh
   sudo adduser --disabled-password --gecos "" deploy
   sudo usermod -aG docker deploy
   sudo install -d -o deploy -g deploy -m 700 /home/deploy/.ssh /opt/gamemash
   ```
6. On your own machine, create a key pair just for deploys: `ssh-keygen -t ed25519 -f ~/.ssh/gamemash-deploy -N "" -C github-actions`. Put the public key on the server:
   ```sh
   echo "<contents of ~/.ssh/gamemash-deploy.pub>" | sudo tee /home/deploy/.ssh/authorized_keys
   sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys && sudo chmod 600 /home/deploy/.ssh/authorized_keys
   ```
7. Create `/opt/gamemash/.env` from [`deploy/.env.example`](../deploy/.env.example) (`sudo -u deploy nano /opt/gamemash/.env`) and set the domains. `REDIRECT_DOMAINS` is a comma-separated list, for example `www.gamemash.io, gamemash.online, www.gamemash.online`. Each deploy writes `IMAGE_PREFIX` and `IMAGE_TAG` into it, so the server always runs the images CI just published.

Being in the `docker` group gives `deploy` root-level access to the server, so keep its key only in GitHub.

## GitHub (once)

In the repository's Settings → Secrets and variables → Actions, add these secrets:

| Secret               | Value                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `DEPLOY_HOST`        | the server's IP address                                                                                                     |
| `DEPLOY_USER`        | `deploy`                                                                                                                    |
| `DEPLOY_SSH_KEY`     | the contents of `~/.ssh/gamemash-deploy` (the private key)                                                                  |
| `DEPLOY_KNOWN_HOSTS` | the output of `ssh-keyscan -t ed25519 <server-ip>` (check it matches the fingerprint you accepted when you first logged in) |

The variables `PUBLIC_URL` (default `https://play.gamemash.io`) and `LANDING_URL` (default `https://gamemash.io`) are optional. The deploy job runs in the `production` environment; add required reviewers there if you want to approve each deploy.

## Deploying

Push to `main`. Once CI passes, the `images` and `deploy` jobs run and finish by checking that both sites respond. Caddy fetches the HTTPS certificates on the first request, so DNS has to point at the server first.

To roll back, set `IMAGE_TAG` in `/opt/gamemash/.env` to an earlier commit SHA and run `docker compose up -d --no-build` in `/opt/gamemash`. Images from the last 7 days stay on the server; older ones are still on ghcr.io.

Self-hosting without GitHub Actions is covered in the [README](../README.md#self-hosting).
