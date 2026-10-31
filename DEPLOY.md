# Publishing EVLab CAD on GitHub Pages (free)

EVLab CAD is plain HTML, CSS and JavaScript. There is nothing to build and no server to pay for.
Your published URL will be `https://<your-github-name>.github.io/evlab-cad/`
(for the suggested organisation: `https://engineeringvisuallab.github.io/evlab-cad/`).

## 1. Create the repository
1. Sign in at https://github.com (create a free account if needed).
2. Click **+ → New repository**.
3. Name it exactly `evlab-cad` (lower case). Choose **Public**. Leave "Add a README" **unticked**. Click **Create repository**.

## 2. Upload the files (choose ONE way)

### A. Browser only (simplest)
1. Unzip `evlab-cad-m8.zip` on your computer. Open the unzipped `evlab-cad` folder.
2. On your new repository page click **uploading an existing file**.
3. Select **everything inside** the `evlab-cad` folder (so `index.html` ends up at the top level of the repository, not inside another folder) and drag it into the page. Make sure the `css`, `js`, `tests` and `docs` folders go up too, and the hidden file `.nojekyll` (if your file manager hides it, turn on "show hidden files"; Pages still works without it for this project, but keep it if you can).
4. Scroll down and click **Commit changes**.

### B. GitHub Desktop
1. Install https://desktop.github.com and sign in.
2. **File → Clone repository** → pick `evlab-cad` → choose a folder.
3. Copy the contents of the unzipped folder into the cloned folder.
4. In GitHub Desktop write a summary such as "EVLab CAD 0.8", click **Commit to main**, then **Push origin**.

### C. VS Code
1. Install https://code.visualstudio.com. Open the unzipped folder (**File → Open Folder**).
2. Open the **Source Control** tab → **Initialize Repository** → type a message → **Commit**.
3. **Publish Branch** → choose **Public repository** → `evlab-cad`.

## 3. Turn on GitHub Pages
1. In the repository click **Settings → Pages**.
2. Under **Build and deployment → Source** choose **Deploy from a branch**.
3. Under **Branch** choose `main` and the folder `/ (root)`. Click **Save**.
4. Wait one to two minutes, refresh the Pages settings page, and the green box shows your URL.

## 4. Check it works
1. Open the URL. You should see the dark drawing area. Draw a line (toolbar **Line**, click twice).
2. Press F12 and open **Console**: there should be no red errors.
3. Try **File → Save As**, then refresh and **Open** the file.

## Troubleshooting
| Symptom | Likely cause and fix |
|---|---|
| 404 page | Pages not enabled yet (step 3), or `index.html` is inside a subfolder: it must be at the top level of the repository. |
| Blank page, console says "Failed to load module script … MIME type" | You opened `index.html` by double-clicking (`file://`). Modules need http: use the published URL or run `python3 -m http.server 8000` (or `node serve.mjs`) in the folder and open http://localhost:8000. |
| Console: 404 for `js/…` or `css/…` | Folders were not uploaded, or a file name changed case (GitHub is case sensitive: `app.js` ≠ `App.js`). Re-upload the folder. |
| Page works locally but shows an old version online | Browser cache. Hard refresh (Ctrl+Shift+R) and wait a minute after each push. |
| Save As downloads a copy instead of overwriting | Normal in Firefox and Safari. Chrome and Edge can write straight to the file you pick. |
| "Autosave failed" | Browser storage is full or disabled (private window). Use **Save** regularly. |

## Testing the subdirectory URL before you publish
`node serve.mjs /evlab-cad/` serves the folder exactly as GitHub Pages will (under `/evlab-cad/`) at http://localhost:8000/evlab-cad/ .
`npm test` (or `node tests/run-all.mjs`) includes a test that does this automatically and checks every file the page loads.
