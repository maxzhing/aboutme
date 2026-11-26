# Problem reports → email (Google Apps Script)

"Report a problem" (Help page, Settings, and "Report an error" on questions) sends each report to a small Google
Apps Script web app on the **stellifyprep@gmail.com** account, which emails it to that inbox. Free; no other company.
Until it is set up, the Send button opens the student's own email app with the report written in.

## Setup (once, about 5 minutes)

1. Sign in to Google as **stellifyprep@gmail.com**, then open https://script.google.com and click **New project**.
2. Delete what's in the editor, paste all of `Code.gs` (this folder), click the project name ("Untitled project")
   and call it `Stellify reports`, then **Save** (the disk icon).
3. **Deploy** (top right) → **New deployment** → the gear next to "Select type" → **Web app**.
   - Description: `Stellify reports`
   - Execute as: **Me (stellifyprep@gmail.com)**
   - Who has access: **Anyone**
4. Click **Deploy** → **Authorize access** → choose stellifyprep@gmail.com. Google warns "Google hasn't verified this
   app" because you wrote it yourself: click **Advanced** → **Go to Stellify reports (unsafe)** → **Allow**.
5. Copy the **Web app URL** (it looks like `https://script.google.com/macros/s/AKfy…/exec`).
6. Put it in `src/lib/feedback.ts` as `REPORT_URL` (or send it to whoever maintains the site), rebuild, deploy.

To check it: open the URL in a browser; it says "Stellify reports are on."

If you change `Code.gs` later: Deploy → **Manage deployments** → pencil → Version: **New version** → Deploy (the URL
stays the same).
