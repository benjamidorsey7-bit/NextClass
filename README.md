# NextClass AI Launch Starter

A responsive K-12 teacher-resource web app with AI generation, Supabase authentication, and per-user saved resources.

## PDF upload support

The Differentiation Tool accepts text-based PDF worksheets and lesson plans. Gradebook Insight accepts text-based PDF gradebooks and assessment reports. Choose a PDF and click **Extract PDF text**; the browser extracts selectable text and places it in the editable text box. Review the extracted content and click the normal AI generation button when ready.

- PDF files are read in the browser; the original PDF file is not uploaded to the NextClass server or stored by this app.
- Extracted text is sent to the NextClass server and OpenAI only when the teacher clicks the AI generation button.
- Limit: 15 MB per PDF, up to 35 pages, and up to 35,000 extracted characters.
- Image-only/scanned PDFs do not contain selectable text and require OCR before upload.
- PDF tables can lose column alignment. Teachers must check extracted gradebook rows, headers, and scales before analysis.
- Do not upload student names, IDs, IEP/504 details, or other identifiable/sensitive student information. Use anonymized data and follow school/district policy.

PDF text extraction loads Mozilla PDF.js from cdnjs, so the browser needs internet access.

## Requirements

- Node.js 20 or newer
- Supabase project
- OpenAI API account with API billing enabled
- Hosting that supports a Node.js web service (for example, Render)

## Run locally

1. Extract this folder.
2. Copy `.env.example` to `.env` and fill in server-side settings.
3. In Supabase SQL Editor, run `supabase-schema.sql`.
4. In `public/config.js`, set the Supabase project URL and browser-safe publishable/anon key.
5. Run `npm install` and then `npm start`.
6. Open `http://localhost:3000`.

Never commit `.env`, paste API keys into chat, or place the OpenAI API key in `public/config.js` or other browser code.

## Environment variables

- `OPENAI_API_KEY` — secret; server only
- `OPENAI_MODEL` — model ID available to your API project (default in server code: `gpt-5`)
- `SUPABASE_URL` — project URL
- `SUPABASE_ANON_KEY` — browser-safe publishable/anon key used by the server to verify user sessions
- `PORT` — optional; hosting platforms generally provide this

## Deploy overview

1. Publish the code to a private GitHub repository. Ensure `.env` is excluded.
2. Create a Render Web Service from that repository.
3. Set build command to `npm install` and start command to `npm start`.
4. Add the environment variables above in the hosting dashboard.
5. Deploy, then open `/api/health` on the live domain to verify configuration status.
6. In Supabase Authentication URL Configuration, set the Site URL to the deployed domain and add the exact domain to allowed redirect URLs.
7. Test account creation, email confirmation, sign-in/out, AI generation, save/delete, and isolation between two test accounts before inviting teachers.

## Before production

This starter needs a production security/privacy review, a tested password-reset flow, monitoring and rate/usage limits, and review against applicable school/district policies. Do not use identifiable student records. Review current vendor terms and data-handling requirements before processing education records.


## Connected wizard-themed homepage update

The home screen now matches the NextClass wizard-classroom design and uses the supplied hero and book artwork in `public/assets/`. The five tool cards and main navigation are wired to the existing in-app tool views using the app's `data-go` / `data-view` navigation. Saved Resources opens the existing saved-work flow; Profile opens the existing sign-in/account flow; Sign Out uses the existing sign-out control when signed in. Settings is currently an informational placeholder because a dedicated preferences page is not implemented yet. Privacy, Terms, and Contact are placeholders and should be filled before a public launch.
