# Deployment Guide: JerryRigEverything iPhone Duo Bend Test Arcade Game

Production Target: `https://www.frankonedigital.com/bend-test`  
Architecture: Pure Static Web Application (Zero-Build, Pure HTML5 / CSS3 / Vanilla ES6 JavaScript)  
Dependencies: None (Zero external npm packages, zero compilers, zero CDN script dependencies)

---

## 1. Overview & Architecture

The **JerryRigEverything iPhone Duo Bend Test Arcade Game** is packaged as a 100% self-contained static web application. It requires **no build step, no npm bundling, and no backend server runtime**. 

All asset paths, script imports, and stylesheet links use strictly relative `./` paths. As a result, the application can be served identically from:
- The root domain: `https://www.frankonedigital.com/`
- Any subfolder: `https://www.frankonedigital.com/bend-test` or `https://www.frankonedigital.com/bend-test/`
- Local file systems or staging previews without reverse-proxy rewrites.

---

## 2. Directory & File Inventory

Deploy the following directory contents directly into the `/bend-test` directory on `frankonedigital.com`:

```text
/bend-test/
├── index.html          # Main HTML5 shell with OpenGraph/Twitter Card tags & canvas host
├── styles.css          # Arcade UI styling, CRT scanline overlay, and responsive layout
├── DEPLOY.md           # Production deployment & operations documentation
├── verify_game.js      # Headless E2E verification test harness
├── js/
│   ├── engine.js       # Core game state machine, differential physics, and tiers
│   ├── canvas.js       # 2D/2.5D cutting-mat workbench & folding phone renderer
│   ├── audio.js        # 100% procedural Web Audio API synthesizer
│   ├── ui.js           # Zack Nelson commentary, report card modal, and viral X share
│   └── main.js         # Master bootstrap, 60 FPS game loop, and input coordinator
└── .agents/            # Agent development metadata (optional for production deploy)
```

> **Note**: To minimize production file size, only `index.html`, `styles.css`, and the `js/` directory are required for live gameplay. `DEPLOY.md` and `verify_game.js` can be deployed alongside or archived.

---

## 3. Drop-in Deployment Instructions

### Option A: Direct Web Server Drop-in (cPanel / SFTP / SSH)

1. Connect to your web hosting server for `frankonedigital.com` via SFTP or SSH:
   ```bash
   # Example via rsync over SSH
   rsync -avz --exclude '.git' --exclude '.agents' ./ user@frankonedigital.com:/var/www/frankonedigital.com/public_html/bend-test/
   ```
2. Ensure the destination directory `/bend-test/` contains `index.html` at its root:
   ```bash
   ls -la /var/www/frankonedigital.com/public_html/bend-test/
   # Should list index.html, styles.css, js/
   ```
3. Set standard web file permissions:
   ```bash
   find /var/www/frankonedigital.com/public_html/bend-test/ -type f -exec chmod 644 {} +
   find /var/www/frankonedigital.com/public_html/bend-test/ -type d -exec chmod 755 {} +
   ```
4. Navigate to `https://www.frankonedigital.com/bend-test/` in any browser to verify immediate playability.

---

### Option B: Nginx Web Server Configuration

If serving through Nginx, add the following location block to your server definition:

```nginx
server {
    server_name www.frankonedigital.com frankonedigital.com;
    root /var/www/frankonedigital.com/public_html;

    # JerryRigEverything iPhone Duo Bend Test static routing
    location /bend-test {
        alias /var/www/frankonedigital.com/public_html/bend-test;
        try_files $uri $uri/ /bend-test/index.html;
        
        # Enable compression for CSS and JS assets
        gzip_static on;
        gzip_types text/plain text/css application/javascript application/json;

        # Cache static CSS and JS for 7 days with revalidation
        location ~* \.(?:css|js)$ {
            expires 7d;
            add_header Cache-Control "public, max-age=604800, must-revalidate";
        }
    }
}
```

---

### Option C: Apache HTTP Server Configuration (.htaccess)

If serving through Apache, an `.htaccess` file inside `/bend-test/` ensures clean URL handling and proper MIME types:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /bend-test/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_mime.c>
    AddType text/css .css
    AddType application/javascript .js
</IfModule>
```

---

## 4. Viral Social Sharing & OpenGraph Verification

The game dynamically populates OpenGraph and Twitter Card metadata for virality on X:
- **Canonical URL**: `https://www.frankonedigital.com/bend-test`
- **Dynamic Origin Detection**: When running live, `window.location.href` automatically resolves the current deployment URL and appends it to 1-click tweet intents. If running offline or in tests, it falls back to `https://www.frankonedigital.com/bend-test`.
- **Pre-populated Tweet**: Clicking "Share on X" automatically builds an intent URL with score, durability grade, repair bill, and hashtags (`#iPhoneDuo`, `#JerryRigEverything`, `#BendTest`).

---

## 5. Automated Verification & Sanity Check

Before and after deployment, run the automated verification suite:

```bash
# Verify all features and mechanics
node verify_game.js

# Run strict mode verification (must pass 137/137 tests with 0 pending and 0 failed)
node verify_game.js --strict
```

Both tests must exit with code 0.
