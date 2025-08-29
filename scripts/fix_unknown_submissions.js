// backend/scripts/fix_unknown_submissions.js
// Usage:
//   cd backend
//   node scripts/fix_unknown_submissions.js
//
// This script dynamically imports your backend models/config so relative paths are correct.

import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..'); // backend/

// load .env from backend root if present
dotenv.config({ path: path.join(backendRoot, '.env') });

const MONGO_URI = process.env.MONGO_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/yourdb';
if (!MONGO_URI) {
  console.error('No MONGO_URI found in environment. Set MONGO_URI in backend/.env or environment variables.');
  process.exit(1);
}

console.log('Connecting to MongoDB:', MONGO_URI);

// dynamic imports of your backend modules (works whether your project uses ESM)
const submissionModelPath = path.join(backendRoot, 'src', 'models', 'Submission.js');
const judge0ConfigPath = path.join(backendRoot, 'src', 'config', 'judge0.js');

function fileUrl(p) {
  return url.pathToFileURL(p).href;
}

const mapStatus = (status) => {
  if (!status) return null;
  const id = status.id;
  if (typeof id === 'number') {
    switch (id) {
      case 1: return 'In Queue';
      case 2: return 'Processing';
      case 3: return 'Accepted';
      case 4: return 'Wrong Answer';
      case 5: return 'Time Limit Exceeded';
      case 6: return 'Compilation Error';
      case 7: return 'Runtime Error';
      case 8: return 'Memory Limit Exceeded';
      case 9: return 'Output Limit Exceeded';
      case 10: return 'Internal Error';
      default: break;
    }
  }
  if (status.description && typeof status.description === 'string' && status.description.trim().length > 0) {
    return status.description;
  }
  return null;
};

async function main() {
  try {
    await mongoose.connect(MONGO_URI, { });
    console.log('MongoDB connected');

    // import Submission model and judge0Client using dynamic import and correct paths
    const SubmissionMod = await import(fileUrl(submissionModelPath));
    // default export expected
    const Submission = SubmissionMod.default || SubmissionMod.Submission || SubmissionMod;

    // import judge0 client
    const judge0Mod = await import(fileUrl(judge0ConfigPath));
    // earlier code used: import { judge0Client } from "../config/judge0.js";
    const judge0Client = judge0Mod.judge0Client || judge0Mod.default?.judge0Client || judge0Mod.default || judge0Mod;

    if (!Submission) {
      throw new Error('Failed to import Submission model. Check path: ' + submissionModelPath);
    }
    if (!judge0Client || typeof judge0Client.get !== 'function') {
      throw new Error('Failed to import judge0Client from ' + judge0ConfigPath + '. Ensure it exports { judge0Client } as an axios instance.');
    }

    // find submissions with verdict "Unknown"
    const unknowns = await Submission.find({ verdict: "Unknown", judgeToken: { $exists: true, $ne: null }});
    console.log('Found', unknowns.length, 'submissions with verdict "Unknown"');

    for (const s of unknowns) {
      try {
        console.log('Checking token:', s.judgeToken, 'submission id:', s._id.toString());
        const resp = await judge0Client.get(`/submissions/${s.judgeToken}?base64_encoded=false`);
        const jd = resp.data;
        const mapped = mapStatus(jd?.status) || (jd?.status?.description || null);

        if (mapped) {
          const update = {
            verdict: mapped,
            status: jd,
          };
          if (jd?.time) update.executionTime = Number(jd.time) * 1000;
          await Submission.findByIdAndUpdate(s._id, update);
          console.log('Updated', s._id.toString(), '->', mapped);
        } else {
          console.log('No meaningful verdict yet for', s._id.toString(), '- leaving as-is');
        }
        // small delay to be polite (avoid rate limits)
        await new Promise(r => setTimeout(r, 250));
      } catch (errInner) {
        console.error('Error checking token for submission', s._id.toString(), errInner?.message || errInner);
      }
    }

    console.log('Done. Disconnecting...');
    await mongoose.disconnect();
    console.log('Disconnected. Script finished.');
    process.exit(0);
  } catch (err) {
    console.error('Script failed:', err?.message || err);
    try { await mongoose.disconnect(); } catch(e) {}
    process.exit(1);
  }
}

main();
